// App.jsx  - This is the main React component that orchestrates the entire dashboard interface for the Agentic AI system. It manages state, WebSocket connections, and renders all subcomponents including Sidebar, Header, Timeline, ConsoleAndLogs, and FinalOutput.

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HitlBanner from './components/HitlBanner';
import Timeline from './components/Timeline';
import ConsoleAndLogs from './components/ConsoleAndLogs';
import FinalOutput from './components/FinalOutput';

const INITIAL_STEPS = [
  {
    id: 'planner',
    name: 'Task Planner',
    badge: 'Planner Agent',
    iconClass: 'fa-solid fa-map',
    defaultDesc: 'Decomposes request into stages.',
    desc: 'Decomposes request into stages.',
    status: 'idle',
    retries: 0,
    maxRetries: 3,
  },
  {
    id: 'step_retriever',
    name: 'Information Retrieval',
    badge: 'Retriever Agent',
    iconClass: 'fa-solid fa-cloud-arrow-down retriever',
    defaultDesc: 'Awaiting decomposition...',
    desc: 'Awaiting decomposition...',
    status: 'pending',
    retries: 0,
    maxRetries: 3,
  },
  {
    id: 'step_analyzer',
    name: 'Analytical Structuring',
    badge: 'Analyzer Agent',
    iconClass: 'fa-solid fa-brain analyzer',
    defaultDesc: 'Awaiting decomposition...',
    desc: 'Awaiting decomposition...',
    status: 'pending',
    retries: 0,
    maxRetries: 3,
  },
  {
    id: 'step_writer',
    name: 'Creative Synthesis',
    badge: 'Writer Agent',
    iconClass: 'fa-solid fa-pen-nib writer',
    defaultDesc: 'Awaiting decomposition...',
    desc: 'Awaiting decomposition...',
    status: 'pending',
    retries: 0,
    maxRetries: 3,
  },
];

