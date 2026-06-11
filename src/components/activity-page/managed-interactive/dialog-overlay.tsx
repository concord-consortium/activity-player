import React, { useCallback, useRef } from "react";
import Modal from "react-modal";
import { IframeRuntime, IframeRuntimeImperativeAPI } from "./iframe-runtime";
import "./dialog-overlay.scss";

const getModalContainer = (): HTMLElement => {
  return document.getElementById("app") || document.body;
};

interface IProps {
  /** URL the dialog displays (typically the dialog URL the interactive supplied). */
  url: string;
  /** Optional title shown in the dialog header. */
  title?: string;
  /** When true, no close button is rendered and the trap's cycleOrder has only the iframe-slot. */
  notCloseable?: boolean;
  /** Called once when the user dismisses the dialog (close button / Escape / overlay click). */
  onClose: () => void;
  /** All other props the inner IframeRuntime needs. Managed-interactive builds this. */
  iframeRuntimeProps: Omit<
    React.ComponentProps<typeof IframeRuntime>,
    "iframeRef" | "beforeSentinelRef" | "afterSentinelRef" | "url"
  >;
  /** Optional imperative ref forwarded to the inner IframeRuntime (used by managed-interactive for state requests). */
  iframeRuntimeRef?: React.Ref<IframeRuntimeImperativeAPI>;
}

export const DialogOverlay: React.FC<IProps> = (props) => {
  const { url, title, notCloseable, onClose, iframeRuntimeProps, iframeRuntimeRef } = props;

  // safeOnClose: one-shot wrapper so repeated dismiss paths don't fire onClose more than once.
  const closedRef = useRef(false);
  const safeOnClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={true}
      appElement={getModalContainer()}
      shouldFocusAfterRender={false}
      shouldReturnFocusAfterClose={false}
      shouldCloseOnEsc={false}
      onRequestClose={safeOnClose}
    >
      <div className="dialog-overlay">
        <div className="dialog-overlay__header">
          <span className="dialog-overlay__title">{title ?? ""}</span>
          {!notCloseable && (
            <button
              type="button"
              className="dialog-overlay__close"
              data-cy="dialog-overlay-close"
              onClick={safeOnClose}
            >
              Close
            </button>
          )}
        </div>
        <div className="dialog-overlay__content">
          <IframeRuntime
            {...iframeRuntimeProps}
            url={url}
            ref={iframeRuntimeRef}
          />
        </div>
      </div>
    </Modal>
  );
};
DialogOverlay.displayName = "DialogOverlay";
