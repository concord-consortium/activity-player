import React, { useEffect, useState } from "react";
import "./error.scss";

interface IProps {
  username: string;
  onTimeout: () => void;
  onContinue: () => void;
  onExit: () => void;
  timeout: number;
}

const kMaxTimeInterval = 500; // ms

export const IdleWarning: React.FC<IProps> = ({ username, timeout, onTimeout, onContinue, onExit }) => {
  const [ time, setTime ] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      const timeDiff = currentTime - startTime;
      setTime(timeDiff);
      if (timeDiff >= timeout) {
        window.clearInterval(intervalId);
      }
    }, Math.min(timeout / 2, kMaxTimeInterval));
    return () => window.clearInterval(intervalId);
  }, [timeout]);

  useEffect(() => {
    if (time >= timeout) {
      onTimeout();
    }
  }, [onTimeout, time, timeout]);
  
  const timeLeft = timeout - time;
  const sec = Math.round((timeLeft / 1000) % 60);
  const min = Math.floor((timeLeft / 1000) / 60);

  return (
    <div className="error" data-cy="idle-warning">
      <h1>{username }, your session is about to expire.</h1>
      <p>Session has been idle over its time limit.</p>
      <p>You will be logged out automatically in 
        <b>{min > 1 && ` ${min} minutes and`}{min === 1 && ` ${min} minute and`}{` ${sec} seconds` }</b>.
      </p>
      <p>Please choose to continue your session or to log in as a different user.</p>
      <button className="button" onClick={onExit} data-cy="exit">Log in as a different user</button> 
      <button className="button" onClick={onContinue} data-cy="continue"> Continue your session </button> 
    </div>
  );
};
