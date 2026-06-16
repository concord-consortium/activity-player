import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/app";
import { FocusDebugOverlay } from "./components/focus-debug-overlay";
import { DEBUG_FOCUS } from "./lib/debug";
import { initializeAuthorization } from "./utilities/auth-utils";

import "./index.sass";

// for notebook skin
import "./notebook.scss";

// allow plugin scripts to have access to React
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

// Initialize OAuth if `auth-domain` URL parameter is provided.
const redirecting = initializeAuthorization();

if (!redirecting) {
  ReactDOM.render(
    <>
      <App />
      {DEBUG_FOCUS && <FocusDebugOverlay />}
    </>,
    document.getElementById("app")
  );
}

