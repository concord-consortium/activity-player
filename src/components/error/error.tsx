import React from "react";
import { ErrorType } from "../app";
import "./error.scss";

interface IProps {
  type: ErrorType;
  onExit?: () => void;
}

export const errorMsg: Record<ErrorType, string> = {
  auth: "Your session is no longer valid.",
  network: "Your network connection has been lost or interrupted.",
  timeout: "Your session has expired."
};


export const Error: React.FC<IProps> = ({ type, onExit }) => {
  const isAuth = type === "auth";
  return (
    <div className="error" data-cy="error">
      <h1>Hmm... we&apos;re having trouble connecting.</h1>
      <p className={isAuth ? "auth-message" : undefined}>{ errorMsg[type] }</p>
      {isAuth
        ? <p className="auth-instruction">Please close this tab and use the Run button to relaunch the activity.</p>
        : <>
            <p>Try:</p>
            <ul>
              <li>Checking your internet connection status.</li>
              <li>Closing this window or tab and logging back in to relaunch this activity.</li>
            </ul>
          </>
      }
      {!isAuth && onExit && (
        <p className="login-again"><span className="link" onClick={onExit} data-cy="login-again">Click here</span> to log in again.</p>
      )}
    </div>
  );
};
