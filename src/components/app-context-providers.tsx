import React from "react";
import { DynamicTextContext } from "@concord-consortium/dynamic-text";
import { AccessibilityContext } from "./accessibility-context";
import { LaraDataContext } from "./lara-data-context";
import { LaraGlobalContext } from "./lara-global-context";
import { MediaLibraryContext } from "./media-library-context";
import { PortalDataContext } from "./portal-data-context";
import { QuestionInfoContext } from "./question-info-context";
import { ReadAloudContext } from "./read-aloud-context";

interface IProps {
  laraGlobal: React.ContextType<typeof LaraGlobalContext>;
  portalData: React.ContextType<typeof PortalDataContext>;
  laraData: React.ContextType<typeof LaraDataContext>;
  accessibility: React.ContextType<typeof AccessibilityContext>;
  mediaLibrary: React.ContextType<typeof MediaLibraryContext>;
  questionInfo: React.ContextType<typeof QuestionInfoContext>;
  dynamicText: React.ContextType<typeof DynamicTextContext>;
  readAloud: React.ContextType<typeof ReadAloudContext>;
  children?: React.ReactNode;
}

/** The contexts App provides to an activity's pages, for App and the sizing preview to share. */
export const AppContextProviders = (props: IProps) => {
  const {
    laraGlobal, portalData, laraData, accessibility, mediaLibrary, questionInfo, dynamicText, readAloud, children
  } = props;
  return (
    <LaraGlobalContext.Provider value={laraGlobal}>
      <PortalDataContext.Provider value={portalData}>
        <LaraDataContext.Provider value={laraData}>
          <AccessibilityContext.Provider value={accessibility}>
            <MediaLibraryContext.Provider value={mediaLibrary}>
              <QuestionInfoContext.Provider value={questionInfo}>
                <DynamicTextContext.Provider value={dynamicText}>
                  <ReadAloudContext.Provider value={readAloud}>
                    {children}
                  </ReadAloudContext.Provider>
                </DynamicTextContext.Provider>
              </QuestionInfoContext.Provider>
            </MediaLibraryContext.Provider>
          </AccessibilityContext.Provider>
        </LaraDataContext.Provider>
      </PortalDataContext.Provider>
    </LaraGlobalContext.Provider>
  );
};
