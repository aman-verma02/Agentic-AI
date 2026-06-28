# Agentic AI Orchestration System

A lightweight full-stack demo for orchestrating a multi-agent pipeline with a live dashboard. The app accepts a complex task, decomposes it into execution stages, runs retriever/analyzer/writer agents, streams progress over WebSockets, and shows the final markdown output in the browser.

## ✨ What the app does

- Accepts a complex prompt from the UI.
- Decomposes the task into a structured pipeline.
- Runs specialized agents for retrieval, analysis, and writing.
- Streams progress and token output in real time.
- Supports selective failure injection to test retries and human-in-the-loop behavior.
- Works out of the box in mock mode with no API keys required.

## 🧰 Tech stack

- Backend: FastAPI, Python asyncio, WebSockets, Pydantic
- Frontend: React + Vite
- Styling: custom CSS with a bright, modern interface

## ▶️ Run locally

### 1. Prerequisites

- Python 3.9+
- Node.js 18+
- npm

### 2. Create and activate the Python environment

```bash
cd /Users/amanverma/My PC/Coding/Github/Agentic-AI
python3 -m venv myenv
source myenv/bin/activate
pip install -r requirements.txt
```

### 3. Start the backend

```bash
cd /Users/amanverma/My PC/Coding/Github/Agentic-AI
source myenv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The backend serves the app and exposes the WebSocket endpoint at:

- http://127.0.0.1:8000/
- ws://127.0.0.1:8000/ws

### 4. Start the frontend

In a second terminal:

```bash
cd /Users/amanverma/My PC/Coding/Github/Agentic-AI/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

- http://127.0.0.1:5173/

### 5. Test the app

- Enter a task in the prompt box.
- Click Launch Agent Pipeline.
- Watch the timeline, token stream, logs, and final output update.

## 🧪 Run tests

```bash
cd /Users/amanverma/My PC/Coding/Github/Agentic-AI
source myenv/bin/activate
pytest -q backend/tests/test_agents.py
```

## 📁 Project structure

```text
backend/
  agents.py
  main.py
  models.py
  orchestrator.py
  utils.py
frontend/
  src/
    App.jsx
    components/
    index.css
    main.jsx
  package.json
  vite.config.js
```

## 🔧 Optional: use real LLMs

If you want to use a real provider instead of the built-in mock mode, set environment variables before starting the backend:

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your-key
```

Or with Gemini:

```bash
export LLM_PROVIDER=gemini
export GEMINI_API_KEY=your-key
```

If no provider is configured, the app falls back to the simulator automatically.
