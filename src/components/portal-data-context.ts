import React from "react";
import { IPortalData } from "../portal-api";

export const PortalDataContext = React.createContext<IPortalData | undefined>(undefined);
PortalDataContext.displayName = "PortalDataContext";