export default function App() {

  // Main Input and Control States
  const [taskPrompt, setTaskPrompt] = useState(
    'Research the history of quantum computing, compile a summary of key milestones, and write a blog post targeted at high school students.'
  );
  const [failures, setFailures] = useState({
    retriever_fail: false,
    analyzer_fail: false,
    writer_fail: false,
  });

  // WebSocket Connection State
  const [wsConnected, setWsConnected] = useState(false);

  // Execution Metrics and Statuses
  const [pipelineStatusText, setPipelineStatusText] = useState('Status: Idle');
  const [pipelineStatusClass, setPipelineStatusClass] = useState('idle');
  const [elapsedTime, setElapsedTime] = useState('0.0s');
  const [errorCount, setErrorCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Human-in-the-Loop Interruption State
  const [hitlRequest, setHitlRequest] = useState(null);
  const [bypassContent, setBypassContent] = useState('');

  // Console Outputs & System Logs
  const [consoleBlocks, setConsoleBlocks] = useState([]);
  const [logs, setLogs] = useState([
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Pipeline server listening on websocket port.',
    },
  ]);
  const [activeAgentLabel, setActiveAgentLabel] = useState('System: Idle');
  const [activeAgentClass, setActiveAgentClass] = useState('');

  // Timeline Step Cards State
  const [steps, setSteps] = useState(INITIAL_STEPS);

  // Final Generated Markdown Document
  const [finalDocument, setFinalDocument] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for background processes and avoiding stale WebSocket closures
  const wsRef = useRef(null);
  const taskIdRef = useRef(null);
  const pipelineStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Helper mapping names/badges
  const getAgentName = (stepId) => {
    if (stepId === 'step_retriever') return 'Retriever Agent';
    if (stepId === 'step_analyzer') return 'Analyzer Agent';
    if (stepId === 'step_writer') return 'Writer Agent';
    return 'System';
  };

  const getAgentBadgeClass = (stepId) => {
    if (stepId === 'step_retriever') return 'retriever';
    if (stepId === 'step_analyzer') return 'analyzer';
    if (stepId === 'step_writer') return 'writer';
    return '';
  };

  // Log appending helper using functional state update
  const appendSystemLog = (level, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, level, message }]);

    if (level.toLowerCase() === 'error' || message.toLowerCase().includes('failed')) {
      setErrorCount((prev) => prev + 1);
    }
  };

  // Console token streaming helper using functional state update
  const streamTokenToConsole = (stepId, token) => {
    setConsoleBlocks((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].stepId === stepId) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: updated[updated.length - 1].text + token,
        };
        return updated;
      } else {
        return [...prev, { stepId, text: token }];
      }
    });
  };

  // Reset all dashboard UI markers
  const resetDashboard = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setElapsedTime('0.0s');
    setErrorCount(0);
    setHitlRequest(null);
    setBypassContent('');
    setConsoleBlocks([]);
    setFinalDocument('');
    setErrorMessage('');
    setSteps(INITIAL_STEPS);
  };

  // Status updates dispatcher
  const handleStatusUpdate = (stepId, payload) => {
    if (!stepId) {
      if (payload.status === 'decomposing') {
        setPipelineStatusText('Status: Planning Steps');
        setSteps((prev) =>
          prev.map((s) =>
            s.id === 'planner'
              ? { ...s, status: 'active', desc: 'Planning steps...' }
              : s
          )
        );
        setActiveAgentLabel('Planner Agent');
        setActiveAgentClass('planner');
      } else if (payload.status === 'running') {
        setPipelineStatusText('Status: Running Queue');
        setSteps((prev) =>
          prev.map((s) =>
            s.id === 'planner'
              ? { ...s, status: 'success', desc: 'Decomposition complete.' }
              : s
          )
        );
      }

      if (payload.steps && payload.steps.length > 0) {
        setSteps((prev) =>
          prev.map((s) => {
            const matchingPayloadStep = payload.steps.find((ps) => ps.id === s.id);
            if (matchingPayloadStep) {
              return {
                ...s,
                desc: matchingPayloadStep.description,
                maxRetries: matchingPayloadStep.max_retries || 3,
                retries: 0,
              };
            }
            return s;
          })
        );
      }
    } else {
      const stepStatus = payload.status;
      const stepDetails = payload.step;

      setSteps((prev) =>
        prev.map((s) => {
          if (s.id === stepId) {
            const retries = stepDetails ? stepDetails.retry_count : (payload.retry_count || 0);
            const maxRetries = stepDetails ? stepDetails.max_retries : (payload.max_retries || 3);
            return {
              ...s,
              status: stepStatus,
              retries: retries,
              maxRetries: maxRetries,
            };
          }
          return s;
        })
      );

      if (stepStatus === 'running') {
        setActiveAgentLabel(getAgentName(stepId));
        setActiveAgentClass(getAgentBadgeClass(stepId));
      }
    }
  };

  // HITL pause handler
  const handleHitlRequest = (stepId, payload) => {
    setPipelineStatusText('Status: Paused (HITL)');
    setPipelineStatusClass('paused');

    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'paused' } : s))
    );

    setHitlRequest({ stepId, message: payload.message });
    appendSystemLog('warning', `Human Intervention requested on step: ${stepId}`);
  };

  // Complete pipeline handler
  const handlePipelineComplete = (payload) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRunning(false);

    if (payload.status === 'success') {
      setPipelineStatusText('Status: Complete');
      setPipelineStatusClass('success');
      setFinalDocument(payload.final_document);
      appendSystemLog(
        'info',
        `Pipeline run succeeded in ${payload.total_time.toFixed(2)}s!`
      );
    } else {
      setPipelineStatusText('Status: Failed');
      setPipelineStatusClass('failed');
      setErrorMessage(payload.error_message);
      appendSystemLog('error', `Pipeline aborted: ${payload.error_message}`);
    }
  };

  // Combined incoming WebSocket message router
  const handleWsMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { type, task_id, step_id, payload } = data;

      if (task_id !== taskIdRef.current && task_id !== 'system') return;

      switch (type) {
        case 'status_update':
          handleStatusUpdate(step_id, payload);
          break;
        case 'log':
          appendSystemLog(payload.level, payload.message);
          break;
        case 'token':
          streamTokenToConsole(step_id, payload.token);
          break;
        case 'input_request':
          handleHitlRequest(step_id, payload);
          break;
        case 'pipeline_complete':
          handlePipelineComplete(payload);
          break;
        default:
          break;
      }
    } catch (ex) {
      console.error('Error parsing websocket JSON message: ', ex);
    }
  };

  // Ultimate pattern to avoid stale closures in WebSocket event listeners
  const onMessageRef = useRef();
  onMessageRef.current = handleWsMessage;

  // Initialize and handle WebSocket lifecycle
  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDevServer = ['5173', '5174', '5175', '5176'].includes(window.location.port);
    const wsUrl = isDevServer
      ? `${protocol}//127.0.0.1:8000/ws`
      : `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
      appendSystemLog('info', 'Connected to agent backend WebSocket server.');
    };

    socket.onclose = () => {
      setWsConnected(false);
      appendSystemLog(
        'error',
        'WebSocket connection closed. Retrying in 3 seconds...'
      );
      setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = () => {
      appendSystemLog('error', 'WebSocket handshake failed.');
    };

    socket.onmessage = (event) => {
      if (onMessageRef.current) {
        onMessageRef.current(event);
      }
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Launch pipeline execution
  const startPipeline = () => {
    if (!taskPrompt.trim()) {
      alert('Please enter a task description first.');
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('WebSocket is not connected. Please wait for connection.');
      return;
    }

    const newTaskId = 'task_' + Date.now();
    taskIdRef.current = newTaskId;

    resetDashboard();
    setIsRunning(true);

    const msg = {
      type: 'start_pipeline',
      task_id: newTaskId,
      payload: {
        prompt: taskPrompt.trim(),
        failures: {
          retriever_fail: failures.retriever_fail,
          analyzer_fail: failures.analyzer_fail,
          writer_fail: failures.writer_fail,
        },
      },
    };

    wsRef.current.send(JSON.stringify(msg));
    appendSystemLog('info', `Sent pipeline launch request. ID: ${newTaskId}`);

    pipelineStartTimeRef.current = Date.now();
    setPipelineStatusText('Status: Planning');
    setPipelineStatusClass('running');

    timerIntervalRef.current = setInterval(() => {
      const elapsed = ((Date.now() - pipelineStartTimeRef.current) / 1000).toFixed(1);
      setElapsedTime(`${elapsed}s`);
    }, 100);
  };

  // Submit Human intervention feedback
  const submitHitl = (action) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('WebSocket connection is not open.');
      return;
    }

    const msg = {
      type: 'input_response',
      task_id: taskIdRef.current,
      payload: {
        action,
        content: bypassContent.trim(),
      },
    };

    wsRef.current.send(JSON.stringify(msg));
    setHitlRequest(null);
    setBypassContent('');
    appendSystemLog('info', `Submitted intervention response: '${action}'`);

    setPipelineStatusText('Status: Resuming');
    setPipelineStatusClass('running');
  };

  // Clear system Activity Logs panel
  const clearLogs = () => {
    setLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'System activity logs cleared.',
      },
    ]);
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Section */}
      <Sidebar
        taskPrompt={taskPrompt}
        setTaskPrompt={setTaskPrompt}
        failures={failures}
        setFailures={setFailures}
        onLaunch={startPipeline}
        isRunning={isRunning}
      />

      {/* Main View Dashboard */}
      <main className="dashboard-main">
        {/* Statistics Header */}
        <Header
          wsConnected={wsConnected}
          pipelineStatusText={pipelineStatusText}
          pipelineStatusClass={pipelineStatusClass}
          elapsedTime={elapsedTime}
          errorCount={errorCount}
        />

        {/* Human-in-the-loop Interventions Panel */}
        <HitlBanner
          hitlRequest={hitlRequest}
          bypassContent={bypassContent}
          setBypassContent={setBypassContent}
          onSubmit={submitHitl}
        />

        {/* Timeline Pipeline Visualizer */}
        <Timeline steps={steps} />

        {/* Terminals Grid */}
        <ConsoleAndLogs
          consoleBlocks={consoleBlocks}
          activeAgentLabel={activeAgentLabel}
          activeAgentClass={activeAgentClass}
          logs={logs}
          onClearLogs={clearLogs}
        />

        {/* Synthesized Output Panel */}
        <FinalOutput
          finalDocument={finalDocument}
          pipelineStatus={pipelineStatusClass}
          errorMessage={errorMessage}
        />
      </main>
    </div>
  );
}
