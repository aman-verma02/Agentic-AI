# main.py - FastAPI entry point. Handles WebSocket connections and dispatches
# pipeline execution requests to the orchestrator.

import asyncio
import json
import os
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from backend.models import WsMessage, WsMessageType
from backend.orchestrator import AgentOrchestrator
from backend.utils import set_ws_log_callback, system_log

app = FastAPI(title="Agentic AI Orchestration System")

# Active websocket connections
active_connections: list[WebSocket] = []


async def send_to_ws(message: WsMessage):
    """Broadcasts a message to all connected websocket clients."""
    msg_json = message.model_dump_json()

    dead_connections = []
    for ws in active_connections:
        try:
            await ws.send_text(msg_json)
        except Exception:
            dead_connections.append(ws)

    for dc in dead_connections:
        if dc in active_connections:
            active_connections.remove(dc)


orchestrator = AgentOrchestrator(ws_send_callback=send_to_ws)


async def websocket_log_handler(level: str, message: str):
    """Bridges system_log() calls to the websocket stream as LOG messages."""
    ws_msg = WsMessage(
        type=WsMessageType.LOG,
        task_id="system",
        payload={"level": level, "message": message}
    )
    await send_to_ws(ws_msg)


set_ws_log_callback(websocket_log_handler)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    await system_log("INFO", f"WebSocket client connected. Active connections: {len(active_connections)}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                msg_type = message_data.get("type")
                task_id = message_data.get("task_id", str(uuid.uuid4()))
                payload = message_data.get("payload", {})

                if msg_type == "start_pipeline":
                    prompt = payload.get("prompt", "")
                    failures = payload.get("failures", {})

                    await system_log("INFO", f"Received start request for prompt: '{prompt[:40]}...'")

                    # Run the pipeline in the background so this websocket
                    # loop stays free to receive further messages e.x. HITL responses
                    asyncio.create_task(
                        orchestrator.execute_pipeline(
                            task_id=task_id,
                            prompt=prompt,
                            failures_config=failures
                        )
                    )

                elif msg_type == "input_response":
                    action = payload.get("action")
                    content = payload.get("content")
                    await orchestrator.register_input_response(
                        task_id=task_id,
                        action=action,
                        content=content
                    )

                else:
                    await system_log("WARNING", f"Unknown socket event type: {msg_type}")

            except json.JSONDecodeError:
                await system_log("ERROR", "Malformed JSON message received via WebSocket.")
            except Exception as inner_ex:
                await system_log("ERROR", f"Error processing WebSocket message: {inner_ex}")

    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
        await system_log("INFO", f"WebSocket client disconnected. Remaining connections: {len(active_connections)}")
    except Exception as ex:
        if websocket in active_connections:
            active_connections.remove(websocket)
        await system_log("ERROR", f"WebSocket connection closed due to exception: {ex}")


# Ensure the frontend directory exists, then mount it as static files
os.makedirs("frontend", exist_ok=True)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)