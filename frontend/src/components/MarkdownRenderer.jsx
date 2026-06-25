// MarkdownRenderer.jsx - This component takes a markdown string as input and renders it as HTML. It includes basic parsing for headers, code blocks, inline code, bold text, bullet lists, and paragraphs. If the markdown is empty or null, it displays a default message indicating that no output was generated.

import React from 'react';

export default function MarkdownRenderer({ markdown }) {
  const parseMarkdownToHtml = (md) => {
    if (!md) return "<p>No output generated.</p>";

    // Safely encode HTML content
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
    html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");

    // Code blocks
    html = html.replace(/```(javascript|json|html|css|python|bash)?\n([\s\S]+?)\n```/g, "<pre><code>$2</code></pre>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Bullet lists
    html = html.replace(/^\-\s+(.+)$/gm, "<li>$1</li>");

    // Clean list formatting: wrap consecutive list items in ul tags
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

    // Paragraphs: double newline split
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map((p) => {
        p = p.trim();
        if (!p) return "";
        if (
          p.startsWith("<h1>") ||
          p.startsWith("<h2>") ||
          p.startsWith("<h3>") ||
          p.startsWith("<pre>") ||
          p.startsWith("<ul>") ||
          p.startsWith("<li>")
        ) {
          return p;
        }
        return `<p>${p}</p>`;
      })
      .join("");

    return html;
  };

  const parsedContent = parseMarkdownToHtml(markdown);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: parsedContent }}
    />
  );
}
