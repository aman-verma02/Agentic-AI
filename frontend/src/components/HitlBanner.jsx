// 


import React from 'react';

export default function HitlBanner({
  hitlRequest,
  bypassContent,
  setBypassContent,
  onSubmit,
}) {
  if (!hitlRequest) return null;

  const handleAction = (action) => {
    if (action === 'bypass' && !bypassContent.trim()) {
      alert('Please provide the custom content to inject for bypass.');
      return;
    }
    onSubmit(action);
  };

  return (
    <div id="hitl-container" className="hitl-banner">
      {/* Alert Header */}
      <div className="hitl-header">
        <div className="hitl-title">
          <i className="fa-solid fa-triangle-exclamation pulse-warning"></i>
          <span>Human Intervention Required!</span>
        </div>
        <div className="hitl-error-details" id="hitl-error-text">
          {hitlRequest.message}
        </div>
      </div>

      {/* Intervention Actions */}
      <div className="hitl-body">
        <p>
          Select how you would like to proceed. You can manually type the expected
          results to bypass this step, attempt to retry the API call, or terminate
          the pipeline.
        </p>
        <textarea
          id="hitl-bypass-input"
          value={bypassContent}
          onChange={(e) => setBypassContent(e.target.value)}
          placeholder="Type custom facts or results to inject into the next agent..."
        />
        <div className="hitl-actions">
          <button className="hitl-btn bypass" onClick={() => handleAction('bypass')}>
            <i className="fa-solid fa-forward"></i> Bypass & Inject Output
          </button>
          <button className="hitl-btn retry" onClick={() => handleAction('retry')}>
            <i className="fa-solid fa-rotate-left"></i> Reset & Retry Agent
          </button>
          <button className="hitl-btn abort" onClick={() => handleAction('abort')}>
            <i className="fa-solid fa-circle-xmark"></i> Abort Run
          </button>
        </div>
      </div>
    </div>
  );
}
