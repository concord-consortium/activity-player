import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/app";

import "./index.sass";

// allow plugin scripts to have access to React
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

ReactDOM.render(
  <App />,
  document.getElementById("app")
);
