import React from "react";
import { ErrorType } from "../app";
import "./error.scss";

interface IProps {
  type: ErrorType;
  portalUrl: string;
}

export const errorMsg: Record<ErrorType, string> = {
  auth: "We can't establish a connection to your account.",
  network: "Your network connection has been lost or interrupted.",
  timeout: "Your session has expired."
};


export const Error: React.FC<IProps> = ({ type, portalUrl }) => {
  return (
    <div className="error" data-cy="error">
      <h1>Hmm... we&apos;re having trouble connecting.</h1>
      <p>{ errorMsg[type] }</p>
      <p>Try:</p>
      <ul>
        <li>Checking your internet connection status.</li>
        <li>Closing this window or tab and logging back in to relaunch this activity.</li>
      </ul>
      <p className="login-again"><a href={portalUrl}>Click here</a> to log in again.</p>
    </div>
  );
};
