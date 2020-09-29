import React from "react";

export const AuthError: React.FC = () => {
  return (
    <div className="single-page-content" data-cy="single-page-content">
      <h1>Session Timed Out</h1>
      <p>Sorry, but we&apos;ve lost track of who you are. Please do the following...</p>
      <ol>
        <li>Close this window or browser tab.</li>
        <li>Go back to the portal from which you launched the activity.</li>
        <li>Re-launch the activity.</li>
      </ol>
      <p>If you are stuck or surprised to see this, please <a href="mailto:help@concord.org">let us know</a>.</p>
    </div>
  );
};
