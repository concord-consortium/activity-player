// src/components/single-question/single-question-keyboard-help.tsx

import React, { useEffect, useRef } from "react";
import "./single-question-keyboard-help.scss";

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: ["→", "↓"], description: "Next slide" },
  { keys: ["←", "↑"], description: "Previous slide" },
  { keys: ["Home"], description: "First slide" },
  { keys: ["End"], description: "Last slide" },
  { keys: ["Page Down"], description: "Next page" },
  { keys: ["Page Up"], description: "Previous page" },
  { keys: ["Escape"], description: "Return to navigation" },
  { keys: ["?"], description: "Toggle this help" },
];

export const SingleQuestionKeyboardHelp: React.FC<IProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      // Focus trap: keep focus within modal
      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="single-question-keyboard-help__backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="single-question-keyboard-help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
      >
        <div className="single-question-keyboard-help__header">
          <h2 id="keyboard-help-title" className="single-question-keyboard-help__title">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            className="single-question-keyboard-help__close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ×
          </button>
        </div>

        <div className="single-question-keyboard-help__content">
          <table className="single-question-keyboard-help__table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td className="single-question-keyboard-help__keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        {keyIndex > 0 && <span className="single-question-keyboard-help__or"> or </span>}
                        <kbd className="single-question-keyboard-help__key">{key}</kbd>
                      </React.Fragment>
                    ))}
                  </td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="single-question-keyboard-help__footer">
          <p>Press <kbd>?</kbd> anytime to toggle this help.</p>
        </div>
      </div>
    </div>
  );
};
