import React, { useEffect, useState } from "react";

interface IProps {
  label: string;
  value: string;
  isValid: (draft: string) => boolean;
  invalidMessage: string;
  onCommit: (draft: string) => void;
}

// A text input that keeps what is typed as a draft and applies it on blur or Enter, so a
// half-typed value (the "8" on the way to "800") never reaches the page. An invalid draft
// shows a message and leaves the applied value alone.
export const DraftInput: React.FC<IProps> = ({ label, value, isValid, invalidMessage, onCommit }) => {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  // Follow the applied value when it changes from elsewhere, such as an edited hash.
  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  const commit = () => {
    if (isValid(draft)) {
      setInvalid(false);
      if (draft !== value) onCommit(draft);
    } else {
      setInvalid(true);
    }
  };

  const messageId = `draft-input-message-${label.replace(/\W+/g, "-")}`;

  return (
    <div className="control">
      <label>
        <span className="control-label">{label}</span>
        <input
          type="text"
          value={draft}
          aria-invalid={invalid}
          aria-describedby={invalid ? messageId : undefined}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); }}
        />
      </label>
      {invalid && <div id={messageId} className="control-error" role="alert">{invalidMessage}</div>}
    </div>
  );
};
