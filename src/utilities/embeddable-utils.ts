import { v4 as uuidv4 } from "uuid";
import { IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import {
  IExportableAnswerMetadata, IReportState, IExportableMultipleChoiceAnswerMetadata,
  IExportableOpenResponseAnswerMetadata, IExportableInteractiveAnswerMetadata, IExportableImageQuestionAnswerMetadata,
  EmbeddableType, Activity, Page
} from "../types";
import { ILaraData } from "../components/lara-data-context";

export type LegacyLinkedRefMap = Record<string, {
  activity: Activity;
  page: Page;
  linkedRefId: string | undefined;
} | undefined>;

export interface IInteractiveInfo {
  activityName: string;
  pageNumber: number;
  pageName?: string;
}

export const isQuestion = (embeddable: EmbeddableType) =>
  (embeddable.type === "ManagedInteractive" && embeddable.library_interactive?.data?.enable_learner_state) ||
  (embeddable.type === "MwInteractive" && embeddable.enable_learner_state);

export const hasLegacyLinkedInteractive = (embeddable: Embeddable, laraData: ILaraData) => {
  let result = false;
  if ((embeddable.type === "ManagedInteractive") || (embeddable.type === "MwInteractive")) {
    result = !!getLegacyLinkedRefMap(laraData)[embeddable.ref_id]?.linkedRefId;
  }
  return result;
};

// LARA uses a map from the answer type to a question type.
// Instead of using this map, we look directly at the authoredState this ought to give us more
// flexibility to support more special types in the report without needing to update
// the activity player
export const questionType = (rawAuthoredState: string | null | undefined): string => {
  if (!rawAuthoredState) {
    return "iframe_interactive";
  }

  // There is a IAuthoringMetadata type, but because we don't know if this has
  // valid authored state or not, that type isn't used here.
  let authoredState: any = {};
  try {
    authoredState = JSON.parse(rawAuthoredState);
  } catch (e) {
    // this isn't valid JSON, so we use the default value of {} for the authored state
  }

  if (!authoredState.questionType) {
    return "iframe_interactive";
  }

  return authoredState.questionType as string;
};

export const getAnswerWithMetadata = (
    interactiveState: unknown,
    embeddable: {ref_id: string, authored_state?: string | null},
    oldAnswerMeta?: IExportableAnswerMetadata): IExportableAnswerMetadata => {

  const reportState: IReportState = {
    mode: "report",
    // LARA just stores the raw authored_state, if it is null that is passed right
    // through,  Here authoredState will be converted into ""
    // There might be some issues with this if an interactive wants to have null
    // or false for its authored_state. But I don't know of any yet.
    authoredState: embeddable.authored_state || "",
    // If the interactive state is a string instead of an object
    // JSON.stringify will quote it a second time, so JSON.parse will return the string again.
    // This seems to work fine for how the AP loads it back into the interactive
    // LARA also seems to be storing the interactiveState as a JSON string and that
    // JSON string is what is used in the reportState
    interactiveState: JSON.stringify(interactiveState),
    version: 1
  };

  const reportStateJSON = JSON.stringify(reportState);

  let interactiveStateMetadata: IRuntimeMetadata;
  // Since an interactive can send us anything, we only expect it to have
  // its own metadata if it is an object like {}
  if (interactiveState === null
      || typeof interactiveState !== "object"
      || Array.isArray(interactiveState)) {
    // If we know the interactiveState won't have any metadata then we just
    // create a separate simple metadata object
    interactiveStateMetadata = {answerType: "interactive_state"};
  } else {
    // It is common that an interactive will send an interactiveState that is an object
    // but it doesn't have an answerType. It is possible the interactive provides other
    // metadata like answerText, or submitted.

    // We cast it here to IRuntimeMetadata, but the code below checks the answerType
    // with: interactiveStateMetadata.answerType || "interactive_state"
    // This is hacky but it is the best approach I could come up with for now
    interactiveStateMetadata = interactiveState as IRuntimeMetadata;
  }

  // This follows the way LARA generates answers for the report-service
  // https://github.com/concord-consortium/lara/blob/0cf1de2d45dc35c2f6138a917fb480a0fffe050e/app/models/interactive_run_state.rb#L122
  const exportableAnswerBase = {
    version: 1,
    id: oldAnswerMeta ? oldAnswerMeta.id : uuidv4(),
    // In LARA there is also the ability to have "external_link" type
    // if the interactive has a report_url. The AP doesn't support report_url
    // interactives.
    type: interactiveStateMetadata.answerType || "interactive_state",
    question_id: refIdToAnswersQuestionId(embeddable.ref_id),
    question_type: questionType(embeddable.authored_state),
    // In LARA this value will be set to null if it isn't in the interactiveState
    // Here it will be set to undefined, which means it won't be sent up to
    // firestore
    answer_text: interactiveStateMetadata.answerText,
    submitted: typeof interactiveStateMetadata.submitted === "boolean" ? interactiveStateMetadata.submitted : null,
    report_state: reportStateJSON
  };

  // from https://github.com/concord-consortium/lara/blob/c40304a14ef495acdf4f9fd09ea892c7cc98247b/app/models/interactive_run_state.rb#L139
  let exportableAnswer;
  if (interactiveStateMetadata.answerType === "multiple_choice_answer") {
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: {
        choice_ids: interactiveStateMetadata.selectedChoiceIds
      }
    } as IExportableMultipleChoiceAnswerMetadata;
  } else if (interactiveStateMetadata.answerType === "open_response_answer") {
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: interactiveStateMetadata.answerText
    } as IExportableOpenResponseAnswerMetadata;
  } else if (interactiveStateMetadata.answerType === "image_question_answer") {
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: {
        text: interactiveStateMetadata.answerText,
        image_url: interactiveStateMetadata.answerImageUrl
      }
    } as IExportableImageQuestionAnswerMetadata;
  } else {
    // note we don't current support has_report_url
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: reportStateJSON
    } as IExportableInteractiveAnswerMetadata;
  }

  return exportableAnswer;
};

