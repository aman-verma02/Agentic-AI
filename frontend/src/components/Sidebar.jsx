// Sidebar.jsx - This component provides a sidebar interface for users to input complex tasks, select from predefined templates, and control failure injection settings. It includes a text area for task description, buttons for quick template selection, toggle switches for simulating failures in different pipeline stages, and a launch button to initiate the agent pipeline. The component manages state for the task prompt and failure injection settings, and it disables inputs when the pipeline is running.


import React from 'react';

const TEMPLATES = {
  math: "Solve the given math problem step by step and explain the final answer in simple language.",

  science: "Read the science topic, summarize the key points, and provide three important facts.",

  programming: "Explain the given programming concept, provide a simple example, and list common mistakes.",

};

export default function Sidebar({
  taskPrompt,
  setTaskPrompt,
  failures,
  setFailures,
  onLaunch,
  isRunning,
}) {
  const fillTemplate = (name) => {
    if (TEMPLATES[name]) {
      setTaskPrompt(TEMPLATES[name]);
    }
  };

  const handleCheckboxChange = (key) => {
    setFailures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <aside className="sidebar">
      {/* Brand Icon & Logo */}
      <div className="brand">
        <i className="fa-solid fa-microchip-ai logo-icon"></i>
        <div className="brand-text">
          <h1>AI AGENT</h1>
          <span>WORKSPACE</span>
        </div>
      </div>

      {/* Task Input Section */}
      <div className="control-section">
        <h2>
          <i className="fa-solid fa-feather-pointed"></i> Complex Task Input
        </h2>
        <div className="textarea-wrapper">
          <textarea
            id="task-prompt"
            value={taskPrompt}
            onChange={(e) => setTaskPrompt(e.target.value)}
            placeholder="Describe a complex, multi-part task to decompose..."
            disabled={isRunning}
          />
        </div>

        {/* Templates Selector */}
        <div className="templates-section">
          <span className="section-label">Quick Templates:</span>
          <div className="templates-list">
            <button
              className="template-btn"
              onClick={() => fillTemplate('math')}
              disabled={isRunning}
            >
              <i className="fa-solid fa-atom"></i> Math Template
            </button>
            <button
              className="template-btn"
              onClick={() => fillTemplate('science')}
              disabled={isRunning}
            >
              <i className="fa-solid fa-shield-halved"></i> Science Template
            </button>
            <button
              className="template-btn"
              onClick={() => fillTemplate('programming')}
              disabled={isRunning}
            >
              <i className="fa-solid fa-plane-slant"></i> Programming Templa
            </button>
          </div>
        </div>
      </div>

      {/* Error Injection Panel */}
      <div className="control-section error-injection-panel">
        <h2>
          <i className="fa-solid fa-bug"></i> Failure Injection Control
        </h2>
        <p className="panel-desc">
          Simulate API rates or network failures to watch the agents retry with
          backoff and trigger user bypass prompts.
        </p>

        <div className="toggle-group">
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="fail-retriever"
              checked={failures.retriever_fail}
              onChange={() => handleCheckboxChange('retriever_fail')}
              disabled={isRunning}
            />
            <span className="slider"></span>
            <span className="label-text">
              <i className="fa-solid fa-cloud-arrow-down icon-cyan"></i> Fail
              Retriever (Timeout)
            </span>
          </label>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="fail-analyzer"
              checked={failures.analyzer_fail}
              onChange={() => handleCheckboxChange('analyzer_fail')}
              disabled={isRunning}
            />
            <span className="slider"></span>
            <span className="label-text">
              <i className="fa-solid fa-brain icon-emerald"></i> Fail Analyzer
              (Rate Limit 429)
            </span>
          </label>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="fail-writer"
              checked={failures.writer_fail}
              onChange={() => handleCheckboxChange('writer_fail')}
              disabled={isRunning}
            />
            <span className="slider"></span>
            <span className="label-text">
              <i className="fa-solid fa-pen-nib icon-orange"></i> Fail Writer
              (Schema Error)
            </span>
          </label>
        </div>
      </div>

      {/* Run Button */}
      <button
        id="run-btn"
        className="glowing-btn"
        onClick={onLaunch}
        disabled={isRunning}
        style={{ opacity: isRunning ? 0.6 : 1, cursor: isRunning ? 'not-allowed' : 'pointer' }}
      >
        <i className="fa-solid fa-circle-play"></i> Launch Agent Pipeline
      </button>
    </aside>
  );
}
