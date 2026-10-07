import React, { useContext, useEffect, useMemo, useState } from "react";
import { Page, SectionType } from "../../types";
import { watchAnswer } from "../../firebase-db";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { queryValue } from "../../utilities/url-query";
import { isOfferingLocked } from "../../utilities/portal-data-utils";
import { PortalDataContext } from "../portal-data-context";
import {
  GateStatus, kDisableQuestionsAfterParam, nextGateStatus, parseQuestionGatingParam, planDisabledQuestions, planTabBanners
} from "../../utilities/disabled-questions";

export type BannerState = "locked" | "unlocked";

export interface IQuestionLock {
  /** Out of reach of pointer, keyboard and assistive technology. */
  disabled: boolean;
  /** Shown grayed out with its heading marked locked. False while the gate is still loading. */
  locked: boolean;
  /** Set on the first question a gating item disables, unless a notebook tab banner covers it. */
  banner?: BannerState;
}

const kUnlocked: IQuestionLock = { disabled: false, locked: false };

// queryValue throws on a repeated parameter, which would unmount the page during render.
const readQuestionGatingSettings = () => {
  try {
    return parseQuestionGatingParam(queryValue(kDisableQuestionsAfterParam));
  } catch (e) {
    console.warn(`Ignoring ${kDisableQuestionsAfterParam}: ${e}`);
    return {};
  }
};

const bannerFor = (status: GateStatus): BannerState | undefined =>
  status === "locked" ? "locked" : status === "unlockedDuringVisit" ? "unlocked" : undefined;

interface IDisabledQuestions {
  getLock: (refId: string) => IQuestionLock;
  getTabBanner: (section: SectionType) => BannerState | undefined;
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
    () => active ? planDisabledQuestions(page, activityLayout, readQuestionGatingSettings()) : {},
    [active, page, activityLayout]
  );
  const tabs = useMemo(
    () => activityLayout === ActivityLayouts.Notebook ? planTabBanners(page, plan) : {},
    [activityLayout, page, plan]
  );
  const gatingKey = Object.keys(plan).join(",");
  const [statuses, setStatuses] = useState<Record<string, GateStatus>>({});

  useEffect(() => {
    if (!gatingKey) return;
    const gatingRefIds = gatingKey.split(",");
    setStatuses(Object.fromEntries(gatingRefIds.map(refId => [refId, "loading" as GateStatus])));
    const unsubscribes = gatingRefIds.map(refId => watchAnswer(refId, wrappedAnswer => {
      const hasSavedState = wrappedAnswer?.interactiveState != null;
      setStatuses(prev => ({ ...prev, [refId]: nextGateStatus(prev[refId] ?? "loading", hasSavedState) }));
    }));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [gatingKey]);

  const value = useMemo((): IDisabledQuestions => {
    const locks: Record<string, IQuestionLock> = {};
    const tabStatuses = new Map<SectionType, GateStatus[]>();
    Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
      const status = statuses[gatingRefId] ?? "loading";
      const isLoading = status === "loading";
      const isLocked = status === "locked";
      const gateTabs = tabs[gatingRefId] ?? [];
      gateTabs.forEach(tab => tabStatuses.set(tab, [...(tabStatuses.get(tab) ?? []), status]));
      const firstInTabWithBanner = gateTabs.some(tab => tab.embeddables.some(e => e.ref_id === questionRefIds[0]));
      questionRefIds.forEach((refId, index) => {
        const lock = locks[refId] ?? { ...kUnlocked };
        lock.disabled = lock.disabled || isLoading || isLocked;
        lock.locked = lock.locked || isLocked;
        if (index === 0 && !firstInTabWithBanner) {
          lock.banner = bannerFor(status) ?? lock.banner;
        }
        locks[refId] = lock;
      });
    });
    const tabBanners = new Map<SectionType, BannerState | undefined>();
    tabStatuses.forEach((tabGateStatuses, tab) => {
      tabBanners.set(tab, tabGateStatuses.includes("locked")
        ? "locked"
        : tabGateStatuses.includes("unlockedDuringVisit") ? "unlocked" : undefined);
    });
    return {
      getLock: (refId: string) => locks[refId] ?? kUnlocked,
      getTabBanner: (section: SectionType) => tabBanners.get(section)
    };
  }, [plan, tabs, statuses]);

  return <DisabledQuestionsContext.Provider value={value}>{children}</DisabledQuestionsContext.Provider>;
};
