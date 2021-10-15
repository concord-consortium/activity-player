import React from "react";
import { Activity, Sequence } from "../types";

export interface ILaraData {
  activity?: Activity
  sequence?: Sequence
}

export const LaraDataContext = React.createContext<ILaraData>({});
LaraDataContext.displayName = "LaraDataContext";
