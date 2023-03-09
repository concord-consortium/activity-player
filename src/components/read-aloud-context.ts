import React, { useContext } from "react";

export interface IReadAloudData {
  readAloud: boolean;
  setReadAloud?: (readAloud: boolean) => void;
  readAloudDisabled: boolean;
}

export const ReadAloudContext = React.createContext<IReadAloudData>({
  readAloud: false,
  setReadAloud: () => undefined,
  readAloudDisabled: false
});
ReadAloudContext.displayName = "ReadAloudContext";

export const useReadAloud = () => useContext(ReadAloudContext);
