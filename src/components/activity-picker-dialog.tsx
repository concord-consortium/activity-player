import React, { useState } from "react";
import Modal from "react-modal";

import { extractActivityParams } from "../utilities/activity-extractor";

import "./activity-picker-dialog.scss";

interface IProps {
  onSubmit: (params: Record<string, string>) => void;
}

export const ActivityPickerDialog: React.FC<IProps> = ({ onSubmit }) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const doSubmit = () => {
    // Strip stray newlines so a URL pasted from a wrapped source still parses.
    const params = extractActivityParams(input.replace(/[\r\n]+/g, ""));
    if (!params) {
      setError("Please paste a URL or activity reference.");
      return;
    }
    onSubmit(params);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    doSubmit();
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    if (error) setError("");
  };

  // In a textarea, Enter would normally insert a newline; submit on plain Enter
  // instead, and reserve Shift+Enter for the rare case where a newline is wanted.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      doSubmit();
    }
  };

  return (
    <Modal
      isOpen={true}
      contentLabel="Load an activity"
      className="activity-picker-dialog"
      shouldFocusAfterRender={true}
    >
      <form onSubmit={handleSubmit} data-cy="activity-picker-dialog">
        <div className="header">Load an activity</div>
        <div className="body">
          <div className="instructions">
            Paste a URL or activity reference from the authoring system:
          </div>
          <textarea
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="https://authoring.concord.org/activities/14237/edit"
            autoFocus={true}
            rows={3}
            data-cy="activity-picker-input"
          />
          <div className="error" data-cy="activity-picker-error">{error}</div>
          <ul className="accepted-formats">
            <li>An Activity Player URL with an <code>activity</code> or <code>sequence</code> query parameter</li>
            <li>An authoring URL (e.g. <code>.../activities/&lt;id&gt;/edit</code> or <code>.../sequences/&lt;id&gt;/edit</code>)</li>
            <li>A direct authoring JSON endpoint (<code>.../api/v1/&lt;resource&gt;/&lt;id&gt;.json</code>)</li>
            <li>A sample activity key (e.g. <code>sample-activity-1</code>)</li>
          </ul>
        </div>
        <div className="footer">
          <button
            type="submit"
            disabled={!input.trim()}
            data-cy="activity-picker-submit"
          >
            Load
          </button>
        </div>
      </form>
    </Modal>
  );
};
