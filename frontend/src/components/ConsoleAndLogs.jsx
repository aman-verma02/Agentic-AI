// ConsoleAndLogs.jsx - This component displays the streaming console output and system activity logs in a dashboard layout. It auto-scrolls to the latest content when new blocks or logs are added.

import React, { useEffect, useRef } from 'react';

export default function ConsoleAndLogs({
  consoleBlocks,
  activeAgentLabel,
  activeAgentClass,
  logs,
  onClearLogs,
}) {
  const consoleRef = useRef(null);
  const logsRef = useRef(null);

  // Auto-scroll console when blocks change
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleBlocks]);

  // Auto-scroll logs when logs list changes
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="dashboard-columns">
      {/* Streaming Console Card */}
      <div className="console-card">
        <div className="card-header">
          <h3>
            <i className="fa-solid fa-terminal"></i> Token Streaming Output
          </h3>
          <div className="console-controls">
            <span
              className={`console-badge active-agent-badge ${activeAgentClass}`}
              id="active-agent-label"
            >
              {activeAgentLabel}
            </span>
          </div>
        </div>
        <div className="terminal-body" id="streaming-console" ref={consoleRef}>
          <div className="terminal-prompt">
            &gt; System initialized. Ready to execute multi-agent task...
          </div>
          
          {/* Streamed Blocks */}
          {consoleBlocks.map((block, idx) => (
            <div
              key={idx}
              className="terminal-streamed-text"
              id={`stream-block-${block.stepId}`}
            >
              {block.text}
            </div>
          ))}
          
          <div className="blinking-cursor"></div>
        </div>
      </div>

      {/* System Activity Logs Card */}
      <div className="logs-card">
        <div className="card-header">
          <h3>
            <i className="fa-solid fa-receipt"></i> System Activity Logs
          </h3>
          <button className="clear-btn" onClick={onClearLogs}>
            <i className="fa-solid fa-trash-can"></i> Clear
          </button>
        </div>
        <div className="log-stream-body" id="system-logs" ref={logsRef}>
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`log-line ${log.level.toLowerCase()}`}
            >
              [{log.timestamp}] [{log.level.toUpperCase()}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
