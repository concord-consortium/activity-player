import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/app";
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
    <App />,
    document.getElementById("app")
  );
}

