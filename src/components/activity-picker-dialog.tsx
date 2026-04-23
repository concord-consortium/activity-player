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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = extractActivityParams(input);
    if (!params) {
      setError("Please paste a URL or activity reference.");
      return;
    }
    onSubmit(params);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
    if (error) setError("");
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
          <input
            type="text"
            value={input}
            onChange={handleChange}
            placeholder="https://authoring.staging.concord.org/api/v1/123.json"
            autoFocus={true}
            data-cy="activity-picker-input"
          />
          <div className="error" data-cy="activity-picker-error">{error}</div>
          <ul className="accepted-formats">
            <li>An Activity Player URL with an <code>activity</code> or <code>sequence</code> query parameter</li>
            <li>A direct authoring JSON endpoint (<code>.../api/v1/&lt;id&gt;.json</code>)</li>
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
