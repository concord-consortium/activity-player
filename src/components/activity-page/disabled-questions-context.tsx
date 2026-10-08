import React, { useContext, useMemo, useRef, useState } from "react";
import { Page, SectionType } from "../../types";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { queryValue } from "../../utilities/url-query";
import { isOfferingLocked } from "../../utilities/portal-data-utils";
import { PortalDataContext } from "../portal-data-context";
import {
  applyGateEvent, combineBanner, GateEvent, gateTexts, IBanner, IGateState, isSettling, kDisableQuestionsAfterParam,
  planDisabledQuestions, planTabBanners, questionGatingSettings
} from "../../utilities/disabled-questions";

export interface IQuestionLock {
  /** Out of reach of pointer, keyboard and assistive technology, except for its heading. */
  disabled: boolean;
  /** Shown grayed out with its heading marked locked. False while the gate is still settling (loading or awaiting a restored unlock). */
  locked: boolean;
  /** Set on the first question a gating item disables, unless a notebook tab banner covers it. */
  banner?: IBanner;
}

const kUnlocked: IQuestionLock = { disabled: false, locked: false };

const kNoGates: IGateState = { statuses: {}, unlockOrder: [] };

// queryValue throws on a repeated parameter, which would unmount the page during render.
const readQuestionGatingSettings = (page: Page) => {
  try {
    return questionGatingSettings(page, queryValue(kDisableQuestionsAfterParam));
  } catch (e) {
    console.warn(`Ignoring ${kDisableQuestionsAfterParam}: ${e}`);
    return questionGatingSettings(page, undefined);
  }
};

type GateReporter = (event: GateEvent) => void;

interface IDisabledQuestions {
  getLock: (refId: string) => IQuestionLock;
  getTabBanner: (section: SectionType) => IBanner | undefined;
  getGateReporter: (refId: string) => GateReporter | undefined;
}

const DisabledQuestionsContext = React.createContext<IDisabledQuestions>({
  getLock: () => kUnlocked,
  getTabBanner: () => undefined,
  getGateReporter: () => undefined
});

export const useQuestionLock = (refId: string) => useContext(DisabledQuestionsContext).getLock(refId);

export const useTabBanner = (section: SectionType) => useContext(DisabledQuestionsContext).getTabBanner(section);

/** Undefined unless the item is a gate on the current page. */
export const useQuestionGateReporter = (refId: string) => useContext(DisabledQuestionsContext).getGateReporter(refId);

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
  const [{ statuses, unlockOrder }, setGates] = useState(kNoGates);
  // Reporters read the latest state here, since a gate's events can arrive before React re-renders.
  const gatesRef = useRef(kNoGates);

  const reporters = useMemo(() => {
    const warnUndeclared = (refId: string) => {
      const name = page.sections.flatMap(section => section.embeddables).find(e => e.ref_id === refId)?.name;
      console.warn(`The question gate ${refId} ("${name ?? ""}") never declared question-gating support, so it locks nothing.`);
    };
    return Object.fromEntries(gatingKey.split(",").filter(Boolean).map(refId => [refId, (event: GateEvent) => {
      const prev = gatesRef.current;
      const next = applyGateEvent(prev, refId, event);
      if (next === prev) return;
      gatesRef.current = next;
      setGates(next);
      if (event.type === "declarationWindowEnded") warnUndeclared(refId);
    }]));
  }, [gatingKey, page]);

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
    const bannerOf = (gatingRefIds: string[]) => combineBanner(gatingRefIds, statusOf, unlockOrder, refId => texts[refId]);
    bannerGates.forEach((gatingRefIds, refId) => {
      const banner = bannerOf(gatingRefIds);
      if (banner) locks[refId].banner = banner;
    });
    const tabBanners = new Map<SectionType, IBanner | undefined>();
    tabGates.forEach((gatingRefIds, tab) => tabBanners.set(tab, bannerOf(gatingRefIds)));
    return {
      getLock: (refId: string) => locks[refId] ?? kUnlocked,
      getTabBanner: (section: SectionType) => tabBanners.get(section),
      getGateReporter: (refId: string) => reporters[refId]
    };
  }, [plan, tabs, statuses, unlockOrder, texts, reporters]);

  // A banner can sit in a hidden notebook tab or a collapsed column, so unlocks are announced from here.
  const announced = unlockOrder.filter(refId => (plan[refId]?.length ?? 0) > 0);

  return (
    <DisabledQuestionsContext.Provider value={value}>
      {children}
      {gatingKey &&
        <div className="disabled-questions-announcer" role="status" data-cy="disabled-questions-announcer">
          {announced.length > 0 &&
            <span key={announced.length}>{texts[announced[announced.length - 1]].unlocked}</span>}
        </div>
      }
    </DisabledQuestionsContext.Provider>
  );
};
