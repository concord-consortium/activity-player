import React, { useEffect, useState } from "react";
import "./error.scss";

interface IProps {
  username: string;
  anonymous: boolean;
  timeout: number;
  onTimeout: () => void;
  onContinue: () => void;
  onExit: () => void;
}

const kMaxTimeInterval = 500; // ms

export const IdleWarning: React.FC<IProps> = ({ username, anonymous, timeout, onTimeout, onContinue, onExit }) => {
  const [ time, setTime ] = useState(0);

  useEffect(() => {
    if (anonymous) {
      // Don't start the counter in anonymous mode.
      return;
    }
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
  }, [timeout, anonymous]);

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
      { 
        anonymous ? 
        <div>
          <h1>You&apos;ve been idle for too long.</h1>
          <p>Click continue below to keep working.</p>
          <button className="button" onClick={onContinue} data-cy="continue"> Continue your session </button> 
        </div>
        :
        <div>
          <h1>{username }, your session is about to expire.</h1>
          <p>You will be logged out automatically in 
            <b>{min > 1 && ` ${min} minutes and`}{min === 1 && ` ${min} minute and`}{` ${sec} seconds` }</b>.
          </p>
          <p>Please choose to continue your session or to log in as a different user.</p>
          <button className="button" onClick={onExit} data-cy="exit">Log in as a different user</button> 
          <button className="button" onClick={onContinue} data-cy="continue"> Continue your session </button> 
        </div>
      }
    </div>
  );
};
