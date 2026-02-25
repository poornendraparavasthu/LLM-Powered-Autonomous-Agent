import React from "react";

function MessageBubble({ text, sender }) {
  return (
    <div className={`bubble ${sender}`}>
      {text}
    </div>
  );
}

export default MessageBubble;