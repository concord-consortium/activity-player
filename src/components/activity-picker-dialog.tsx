import React, { useState } from "react";
import Modal from "react-modal";

import { extractActivityParams } from "../utilities/activity-extractor";
import { getCodapBaseUrlOverride, isValidCodapBaseUrl } from "../utilities/codap-url-utils";
import { firebaseAppName } from "../portal-api";

import "./activity-picker-dialog.scss";

interface IProps {
  onSubmit: (params: Record<string, string>) => void;
}

export const ActivityPickerDialog: React.FC<IProps> = ({ onSubmit }) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  // The CODAP override is pre-filled from the page's `codap=` query param (if
  // any) but is editable here, so the tester can set or change it per load.
  const [codapInput, setCodapInput] = useState(getCodapBaseUrlOverride() ?? "");
  const [codapError, setCodapError] = useState("");

  // Preview what loading the current input would do, so the tester can confirm
  // the firebase-app context before submitting. Recomputed per render.
  const previewParams = extractActivityParams(input.replace(/[\r\n]+/g, ""));
  // The firebase app only matters for a portal-authenticated run (one with a
  // `domain`/`token`); sample keys and bare authoring URLs use the local db.
  const isPortalRun = !!(previewParams && (previewParams.domain || previewParams.token));
  // What firebaseAppName() will resolve to: an explicit/auto-derived param wins,
  // otherwise it falls back to this page's origin default.
  const resolvedFirebaseApp = previewParams?.firebaseApp ?? firebaseAppName();

  const doSubmit = () => {
    // Strip stray newlines so a URL pasted from a wrapped source still parses.
    const params = extractActivityParams(input.replace(/[\r\n]+/g, ""));
    if (!params) {
      setError("Please paste a URL or activity reference.");
      return;
    }
    const codap = codapInput.replace(/[\r\n]+/g, "").trim();
    if (codap && !isValidCodapBaseUrl(codap)) {
      setCodapError("Enter a valid http(s) CODAP URL, or leave it blank.");
      return;
    }
    // The field is authoritative: apply it when set, otherwise load with no
    // CODAP override (the app handler drops any inherited `codap` param).
    if (codap) {
      params.codap = codap;
    } else {
      delete params.codap;
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

  const handleCodapChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodapInput(event.target.value);
    if (codapError) setCodapError("");
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
            className="activity-input"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="https://authoring.concord.org/activities/14237/edit"
            autoFocus={true}
            rows={5}
            data-cy="activity-picker-input"
          />
          {error && <div className="error" data-cy="activity-picker-error">{error}</div>}
          <ul className="bullets">
            <li>A full Activity Player launch URL, including a student&apos;s run URL from learn.concord.org. Its <code>domain</code>, <code>domain_uid</code>, <code>token</code>, and navigation params are preserved (e.g. <code>https://activity-player.concord.org/?domain=https://learn.concord.org/&amp;domain_uid=&lt;id&gt;&amp;sequence=&lt;url&gt;&amp;sequenceActivity=0&amp;token=&lt;token&gt;</code>)</li>
            <li>An Activity Player URL with an <code>activity</code> or <code>sequence</code> query parameter</li>
            <li>An authoring URL (e.g. <code>.../activities/&lt;id&gt;/edit</code> or <code>.../sequences/&lt;id&gt;/edit</code>)</li>
            <li>A direct authoring JSON endpoint (<code>.../api/v1/&lt;resource&gt;/&lt;id&gt;.json</code>)</li>
            <li>A sample activity key (e.g. <code>sample-activity-1</code>)</li>
          </ul>
          <div className="instructions">
            CODAP URL override (optional). Rewrites CODAP URLs in the loaded activity to this base:
          </div>
          <textarea
            value={codapInput}
            onChange={handleCodapChange}
            onKeyDown={handleKeyDown}
            placeholder="https://codap2to3.concord.org/app"
            rows={2}
            data-cy="activity-picker-codap-input"
          />
          {codapError && <div className="error" data-cy="activity-picker-codap-error">{codapError}</div>}
          <ul className="bullets" data-cy="activity-picker-codap-samples">
            <li><code>https://codap2to3.concord.org/app</code> (the v2-to-v3 test server)</li>
            <li><code>https://codap3.concord.org</code> (CODAP V3 production)</li>
            <li><code>https://codap3.concord.org/branch/&lt;name&gt;</code> (a CODAP V3 branch build)</li>
          </ul>
          {isPortalRun &&
            <div className="dialog-note" data-cy="activity-picker-firebase-app">
              <p>Student data will load from firebase app:</p>
              <p><code>{resolvedFirebaseApp}</code></p>
            </div>
          }
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
