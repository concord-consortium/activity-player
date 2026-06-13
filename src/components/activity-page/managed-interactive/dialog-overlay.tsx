import React, { useCallback, useMemo, useRef } from "react";
import Modal from "react-modal";
// Note: Jest 27 does not honor package.json `exports` subpaths, so
// `@concord-consortium/accessibility-tools/hooks` is resolved via a
// moduleNameMapper entry in package.json that points at the dist CJS file.
// When the project upgrades to Jest 28+, the mapper can be removed.
import { useFocusTrap, useIframeSlot, FocusTrapStrategy } from "@concord-consortium/accessibility-tools/hooks";
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

  // One-shot guard so multiple dismiss paths (close click, Escape, overlay click,
  // trap unmount) only fire onClose once.
  const closedRef = useRef(false);
  const safeOnClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  // Refs the trap and iframe-slot need.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const beforeSentinelRef = useRef<HTMLElement | null>(null);
  const afterSentinelRef = useRef<HTMLElement | null>(null);
  const iframeWrapperRef = useRef<HTMLDivElement | null>(null);

  // Shared with both useIframeSlot and the trap strategy (DRY).
  const cycleOrder = useMemo(
    () => (notCloseable ? ["content"] : ["close", "content"]),
    [notCloseable],
  );
  const getElements = useCallback(
    () => ({
      ...(notCloseable
        ? {}
        : { close: closeButtonRef.current ?? undefined }),
      content: iframeWrapperRef.current ?? undefined,
    }),
    [notCloseable],
  );

  // Forward-declared ref for trap. useIframeSlot's onExit closure needs the
  // trap's cycleToAdjacentSlot, but the trap is constructed *after*
  // useIframeSlot (because the trap's strategy references the slot's
  // focusContent). Reading the trap through a ref defers resolution to event
  // time, breaking the cycle.
  const trapRef = useRef<ReturnType<typeof useFocusTrap> | null>(null);

  const { strategyFragment, beforeSentinelProps, afterSentinelProps } = useIframeSlot({
    slotName: "content",
    iframeRef,
    beforeSentinelRef,
    afterSentinelRef,
    cycleOrder,
    getElements,
    onExit: (direction) => trapRef.current?.cycleToAdjacentSlot(direction),
    enterLabel: "Press Tab to enter the interactive",
  });

  const strategy = useMemo<FocusTrapStrategy>(
    () => {
      const escapeHandlers: FocusTrapStrategy["escapeHandlers"] = notCloseable
        ? {}
        : { close: () => { safeOnClose(); return "handled"; } };
      return {
        ...strategyFragment,            // provides contentSlot, nativeTabSlots, focusContent, getNativeTabSlotSentinels
        cycleOrder,
        getElements,
        escapeHandlers,
      };
    },
    [strategyFragment, cycleOrder, getElements, notCloseable, safeOnClose],
  );

  const trap = useFocusTrap({ containerRef, strategy });
  trapRef.current = trap;

  // Engage the trap when the container element actually attaches to the DOM.
  // react-modal's ModalPortal initially renders null (state.isOpen=false) and
  // only mounts its children after its own componentDidMount → setState. Our
  // mount useEffect therefore runs BEFORE the dialog content (and its refs)
  // exists. A callback ref on the container fires exactly when the dialog DOM
  // is attached; descendant refs (close button, content wrapper) are populated
  // before the parent's callback ref fires, so the trap can see them.
  const enteredRef = useRef(false);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (el && !enteredRef.current) {
      enteredRef.current = true;
      trapRef.current?.enterTrap();
    } else if (!el) {
      enteredRef.current = false;
    }
  }, []);

  return (
    <Modal
      isOpen={true}
      appElement={getModalContainer()}
      shouldFocusAfterRender={false}
      shouldReturnFocusAfterClose={false}
      shouldCloseOnEsc={false}
      onRequestClose={safeOnClose}
    >
      <div className="dialog-overlay" ref={setContainerRef} tabIndex={-1}>
        <div className="dialog-overlay__header">
          <span className="dialog-overlay__title">{title ?? ""}</span>
          {!notCloseable && (
            <button
              type="button"
              ref={closeButtonRef}
              className="dialog-overlay__close"
              data-cy="dialog-overlay-close"
              onClick={safeOnClose}
            >
              Close
            </button>
          )}
        </div>
        <div className="dialog-overlay__content" ref={iframeWrapperRef}>
          <IframeRuntime
            {...iframeRuntimeProps}
            url={url}
            ref={iframeRuntimeRef}
            iframeRef={iframeRef}
            beforeSentinelRef={beforeSentinelProps.ref}
            afterSentinelRef={afterSentinelProps.ref}
          />
        </div>
      </div>
    </Modal>
  );
};
DialogOverlay.displayName = "DialogOverlay";
