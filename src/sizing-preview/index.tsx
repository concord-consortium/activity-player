import React from "react";
import ReactDOM from "react-dom";
import { initializeAnonymousDB } from "../firebase-db";
import { SizingPreviewApp } from "./sizing-preview-app";

import "../index.sass";
import "../components/app.scss";

// src/index.tsx sets these globals for plugin scripts. The preview loads none, but keeps them so
// the page runs as it does in App.
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

const start = async () => {
  // Set up offline Firestore once, as App does with ?preview. ManagedInteractive reads it for
  // every interactive, and nothing is saved.
  try {
    await initializeAnonymousDB(true);
    ReactDOM.render(<SizingPreviewApp />, document.getElementById("app"));
  } catch (error) {
    console.error("The sizing preview could not start:", error);
    const app = document.getElementById("app");
    if (app) app.textContent = "The sizing preview could not start. See the browser console for details.";
  }
};

start();
