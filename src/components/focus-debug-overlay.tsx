import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./focus-debug-overlay.scss";

interface Entry {
  id: number;
  type: "focusin" | "focusout" | "key" | "win";
  detail: string;
  ts: number;
}

const MAX_ENTRIES = 30;

function describe(el: Element | null): string {
  if (!el) return "(none)";
  let s = el.tagName.toLowerCase();
  if (el.id) s += `#${el.id}`;
  const dataCy = el.getAttribute("data-cy");
  if (dataCy) s += `[data-cy=${dataCy}]`;
  if (el.classList.length) s += `.${el.classList[0]}`;
  return s;
}

function path(el: Element | null): string {
  if (!el) return "(none)";
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    parts.unshift(describe(cur));
    cur = cur.parentElement;
    if (parts.length > 8) {
      parts.unshift("…");
      break;
    }
  }
  return parts.join(" > ") || describe(el);
}

export const FocusDebugOverlay: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeElPath, setActiveElPath] = useState<string>(path(document.activeElement));
  const idRef = useRef(0);
  const startTs = useRef(Date.now());

  useEffect(() => {
    const push = (type: Entry["type"], detail: string) => {
      idRef.current += 1;
      setEntries(prev => [
        ...prev.slice(-(MAX_ENTRIES - 1)),
        { id: idRef.current, type, detail, ts: Date.now() - startTs.current },
      ]);
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      push("focusin", path(target));
      setActiveElPath(path(target));
    };
    const onFocusOut = (e: FocusEvent) => {
      const target = e.target as Element | null;
      push("focusout", describe(target));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" && e.key !== "Enter" && e.key !== "Escape") return;
      const mod = e.shiftKey ? "Shift+" : "";
      push("key", `${mod}${e.key} @ ${describe(e.target as Element)}`);
    };
    const onWinBlur = () => {
      const ae = document.activeElement;
      const isIframe = ae?.tagName === "IFRAME";
      push("win", `blur (activeEl=${describe(ae)}${isIframe ? " ← iframe gained focus" : ""})`);
    };
    const onWinFocus = () => {
      push("win", `focus (activeEl=${describe(document.activeElement)})`);
    };

    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("focusout", onFocusOut, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onWinBlur);
    window.addEventListener("focus", onWinFocus);

    const poll = window.setInterval(() => {
      setActiveElPath(path(document.activeElement));
    }, 500);

    return () => {
      window.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("focusout", onFocusOut, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onWinBlur);
      window.removeEventListener("focus", onWinFocus);
      window.clearInterval(poll);
    };
  }, []);

  const clear = () => setEntries([]);

  // Portal directly to <body> so the overlay competes for stacking with
  // react-modal's own portal (also a body-level sibling). Rendering inside
  // <App /> traps the overlay in #app's stacking context, which the dialog's
  // body-level portal then paints over.
  return ReactDOM.createPortal(
    <div className="focus-debug-overlay" tabIndex={-1}>
      <div className="focus-debug-overlay__header">
        <span>focus debug</span>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={clear}>clear</button>
      </div>
      <div className="focus-debug-overlay__active">
        <strong>active:</strong> {activeElPath}
      </div>
      <div className="focus-debug-overlay__log">
        {entries.map(e => (
          <div key={e.id} className={`focus-debug-overlay__entry focus-debug-overlay__entry--${e.type}`}>
            <span className="focus-debug-overlay__ts">{(e.ts / 1000).toFixed(2)}s</span>
            <span className="focus-debug-overlay__type">{e.type}</span>
            <span className="focus-debug-overlay__detail">{e.detail}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
};
FocusDebugOverlay.displayName = "FocusDebugOverlay";
