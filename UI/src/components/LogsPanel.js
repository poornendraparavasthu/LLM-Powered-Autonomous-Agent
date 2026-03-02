import React from "react";

function LogsPanel({ logs }) {
  return (
    <div className="logs">
      <h3>System Logs</h3>
      {logs.map((log, i) => (
        <p key={i}>{log}</p>
      ))}
    </div>
  );
}

export default LogsPanel;