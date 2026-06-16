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

  const trap = useFocusTrap({ strategy });
  trapRef.current = trap;

  // Wire the trap's container seam and engage the trap on first attach.
  // The controller's `containerRef` is portal/defer-safe — it attaches its
  // listeners exactly when the dialog DOM commits (react-modal's ModalPortal
  // defers its children until after its own componentDidMount). But the
  // controller does not auto-enter the trap, so we still call enterTrap()
  // once the element is attached.
  const enteredRef = useRef(false);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    trapRef.current?.containerRef(el);
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
