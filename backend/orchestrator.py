# orchestrator.py - Manages multi-agent pipeline orchestration: task
# decomposition -> sequential step execution with data handoff between steps -> retry-with-backoff failure handling > human-in-the-loop (HITL) recovery when retries are exhausted.

import asyncio
import time
from typing import Dict, Any, Callable, Coroutine, List, Optional
from backend.models import Step, StepStatus, AgentType, PipelineState, WsMessage, WsMessageType
from backend.agents import RetrieverAgent, AnalyzerAgent, WriterAgent, BaseAgent
from backend.utils import system_log, retry_with_backoff


class AgentOrchestrator:


    def __init__(
        self,
        ws_send_callback: Callable[[WsMessage], Coroutine[Any, Any, None]]
    ):
        self.ws_send = ws_send_callback

        # Instantiate agents once  - reused across all pipeline runs
        self.planner = BaseAgent(AgentType.PLANNER)
        self.retriever = RetrieverAgent()
        self.analyzer = AnalyzerAgent()
        self.writer = WriterAgent()

        # Track active pipelines by task_id
        self.active_pipelines: Dict[str, PipelineState] = {}

        # Human-in-the-loop (HITL) sync structures -  task_id -> (asyncio.Event, response_dict)
        self.hitl_events: Dict[str, tuple] = {}


    async def register_input_response(self, task_id: str, action: str, content: Optional[str] = None):
        """Called when a WebSocket client sends human input to resume a paused pipeline."""
        if task_id in self.hitl_events:
            event, response_dict = self.hitl_events[task_id]
            response_dict["action"] = action
            response_dict["content"] = content
            event.set()
            await system_log("INFO", f"[HITL] User responded to task {task_id} with action: {action}")


    async def decompose_task(self, task_id: str, prompt: str) -> List[Step]:
        """
        Decomposes a complex prompt into three ordered, dependent steps:
        Retriever -> Analyzer -> Writer. The Planner agent narrates the plan (streamed to the UI), while the actual Step objects are built deterministically from the prompt so execution is reliable even if the planner's narration varies.
        """
        await system_log("INFO", f"Decomposing task: '{prompt[:60]}...'")

        system_instruction = (
            "You are a Task Decomposer. Break the complex user request down into exactly three steps: "
            "1. Retriever: Gather list items, URLs, or search terms to compile raw details. "
            "2. Analyzer: Categorize, filter, and structure the retrieved findings. "
            "3. Writer: Take the structured findings and write the final document tailored to the target audience. "
            "Respond ONLY with a bulleted list of the three steps."
        )

        async def broadcast_planner_token(tok: str):
            await self.ws_send(WsMessage(
                type=WsMessageType.TOKEN,
                task_id=task_id,
                step_id="planner",
                payload={"token": tok}
            ))

        # Stream the planners narration of the plan to the UI (does not gate step construction below - note above).
        await self.planner.call_llm_stream(prompt, system_instruction, broadcast_planner_token)

        # Build the actual executable steps from the prompt
        queries = [
            f"Core research about: {prompt[:30]}",
            f"Historical timeline and facts of {prompt[:30]}",
            f"Standard specifications or arguments on {prompt[:30]}"
        ]
        batch_size = 2
        desc_ret = f"Retrieve facts about: {prompt[:30]}"
        desc_ana = f"Analyze the retrieved information for: {prompt[:30]}"
        desc_wri = f"Synthesize final formatted document for: {prompt[:30]}"

        steps = [
            Step(
                id="step_retriever",
                name="Information Retrieval",
                agent_type=AgentType.RETRIEVER,
                description=desc_ret,
                input_data={"queries": queries},
                batch_size=batch_size,
                max_retries=3
            ),
            Step(
                id="step_analyzer",
                name="Analytical Structuring",
                agent_type=AgentType.ANALYZER,
                description=desc_ana,
                input_data={},  # populated from Retriever output before execution
                batch_size=batch_size,
                max_retries=3
            ),
            Step(
                id="step_writer",
                name="Creative Synthesis",
                agent_type=AgentType.WRITER,
                description=desc_wri,
                input_data={},  # populated from Analyzer output before execution
                max_retries=3
            )
        ]
        return steps
    

    async def execute_pipeline(
        self,
        task_id: str,
        prompt: str,
        failures_config: Dict[str, bool]
    ):
        """Runs the entire multi-agent pipeline for a single task end to end."""
        start_time = time.time()
        pipeline = PipelineState(
            task_id=task_id,
            original_prompt=prompt,
            start_time=start_time,
            status=StepStatus.RUNNING
        )
        self.active_pipelines[task_id] = pipeline

        await self.ws_send(WsMessage(
            type=WsMessageType.STATUS_UPDATE,
            task_id=task_id,
            payload={"status": "decomposing", "steps": []}
        ))

        try:
            # 1. Decomposition (Planner agent)
            steps = await self.decompose_task(task_id, prompt)
            pipeline.steps = steps

            await self.ws_send(WsMessage(
                type=WsMessageType.STATUS_UPDATE,
                task_id=task_id,
                payload={"status": "running", "steps": [s.model_dump() for s in steps]}
            ))

            # 2. Sequential step execution with data handoff between steps
            for idx, step in enumerate(steps):
                pipeline.current_step_index = idx
                step.status = StepStatus.RUNNING

                await self.ws_send(WsMessage(
                    type=WsMessageType.STATUS_UPDATE,
                    task_id=task_id,
                    step_id=step.id,
                    payload={"status": StepStatus.RUNNING, "step": step.model_dump()}
                ))

                # Route outputs from previous steps into this step's input (pipeline data flow)
                if step.agent_type == AgentType.ANALYZER:
                    retriever_out = steps[0].output_data or {}
                    step.input_data["findings"] = retriever_out.get("documents_gathered", [])
                    step.input_data["summary"] = retriever_out.get("synthesized_summary", "")
                elif step.agent_type == AgentType.WRITER:
                    analyzer_out = steps[1].output_data or {}
                    step.input_data["structured_summary"] = analyzer_out.get("structured_summary", "")
                    step.input_data["goal"] = prompt

                # Execute step with retry + backoff; fall back to HITL if retries are exhausted
                step_success = False
                while not step_success:
                    try:
                        async def run_agent():
                            async def on_token(token: str):
                                await self.ws_send(WsMessage(
                                    type=WsMessageType.TOKEN,
                                    task_id=task_id,
                                    step_id=step.id,
                                    payload={"token": token}
                                ))


                            step_start_time = time.time()
                            if step.agent_type == AgentType.RETRIEVER:
                                out = await self.retriever.execute(step, on_token, failures_config)
                            elif step.agent_type == AgentType.ANALYZER:
                                out = await self.analyzer.execute(step, on_token, failures_config)
                            elif step.agent_type == AgentType.WRITER:
                                out = await self.writer.execute(step, on_token, failures_config)
                            else:
                                raise ValueError(f"Unknown agent type: {step.agent_type}")


                            step.elapsed_time = time.time() - step_start_time
                            return out


                        async def on_retry(attempt: int, exc: Exception, delay: float):
                            step.retry_count = attempt
                            step.status = StepStatus.RETRYING
                            pipeline.error_count += 1
                            await self.ws_send(WsMessage(
                                type=WsMessageType.STATUS_UPDATE,
                                task_id=task_id,
                                step_id=step.id,
                                payload={
                                    "status": StepStatus.RETRYING,
                                    "retry_count": attempt,
                                    "error_message": str(exc),
                                    "step": step.model_dump()
                                }
                            ))

                        output = await retry_with_backoff(
                            coro_func=run_agent,
                            max_retries=step.max_retries,
                            initial_delay=1.5,
                            backoff_factor=1.5,
                            on_retry_cb=on_retry
                        )

                        step.output_data = output
                        step.status = StepStatus.SUCCESS
                        step_success = True

                        await self.ws_send(WsMessage(
                            type=WsMessageType.STATUS_UPDATE,
                            task_id=task_id,
                            step_id=step.id,
                            payload={"status": StepStatus.SUCCESS, "step": step.model_dump()}
                        ))


                    except Exception as e:
                        # Retries exhausted -> pause pipeline and request human input
                        await system_log("ERROR", f"[{step.name}] Retries exhausted. Entering human-in-the-loop pause mode.")
                        step.status = StepStatus.PAUSED
                        step.error_message = str(e)

                        await self.ws_send(WsMessage(
                            type=WsMessageType.INPUT_REQUEST,
                            task_id=task_id,
                            step_id=step.id,
                            payload={
                                "message": f"Agent '{step.name}' failed after {step.max_retries} attempts. Error: {str(e)}",
                                "step": step.model_dump()
                            }
                        ))

                        event = asyncio.Event()
                        response_dict: Dict[str, Any] = {}
                        self.hitl_events[task_id] = (event, response_dict)

                        # Block this stepss loop (not the whole server) until the user responds
                        await event.wait()
                        del self.hitl_events[task_id]

                        action = response_dict.get("action")
                        user_content = response_dict.get("content")

                        if action == "bypass":
                            await system_log("INFO", f"[{step.name}] User bypassed failure. Injecting user-supplied content.")
                            if step.agent_type == AgentType.RETRIEVER:
                                step.output_data = {
                                    "documents_gathered": [user_content or "Bypassed retrieval content"],
                                    "synthesized_summary": user_content or "Manual search content supplied by user."
                                }
                            elif step.agent_type == AgentType.ANALYZER:
                                step.output_data = {
                                    "batch_analyses": ["User bypassed analysis"],
                                    "structured_summary": user_content or "Manual structural analysis supplied by user."
                                }
                            elif step.agent_type == AgentType.WRITER:
                                step.output_data = {
                                    "final_document": user_content or "Manual document final draft supplied by user."
                                }

                            step.status = StepStatus.SUCCESS
                            step_success = True
                            await self.ws_send(WsMessage(
                                type=WsMessageType.STATUS_UPDATE,
                                task_id=task_id,
                                step_id=step.id,
                                payload={"status": StepStatus.SUCCESS, "step": step.model_dump()}
                            ))

                        elif action == "retry":
                            await system_log("INFO", f"[{step.name}] User requested manual retry. Resetting retry count.")
                            step.retry_count = 0
                            step.status = StepStatus.RUNNING
                            await self.ws_send(WsMessage(
                                type=WsMessageType.STATUS_UPDATE,
                                task_id=task_id,
                                step_id=step.id,
                                payload={"status": StepStatus.RUNNING, "step": step.model_dump()}
                            ))
                            # step_success stays False -> outer while loop retries this step

                        else:
                            await system_log("ERROR", f"[{step.name}] Pipeline aborted by user.")
                            step.status = StepStatus.FAILED
                            pipeline.status = StepStatus.FAILED
                            raise RuntimeError(f"Pipeline run aborted by user at step '{step.name}'.")

            # All steps finished successfully
            pipeline.status = StepStatus.SUCCESS
            pipeline.end_time = time.time()

            final_report = steps[-1].output_data.get("final_document", "No content generated.")
            await self.ws_send(WsMessage(
                type=WsMessageType.PIPELINE_COMPLETE,
                task_id=task_id,
                payload={
                    "status": StepStatus.SUCCESS,
                    "final_document": final_report,
                    "total_time": pipeline.end_time - pipeline.start_time,
                    "error_count": pipeline.error_count
                }
            ))

            await system_log("INFO", f"Pipeline executed successfully in {pipeline.end_time - pipeline.start_time:.2f}s!")

        except Exception as overall_exc:
            pipeline.status = StepStatus.FAILED
            pipeline.end_time = time.time()
            await self.ws_send(WsMessage(
                type=WsMessageType.PIPELINE_COMPLETE,
                task_id=task_id,
                payload={
                    "status": StepStatus.FAILED,
                    "error_message": str(overall_exc),
                    "total_time": pipeline.end_time - pipeline.start_time,
                    "error_count": pipeline.error_count
                }
            ))
            await system_log("ERROR", f"Pipeline failed: {overall_exc}")