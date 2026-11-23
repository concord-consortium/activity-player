import React from "react";
import ReactDOM from "react-dom";
import { initializeAnonymousDB } from "../firebase-db";
import { SizingPreviewApp } from "./sizing-preview-app";

import "../index.sass";
import "../components/app.scss";

// Plugin scripts and some page components expect these globals, as src/index.tsx sets them.
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

const start = async () => {
  // Set up offline Firestore once, as App does with ?preview. ManagedInteractive reads it for
  // every interactive, and nothing is saved.
  await initializeAnonymousDB(true);
  ReactDOM.render(<SizingPreviewApp />, document.getElementById("app"));
};

start();
