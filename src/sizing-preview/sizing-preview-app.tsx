import React, { useMemo } from "react";
import { DynamicTextContext, DynamicTextManager } from "@concord-consortium/dynamic-text";
import { ActivityPageContent } from "../components/activity-page/activity-page-content";
import { AccessibilityContext, getFamilyForFontType, getFontSizeInPx, IAccessibility } from "../components/accessibility-context";
import { LaraDataContext } from "../components/lara-data-context";
import { LaraGlobalContext } from "../components/lara-global-context";
import { MediaLibraryContext } from "../components/media-library-context";
import { PortalDataContext } from "../components/portal-data-context";
import { QuestionInfoContext } from "../components/question-info-context";
import { IReadAloudData, ReadAloudContext } from "../components/read-aloud-context";
import { activityClassName, pageHasResponsiveSection } from "../utilities/activity-utils";
import { buildActivity } from "./build-activity";
import { useHashSettings } from "./use-hash-settings";

import "./sizing-preview.scss";

// The values below are the simple ones App provides for an anonymous run of an activity with
// the normal font size and read aloud off.
const dynamicTextManager = new DynamicTextManager({ onEvent: () => undefined });

const accessibility: IAccessibility = {
  fontSize: "normal",
  fontSizeInPx: getFontSizeInPx("normal"),
  fontType: "normal",
  fontFamilyForType: getFamilyForFontType("normal")
};

const mediaLibrary = { enabled: false, items: [] };

const questionInfo = { questionMap: {} };

const readAloud: IReadAloudData = { readAloud: false, readAloudDisabled: true, hideReadAloud: false };

const setNavigation = () => undefined;

export const SizingPreviewApp = () => {
  const [settings] = useHashSettings();
  const activity = useMemo(() => buildActivity(settings), [settings]);
  const laraData = useMemo(() => ({ activity }), [activity]);
  const page = activity.pages[0];

  return (
    <LaraGlobalContext.Provider value={undefined}>
      <PortalDataContext.Provider value={undefined}>
        <LaraDataContext.Provider value={laraData}>
          <AccessibilityContext.Provider value={accessibility}>
            <MediaLibraryContext.Provider value={mediaLibrary}>
              <QuestionInfoContext.Provider value={questionInfo}>
                <DynamicTextContext.Provider value={dynamicTextManager}>
                  <ReadAloudContext.Provider value={readAloud}>
                    <div className="sizing-preview">
                      {/* The controls panel goes here, above the activity. */}
                      <div className="app">
                        <div className={activityClassName(pageHasResponsiveSection(page), activity.fixed_width_layout)}>
                          <ActivityPageContent
                            hideTitleRow={true}
                            enableReportButton={false}
                            activityLayout={activity.layout}
                            activity={activity}
                            page={page}
                            pageNumber={1}
                            totalPreviousQuestions={0}
                            setNavigation={setNavigation}
                            pluginsLoaded={true}
                          />
                        </div>
                      </div>
                      {/* The size readout goes here. */}
                    </div>
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
