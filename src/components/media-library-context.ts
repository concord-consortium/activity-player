import React, { useContext } from "react";
import { IMediaLibrary } from "@concord-consortium/lara-interactive-api";

export const MediaLibraryContext = React.createContext<IMediaLibrary>({
  enabled: false,
  items: []
});
MediaLibraryContext.displayName = "MediaLibraryContext";

export const useMediaLibrary = () => useContext(MediaLibraryContext);
