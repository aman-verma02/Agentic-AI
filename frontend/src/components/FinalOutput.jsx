// FinalOutput.jsx - This component displays the final synthesized output of the pipeline. It handles different states such as success, failure, and loading, and provides a button to copy the output to the clipboard.

import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

export default function FinalOutput({
  finalDocument,
  pipelineStatus,
  errorMessage,
}) {
  const copyFinalDocument = () => {
    if (pipelineStatus !== 'success' || !finalDocument) {
      alert('No output document to copy yet.');
      return;
    }

    navigator.clipboard
      .writeText(finalDocument)
      .then(() => alert('Markdown report copied to clipboard!'))
      .catch((err) => console.error('Could not copy output: ', err));
  };

  const renderContent = () => {
    if (pipelineStatus === 'failed') {
      return (
        <div className="empty-state-text" style={{ color: '#EF4444' }}>
          <i
            className="fa-solid fa-circle-exclamation"
            style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}
          ></i>
          Pipeline execution failed or was aborted by user.
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              opacity: 0.8,
              display: 'block',
              marginTop: '8px',
            }}
          >
            Error: {errorMessage || 'Aborted'}
          </span>
        </div>
      );
    }

    if (pipelineStatus === 'success' && finalDocument) {
      return <MarkdownRenderer markdown={finalDocument} />;
    }

    return (
      <p className="empty-state-text">
        Final synthesized document will appear here after all pipeline steps
        complete successfully.
      </p>
    );
  };

  return (
    <section className="final-output-section">
      <div className="card-header">
        <h3>
          <i className="fa-solid fa-file-invoice"></i> Final Synthesized Output
        </h3>
        <div className="output-actions">
          <button className="action-btn" onClick={copyFinalDocument}>
            <i className="fa-solid fa-copy"></i> Copy Markdown
          </button>
        </div>
      </div>
      <div className="output-body markdown-content" id="final-document-container">
        {renderContent()}
      </div>
    </section>
  );
}
