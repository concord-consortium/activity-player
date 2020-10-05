import React from "react";
import { LaraGlobalType } from "../lara-plugin";

export const LaraGlobalContext = React.createContext<LaraGlobalType | undefined>(undefined);
LaraGlobalContext.displayName = "LaraGlobalContext";
