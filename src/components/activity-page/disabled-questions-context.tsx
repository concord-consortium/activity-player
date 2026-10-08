import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Page, SectionType } from "../../types";
import { watchAnswer } from "../../firebase-db";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { queryValue } from "../../utilities/url-query";
import { isOfferingLocked } from "../../utilities/portal-data-utils";
import { PortalDataContext } from "../portal-data-context";
import {
  combineBanner, defaultLockedBannerText, gateTexts, GateStatus, IBanner, IGateTexts, kDefaultUnlockedBannerText,
  isSettling, kDisableQuestionsAfterParam, nextGateStatus, planDisabledQuestions, planTabBanners, questionGatingSettings
} from "../../utilities/disabled-questions";

export interface IQuestionLock {
  /** Out of reach of pointer, keyboard and assistive technology, except for its heading. */
  disabled: boolean;
  /** Shown grayed out with its heading marked locked. False while the gate is still loading. */
  locked: boolean;
  /** Set on the first question a gating item disables, unless a notebook tab banner covers it. */
  banner?: IBanner;
}

const kUnlocked: IQuestionLock = { disabled: false, locked: false };

const kUnnamedGateTexts: IGateTexts = { locked: defaultLockedBannerText(undefined), unlocked: kDefaultUnlockedBannerText };

// queryValue throws on a repeated parameter, which would unmount the page during render.
const readQuestionGatingSettings = (page: Page) => {
  try {
    return questionGatingSettings(page, queryValue(kDisableQuestionsAfterParam));
  } catch (e) {
    console.warn(`Ignoring ${kDisableQuestionsAfterParam}: ${e}`);
    return questionGatingSettings(page, undefined);
  }
};

interface IGateState { statuses: Record<string, GateStatus>; unlockOrder: string[]; }

interface IDisabledQuestions {
  getLock: (refId: string) => IQuestionLock;
  getTabBanner: (section: SectionType) => IBanner | undefined;
}

const DisabledQuestionsContext = React.createContext<IDisabledQuestions>({
  getLock: () => kUnlocked,
  getTabBanner: () => undefined
});

export const useQuestionLock = (refId: string) => useContext(DisabledQuestionsContext).getLock(refId);

export const useTabBanner = (section: SectionType) => useContext(DisabledQuestionsContext).getTabBanner(section);

interface IProps {
  page: Page;
  activityLayout: number;
  teacherEditionMode?: boolean;
}

export const DisabledQuestionsProvider: React.FC<IProps> = ({ page, activityLayout, teacherEditionMode, children }) => {
  const portalData = useContext(PortalDataContext);
  const active = !teacherEditionMode && !isOfferingLocked(portalData);
  const plan = useMemo(
    () => active ? planDisabledQuestions(page, activityLayout, readQuestionGatingSettings(page)) : {},
    [active, page, activityLayout]
  );
  const tabs = useMemo(
    () => activityLayout === ActivityLayouts.Notebook ? planTabBanners(page, plan) : {},
    [activityLayout, page, plan]
  );
  const texts = useMemo(() => gateTexts(page), [page]);
  const gatingKey = Object.keys(plan).join(",");
  const [{ statuses, unlockOrder }, setGates] = useState<IGateState>({ statuses: {}, unlockOrder: [] });

  useEffect(() => {
    if (!gatingKey) return;
    const gatingRefIds = gatingKey.split(",");
    setGates({ statuses: Object.fromEntries(gatingRefIds.map(refId => [refId, "loading" as GateStatus])), unlockOrder: [] });
    const report = (refId: string, hasSavedState: boolean) => setGates(prev => {
      const status = prev.statuses[refId] ?? "loading";
      const next = nextGateStatus(status, hasSavedState);
      return {
        statuses: { ...prev.statuses, [refId]: next },
        unlockOrder: next === "unlockedDuringVisit" && status !== next ? [...prev.unlockOrder, refId] : prev.unlockOrder
      };
    });
    // A gate whose answer cannot be read shows as locked, so its questions are explained rather than stuck loading.
    const unsubscribes = gatingRefIds.map(refId => watchAnswer(
      refId,
      wrappedAnswer => report(refId, wrappedAnswer?.interactiveState != null),
      error => {
        console.warn(`Could not read the saved state of ${refId}: ${error.message}`);
        report(refId, false);
      }
    ));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [gatingKey]);

  const textsOf = useCallback((refId: string) => texts[refId] ?? kUnnamedGateTexts, [texts]);

  const value = useMemo((): IDisabledQuestions => {
    const statusOf = (refId: string) => statuses[refId] ?? "loading";
    const locks: Record<string, IQuestionLock> = {};
    const bannerGates = new Map<string, string[]>();
    const tabGates = new Map<SectionType, string[]>();
    Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
      const status = statusOf(gatingRefId);
      const isLocked = status === "locked";
      const gateTabs = tabs[gatingRefId] ?? [];
      gateTabs.forEach(tab => tabGates.set(tab, [...(tabGates.get(tab) ?? []), gatingRefId]));
      const firstInTabWithBanner = gateTabs.some(tab => tab.embeddables.some(e => e.ref_id === questionRefIds[0]));
      if (questionRefIds.length > 0 && !firstInTabWithBanner) {
        bannerGates.set(questionRefIds[0], [...(bannerGates.get(questionRefIds[0]) ?? []), gatingRefId]);
      }
      questionRefIds.forEach(refId => {
        const lock = locks[refId] ?? { ...kUnlocked };
        lock.disabled = lock.disabled || isSettling(status) || isLocked;
        lock.locked = lock.locked || isLocked;
        locks[refId] = lock;
      });
    });
    const bannerOf = (gatingRefIds: string[]) => combineBanner(gatingRefIds, statusOf, unlockOrder, textsOf);
    bannerGates.forEach((gatingRefIds, refId) => {
      const banner = bannerOf(gatingRefIds);
      if (banner) locks[refId].banner = banner;
    });
    const tabBanners = new Map<SectionType, IBanner | undefined>();
    tabGates.forEach((gatingRefIds, tab) => tabBanners.set(tab, bannerOf(gatingRefIds)));
    return {
      getLock: (refId: string) => locks[refId] ?? kUnlocked,
      getTabBanner: (section: SectionType) => tabBanners.get(section)
    };
  }, [plan, tabs, statuses, unlockOrder, textsOf]);

  // A banner can sit in a hidden notebook tab or a collapsed column, so unlocks are announced from here.
  const announced = unlockOrder.filter(refId => (plan[refId]?.length ?? 0) > 0);

  return (
    <DisabledQuestionsContext.Provider value={value}>
      {children}
      {gatingKey &&
        <div className="disabled-questions-announcer" role="status" data-cy="disabled-questions-announcer">
          {announced.length > 0 &&
            <span key={announced.length}>{textsOf(announced[announced.length - 1]).unlocked}</span>}
        </div>
      }
    </DisabledQuestionsContext.Provider>
  );
};
