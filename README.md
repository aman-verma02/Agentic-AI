# Agentic AI Orchestration System

A premium, highly interactive dashboard and asynchronous orchestration engine that accepts complex, multi-part prompts, decomposes them into structured execution steps, routes tasks to specialized agents (Retriever, Analyzer, Writer), and performs manual batching and parallel execution—all with visible real-time token streaming and forced error injection.

## 🚀 Key Features

- **Dynamic Task Decomposition**: Leverages an LLM planner to break complex prompts down into an ordered series of tasks.
- **Specialized Multi-Agent Routing**: Automatically routes tasks to the `Retriever` (information collection), `Analyzer` (processing and structuring), or `Writer` (final synthesis and formatting).
- **Manual Batching & Concurrency**: Groups list-based operations (e.g., retrieving 10 URLs, analyzing 6 datasets) into batch chunks of size `N`, running them concurrently using standard Python `asyncio.gather` with rate-limiting, and aggregating results without relying on opaque framework wrappers.
- **Token-by-Token Streaming**: Watch agents think and generate responses in real-time on a slick dark-themed terminal-like web interface.
- **Robust Error Recovery & Failure Injection**: Interactively test fault-tolerance mechanisms! Use the frontend panel to inject API timeouts, rate limits, or validation errors, and watch agents trigger exponential backoffs, retries, and fallback pipelines.
- **Dual Mode (Zero-Config / Real LLM)**: 
  - **Zero-Config/Mock Mode**: Works out of the box with simulated high-fidelity responses (perfect for evaluating the UI and execution pipeline without setting up API keys).
  - **Production Mode**: Connects to official OpenAI or Gemini APIs simply by specifying keys in a `.env` file.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Python Asyncio, WebSockets, Pydantic, HTTPX.
- **Frontend**: Premium HTML5, CSS3 (Glassmorphic dark-theme, CSS Variables, CSS Grid, Micro-animations), Vanilla JavaScript.
- **Dependencies**: Light, minimal, and fully documented (no heavy/black-box frameworks like LangChain, LangGraph, or CrewAI).

---

## 💻 Quick Start

### 1. Prerequisites
Ensure you have **Python 3.10+** installed on your system.

### 2. Install Dependencies
In the root directory, run:
```bash
pip install -r requirements.txt
```

### 3. Environment Setup (Optional)
If you wish to run with real LLM providers, copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```
Inside `.env`:
```env
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
LLM_PROVIDER=mock  # Set to 'openai' or 'gemini' to use actual LLMs
```
*Note: If no `.env` file is present or `LLM_PROVIDER` is set to `mock`, the system will use the high-fidelity Mock simulator, providing pre-written realistic agent paths for demonstration.*

### 4. Run the Application
Start the FastAPI server:
```bash
python -m backend.main
```
Or with auto-reload:
```bash
uvicorn backend.main:app --reload
```

Open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── __init__.py
│   ├── main.py            # FastAPI WebSocket server & static file serving
│   ├── orchestrator.py    # Main pipeline orchestrator & error handler
│   ├── agents.py          # Specialized agent implementations (Retriever, Analyzer, Writer)
│   ├── utils.py           # Concurrency, exponential backoff, rate limiting & logging
│   └── models.py          # Strict Pydantic types for steps, tasks & communication
├── frontend/
│   ├── index.html         # Premium dark-theme layout
│   ├── style.css          # Glassmorphic dashboard styles
│   └── app.js             # WebSocket handler & execution timeline rendering
├── docs/
│   ├── system_design.md   # Architectural details & data flow diagrams
│   └── post_mortem.md     # Production trade-offs & scaling strategies
├── .env.example           # Example environment variables
├── requirements.txt       # Project python dependencies
└── README.md              # Project documentation
```

---

## 🧪 Running Automated Tests

To verify batching, retries, and orchestrator pipelines:
```bash
pytest
```
*(Make sure to run `pip install pytest` if you want to run the test suite).*
