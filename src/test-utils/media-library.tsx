import React from "react";
import { IMediaLibrary } from "@concord-consortium/lara-interactive-api";

import { MediaLibraryContext } from "../components/media-library-context";

export const mediaLibraryTester: IMediaLibrary = {
  enabled: false,
  items: [],
};

export const MediaLibraryTester: React.FC = ({children}) => {
  return (
    <MediaLibraryContext.Provider value={mediaLibraryTester}>
      {children}
    </MediaLibraryContext.Provider>
  );
};
