import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFocusTrap, FocusTrapStrategy } from "@concord-consortium/accessibility-tools/hooks";
import IconClose from "../../assets/svg-icons/icon-close.svg";
import { renderHTML } from "../../utilities/render-html";

import "./sidebar-panel.scss";
import { DynamicText } from "@concord-consortium/dynamic-text";

interface IProps {
  handleCloseSidebarContent: (index: number, show: boolean) => void;
  index: number;
  content: string | null;
  title: string | null;
  show: boolean;
  panelId?: string;
  /** Ref to the trigger that opened the panel, so focus can return there on close. */
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * While the dialog is open, take the rest of the page out of the pointer, focus,
 * and assistive-tech trees by marking the siblings of #expandable-container (the
 * header, activity content, footer, plugins) inert + aria-hidden. This is the
 * robust complement to aria-modal for assistive tech (e.g. a screen reader's
 * browse/virtual-cursor mode, which aria-modal alone doesn't reliably confine);
 * the overlay still handles the pointer/visual side and click-to-dismiss. The
 * sidebar container itself stays interactive, so the open dialog (and its
 * trigger) remain reachable. Bounded to one level of siblings — no tree walk.
 * Returns a function that restores the previous state.
 */
const setBackgroundInert = (): (() => void) => {
  const container = document.getElementById("expandable-container");
  const parent = container?.parentElement;
  if (!container || !parent) return () => undefined;
  const restores: Array<() => void> = [];
  Array.from(parent.children).forEach((child) => {
    // Leave the sidebar container and anything already inert untouched.
    if (child === container || !(child instanceof HTMLElement) || child.hasAttribute("inert")) return;
    // Capture the prior aria-hidden so a value set for other reasons is restored
    // exactly on close, rather than blanket-removed.
    const priorAriaHidden = child.getAttribute("aria-hidden");
    child.setAttribute("inert", "");
    child.setAttribute("aria-hidden", "true");
    restores.push(() => {
      child.removeAttribute("inert");
      if (priorAriaHidden === null) {
        child.removeAttribute("aria-hidden");
      } else {
        child.setAttribute("aria-hidden", priorAriaHidden);
      }
    });
  });
  return () => restores.forEach((restore) => restore());
};

export const SidebarPanel: React.FC<IProps> = (props) => {
  const { content, handleCloseSidebarContent, index, panelId, show, title, triggerRef } = props;
  const innerContent = content ? content : "";
  // Only use a heading when there is title text; otherwise keep a non-heading
  // placeholder so the close button stays positioned without an empty heading.
  const hasTitle = !!title?.trim();
  // `index` is always supplied, so fall back to the same `sidebar-panel-${index}`
  // id that Sidebar passes — this guarantees the dialog always has an id (for the
  // trigger's aria-controls) and an accessible name (aria-labelledby), even if a
  // future caller omits panelId.
  const resolvedPanelId = panelId ?? `sidebar-panel-${index}`;
  const titleId = `${resolvedPanelId}-title`;

  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const handleClose = useCallback(() => {
    handleCloseSidebarContent(index, false);
  }, [handleCloseSidebarContent, index]);

  // A single "panel" slot holds the whole dialog. Listing it in tabWithinSlots
  // makes Tab move through the panel's focusable children (close button, links)
  // and wrap at the boundaries instead of escaping to the page behind; Escape
  // closes the dialog.
  const strategy = useMemo<FocusTrapStrategy>(() => ({
    getElements: () => ({ panel: panelRef.current ?? undefined }),
    cycleOrder: ["panel"],
    tabWithinSlots: ["panel"],
    escapeHandlers: {
      panel: () => { handleClose(); return "handled"; },
    },
  }), [handleClose]);

  const trap = useFocusTrap({ strategy, enabled: show });

  // Wire the trap's container seam onto the panel and keep our own ref in sync.
  const setPanelRef = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    trap.containerRef(el);
  }, [trap]);

  // Move focus into the dialog on open; return it to the trigger on close.
  const wasShown = useRef(false);
  useEffect(() => {
    if (show && !wasShown.current) {
      // enterTrap activates the trap (and lands focus on the first control);
      // override that to land on the dialog heading so a screen reader announces
      // the dialog's name before the user tabs to its controls. Fall back to the
      // panel container (which carries the aria-label) when there is no heading.
      trap.enterTrap();
      (headingRef.current ?? panelRef.current)?.focus();
    } else if (!show && wasShown.current) {
      triggerRef?.current?.focus();
    }
    wasShown.current = show;
  }, [show, trap, triggerRef]);

  // While open, take the rest of the page (everything outside the sidebar
  // container) out of the pointer/focus/AT trees; restore it on close/unmount.
  useEffect(() => {
    if (!show) return;
    // setBackgroundInert() applies the inert/aria-hidden attributes now and
    // returns the function that undoes them, which we hand back as the effect's
    // cleanup so React runs it when the dialog closes or the panel unmounts.
    const restoreBackground = setBackgroundInert();
    return restoreBackground;
  }, [show]);

  return (
    <div
      ref={setPanelRef}
      id={resolvedPanelId}
      role="dialog"
      aria-modal={true}
      aria-labelledby={hasTitle ? titleId : undefined}
      aria-label={hasTitle ? undefined : "Sidebar"}
      tabIndex={-1}
      data-cy="sidebar-panel"
      className={`sidebar-panel ${show ? "visible " : "hidden"}`}
    >
      <div className="sidebar-header">
        {hasTitle
          ? <h2 className="sidebar-title" id={titleId} data-cy="sidebar-title" ref={headingRef} tabIndex={-1}>{title}</h2>
          : <div className="sidebar-title" data-cy="sidebar-title" />}
        {/* A native <button> gives the close control its semantics and Enter/Space activation
            for free; aria-label supplies its accessible name since the "x" icon is decorative. */}
        <button type="button" className="icon" onClick={handleClose}
             data-cy="sidebar-close-button" aria-label="Close">
          <IconClose aria-hidden="true" focusable="false" />
        </button>
      </div>
      <DynamicText>
        <div className="sidebar-content help-content" data-cy="sidebar-content">{renderHTML(innerContent)}
        </div>
      </DynamicText>
    </div>
  );
};
