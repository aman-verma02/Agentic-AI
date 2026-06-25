# models.py - Data models for the agentic AI pipeline: task decomposition,
# step definitions, pipeline state, and WebSocket message structures.

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class AgentType(str, Enum):
    PLANNER = "planner"
    RETRIEVER = "retriever"
    ANALYZER = "analyzer"
    WRITER = "writer"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    PAUSED = "paused"  # Awaiting user intervention (HITL)


class Step(BaseModel):
    id: str
    name: str
    agent_type: AgentType
    description: str
    input_data: Dict[str, Any] = Field(default_factory=dict)
    output_data: Optional[Any] = None
    status: StepStatus = StepStatus.PENDING
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    batch_size: Optional[int] = None
    elapsed_time: float = 0.0


class TaskDecomposition(BaseModel):
    goal: str
    steps: List[Step]


class PipelineState(BaseModel):
    task_id: str
    original_prompt: str
    steps: List[Step] = Field(default_factory=list)
    current_step_index: int = 0
    status: StepStatus = StepStatus.PENDING
    start_time: float = 0.0
    end_time: Optional[float] = None
    error_count: int = 0


class WsMessageType(str, Enum):
    STATUS_UPDATE = "status_update"      # Overall pipeline / step status changes
    LOG = "log"                          # System log messages
    TOKEN = "token"                      # Token-by-token streaming of agent output
    ERROR_INJECTED = "error_injected"    # Error simulation report
    INPUT_REQUEST = "input_request"      # Awaiting user input
    INPUT_RESPONSE = "input_response"    # User input response (received by backend)
    PIPELINE_COMPLETE = "pipeline_complete"


class WsMessage(BaseModel):
    type: WsMessageType
    task_id: str
    step_id: Optional[str] = None
    payload: Dict[str, Any]