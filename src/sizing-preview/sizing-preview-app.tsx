import React, { useMemo, useState } from "react";
import { DynamicTextManager } from "@concord-consortium/dynamic-text";
import { ActivityPageContent } from "../components/activity-page/activity-page-content";
import { getFamilyForFontType, getFontSizeInPx, IAccessibility } from "../components/accessibility-context";
import { AppContextProviders } from "../components/app-context-providers";
import { IReadAloudData } from "../components/read-aloud-context";
import { activityClassName, pageHasResponsiveSection } from "../utilities/activity-utils";
import { ControlsPanel } from "./controls-panel";
import { buildActivity } from "./build-activity";
import { SizeReadout } from "./size-readout";
import { useHashSettings } from "./use-hash-settings";

import "./sizing-preview.scss";

// Simple stand-ins for the values App provides, for an anonymous run with the normal font size and
// read aloud off.
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
  const [settings, setSettings] = useHashSettings();
  const activity = useMemo(() => buildActivity(settings), [settings]);
  const laraData = useMemo(() => ({ activity }), [activity]);
  const page = activity.pages[0];
  // State, not a ref object, so the readout renders again once .app exists.
  const [appElement, setAppElement] = useState<HTMLDivElement | null>(null);

  return (
    <AppContextProviders
      laraGlobal={undefined}
      portalData={undefined}
      laraData={laraData}
      accessibility={accessibility}
      mediaLibrary={mediaLibrary}
      questionInfo={questionInfo}
      dynamicText={dynamicTextManager}
      readAloud={readAloud}
    >
      <div className="sizing-preview">
        <ControlsPanel settings={settings} onChange={setSettings} />
        <div className="sizing-preview-page">
          <div className="app" ref={setAppElement}>
            <div className={activityClassName(pageHasResponsiveSection(page), activity.fixed_width_layout)}>
              {/* An interactive keeps the size it asked for, so a new URL gets a new
                  one, as another activity would in App. Other settings apply in place. */}
              <ActivityPageContent
                key={settings.interactive}
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
        </div>
        <SizeReadout root={appElement} />
      </div>
    </AppContextProviders>
  );
};
