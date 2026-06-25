// Timeline.jsx - This component visualizes the execution pipeline and data flow of the agent. It displays each step in the pipeline with its current status, description, and relevant metrics. 


import React from 'react';

export default function Timeline({ steps }) {
  const getStepClass = (step) => {
    let classes = 'timeline-step';
    if (step.status) {
      classes += ` ${step.status}`;
    }
    // If running, we also add 'active' to trigger the pulse glow from style.css
    if (step.status === 'running' || step.status === 'active') {
      classes += ' active';
    }
    return classes;
  };

  const getStatusLabel = (step) => {
    if (step.id === 'planner') {
      if (step.status === 'idle') return 'Idle';
      if (step.status === 'active') return 'Planning';
      if (step.status === 'success') return 'Success';
    }
    return step.status.charAt(0).toUpperCase() + step.status.slice(1);
  };

  return (
    <section className="visualizer-section">
      <h2 className="section-title">
        <i className="fa-solid fa-sitemap"></i> Execution Pipeline & Data Flow
      </h2>
      <div className="timeline-container">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            {/* Step Card */}
            <div className={getStepClass(step)} id={`node-${step.id}`}>
              <div className="step-card">
                <div className="step-header">
                  <div className={`step-icon ${step.id === 'planner' ? '' : step.id.replace('step_', '')}`}>
                    <i className={step.iconClass.split(' ')[0]}></i>
                  </div>
                  <div className="step-meta">
                    <h3>{step.name}</h3>
                    <span className="step-badge">{step.badge}</span>
                  </div>
                </div>
                <div className="step-details">{step.desc}</div>
                <div className="step-footer">
                  <span className="step-status">{getStatusLabel(step)}</span>
                  {step.id !== 'planner' && (
                    <span className="step-metrics">
                      Retries: {step.retries}/{step.maxRetries}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Connecting Arrow between steps */}
            {idx < steps.length - 1 && (
              <div className="timeline-arrow">
                <i className="fa-solid fa-angles-right"></i>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