/**
 * Embeddables are coming through with `refId`'s such as "404-ManagedInteractive", while answers
 * are coming through with `question_id`'s such as "managed_interactive_404".
 *
 * See https://www.pivotaltracker.com/n/projects/736901/stories/174065787
 *
 * This transforms the answer's version to the embeddable's version.
 * "managed_interactive_404" => "404-ManagedInteractive"
 */
export const answersQuestionIdToRefId = (questionId: string) => {
  const snakeCaseRegEx = /(\D*)_(\d*)/g;
  const parsed = snakeCaseRegEx.exec(questionId);
  if (parsed?.length) {
    const [ , embeddableType, embeddableId] = parsed;
    const camelCased = embeddableType.split("_").map(str => str.charAt(0).toUpperCase() + str.slice(1)).join("");
    return `${embeddableId}-${camelCased}`;
  }
  return questionId;
};

/**
 * "404-ManagedInteractive" => "managed_interactive_404"
 */
export const refIdToAnswersQuestionId = (refId: string) => {
  const refIdRegEx = /(\d*)-(\D*)/g;
  const parsed = refIdRegEx.exec(refId);
  if (parsed?.length) {
    const [ , embeddableId, embeddableType] = parsed;
    const snakeCased = embeddableType.replace(/(?!^)([A-Z])/g, "_$1").toLowerCase();
    return `${snakeCased}_${embeddableId}`;
  }
  return refId;
};

// cache exported so it can be checked in tests
export const legacyLinkedRefMapCache = new WeakMap<ILaraData, LegacyLinkedRefMap>();

export const getLegacyLinkedRefMap = (laraData: ILaraData): LegacyLinkedRefMap => {
  // cache this as it is called on each render
  const cachedLinkedRefMap = legacyLinkedRefMapCache.get(laraData);
  if (cachedLinkedRefMap) {
    return cachedLinkedRefMap;
  }

  const gatherLinkedRefs = (activity: Activity) => {
    activity.pages.forEach(page => {
      page.embeddables.forEach(item => {
        const {embeddable} = item;
        if ((embeddable.type === "ManagedInteractive") || (embeddable.type === "MwInteractive")) {
          linkedRefMap[embeddable.ref_id] = {
            activity,
            page,
            linkedRefId: embeddable.linked_interactive?.ref_id
          };
        }
      });
    });
  };

  const linkedRefMap: LegacyLinkedRefMap = {};

  if (laraData.sequence) {
    laraData.sequence.activities.forEach(gatherLinkedRefs);
  } else if (laraData.activity) {
    gatherLinkedRefs(laraData.activity);
  }

  legacyLinkedRefMapCache.set(laraData, linkedRefMap);

  return linkedRefMap;
};

export const getInteractiveInfo = (laraData: ILaraData, embeddableRefId: string): IInteractiveInfo | undefined => {
  let interactiveInfo: IInteractiveInfo | undefined = undefined;

  const findInteractiveInfo = (activity: Activity) => {
    activity.pages.forEach(page => {
      page.embeddables.forEach(item => {
        const {embeddable} = item;
        if (embeddable.ref_id === embeddableRefId) {
          interactiveInfo = {
            activityName: activity.name,
            pageName: page.name === null ? undefined : page.name,
            pageNumber: page.position
          };
        }
      });
    });
  };

  if (laraData.sequence) {
    laraData.sequence.activities.forEach(findInteractiveInfo);
  } else if (laraData.activity) {
    findInteractiveInfo(laraData.activity);
  }

  return interactiveInfo;
};
