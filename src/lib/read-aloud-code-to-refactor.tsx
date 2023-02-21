// NOTE: this code needs to be split up and moved to other repos before this feature branch is merged
import classNames from "classnames";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import queryString from "query-string";

// this should not be in the final code
const params = queryString.parse(window.location.search);
let rate = parseFloat((params.readAloudRate as string) || "1");
if (isNaN(rate)) {
  rate = 1;
}
console.info("Read Aloud Rate:", rate);

// this will probably be moved to the lara-interactive-host

type ReadAloudMessage =
  { type: "selected", id: string | null } |
  { type: "enabled", enabled: boolean };

type ReadAloudListener = (message: ReadAloudMessage) => void;

class ReadAloudManager {
  static SessionStorageKey = "readAloud";
  private enabled = false;
  private selectedComponentId: string | null = null;
  private components: Record<string, ReadAloudListener> = {};

  constructor() {
    let enabled = "false";
    try {
      enabled = window.sessionStorage.getItem(ReadAloudManager.SessionStorageKey) || "false";
    } catch (e) {
      // no-op
    }
    this.enabled = this.isAvailable && enabled === "true";
  }

  public get isAvailable() {
    return !!window.speechSynthesis;
  }

  public get isEnabled() {
    return this.enabled;
  }

  public enable(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.selectedComponentId = null;
    }
    this.stopSpeaking();
    this.emit({ type: "enabled", enabled });
    this.emit({ type: "selected", id: this.selectedComponentId });

    try {
      window.sessionStorage.setItem(ReadAloudManager.SessionStorageKey, `${enabled}`);
    } catch (e) {
      // no-op
    }
  }

  public registerComponent(id: string, listener: ReadAloudListener) {
    this.components[id] = listener;
    listener({ type: "enabled", enabled: this.enabled });
  }

  public unregisterComponent(id: string) {
    delete this.components[id];
    if (this.selectedComponentId === id) {
      this.selectedComponentId = null;
      this.stopSpeaking();
    }
  }

  public selectComponent(id: string | null, options?: {text: string}) {
    const text = options?.text || "";

    if (this.enabled) {
      if (this.selectedComponentId === id) {
        this.selectedComponentId = null;
      } else {
        this.selectedComponentId = id;
      }

      this.stopSpeaking();
      this.emit({ type: "selected", id: this.selectedComponentId });

      if (this.selectedComponentId && (text.length > 0)) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.addEventListener("end", () => {
          // if this is still the currently selected component deselect it
          if (this.selectedComponentId === id) {
            this.selectComponent(null);
          }
        });
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  private stopSpeaking() {
    window.speechSynthesis?.cancel();
  }

  private emit(message: ReadAloudMessage) {
    Object.values(this.components).forEach(listener => listener(message));
  }
}

export const readAloudManager = new ReadAloudManager();

// this function should become a stylus file when the component is moved
const addReadAloudTextStyles = () => {

  const element = document.createElement("style");
  element.setAttribute("type", "text/css");
  element.textContent = `
    .readAloudTextEnabled:hover, .readAloudTextSelected {
      color: black;
      background-color: #f8ff00;
      cursor: pointer;
    }
  `;
  document.getElementsByTagName("head")[0].appendChild(element);
};
addReadAloudTextStyles();

// the rest of this code is most likely moved to either question interactives or its own repo

export const ReadAloudText: React.FC = ({ children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [id, setId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState(false);

  // register the component onmount and unregister when unmounted
  useEffect(() => {
    const componentId = uuid();
    setId(componentId);

    // this will need to change to an api message
    readAloudManager.registerComponent(componentId, (message: ReadAloudMessage) => {
      switch (message.type) {
        case "enabled":
          setEnabled(message.enabled);
          break;
        case "selected":
          setSelected(message.id === componentId);
          break;
      }
    });

    return () => readAloudManager.unregisterComponent(componentId);
  }, []);

  // select the component when clicked
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // this will need to change to an api message
    readAloudManager.selectComponent(id, {
      text: (ref.current?.innerText || "").trim()
    });
  }, [id]);

  const className = classNames({
    readAloudTextEnabled: enabled,
    readAloudTextSelected: selected
  });

  return (
    <div className={className} onClick={handleClick} ref={ref}>{children}</div>
  );
};
