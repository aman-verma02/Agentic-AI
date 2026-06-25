// Header.jsx - This component displays the dashboard header with WebSocket connection status, pipeline status, elapsed time, and error count. It uses badges and indicators to visually represent the current state of the system.


import React from 'react';

export default function Header({
  wsConnected,
  pipelineStatusText,
  pipelineStatusClass,
  elapsedTime,
  errorCount,
}) {
  return (
    <header className="dashboard-header">
      {/* WebSocket and Pipeline Badges */}
      <div className="header-status-info">
        <span
          className={`status-indicator ${wsConnected ? 'online' : 'offline'}`}
          id="ws-status"
        >
          <span className="pulse-dot"></span>{' '}
          {wsConnected ? 'WebSocket: Connected' : 'WebSocket: Disconnected'}
        </span>
        <span
          id="pipeline-status-text"
          className={`status-badge ${pipelineStatusClass}`}
        >
          {pipelineStatusText}
        </span>
      </div>

      {/* Execution Stats (Time and Errors) */}
      <div className="run-stats" id="run-stats">
        <div className="stat">
          <span className="stat-lbl">Time Elapsed: </span>
          <strong id="stat-time">{elapsedTime}</strong>
        </div>
        <div className="stat">
          <span className="stat-lbl">Errors Intercepted: </span>
          <strong id="stat-errors">{errorCount}</strong>
        </div>
      </div>
    </header>
  );
}
