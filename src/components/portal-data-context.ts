import React from "react";
import { IPortalData } from "../portal-types";

export const PortalDataContext = React.createContext<IPortalData | undefined>(undefined);
PortalDataContext.displayName = "PortalDataContext";
