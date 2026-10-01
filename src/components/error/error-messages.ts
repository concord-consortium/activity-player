import { ErrorType } from "../app";

export const errorMsg: Record<ErrorType, string> = {
  auth: "Your session is no longer valid.",
  network: "Your network connection has been lost or interrupted.",
  timeout: "Your session has expired."
};

export const kRelaunchInstruction = "Please close this tab and relaunch the activity.";

export const kSessionExpiredMessage = `${errorMsg.timeout} ${kRelaunchInstruction}`;
