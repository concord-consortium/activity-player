import { v4 as uuidv4 } from "uuid";
import {
  IExportableAnswerMetadata, IManagedInteractive, IReportState, IExportableMultipleChoiceAnswerMetadata,
  IExportableOpenResponseAnswerMetadata, IExportableInteractiveAnswerMetadata, IExportableImageQuestionAnswerMetadata,
  Embeddable
} from "../types";
import { getPortalData } from "../firebase-db";

export const isQuestion = (embeddable: Embeddable) =>
  (embeddable.type === "ManagedInteractive" && embeddable.library_interactive?.data?.enable_learner_state) ||
  (embeddable.type === "MwInteractive" && embeddable.enable_learner_state);

// LARA uses a map from the answer type to a question type.
// Instead of using this map, we look directly at the authoredState this ought to give us more
// flexibility to support more special types in the report without needing to update
// the activity player
export const questionType = (rawAuthoredState: string | null | undefined): string => {
  if (!rawAuthoredState) {
    return "iframe_interactive";
  }

  // There is a IAuthoringMetadata type, but because we don't know if this has
  // valid authored state or not, that type isn't not used here.
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

export const remoteEndpoint = (): string => {
  const portalData = getPortalData();
  if (!portalData) {
    return "";
  }

  // This is a way to verify the portalData is of type IPortalData
  if (portalData.type === "authenticated") {
    return portalData.runRemoteEndpoint;
  }

  return "";
};

export const getAnswerWithMetadata = (
    interactiveState: any,
    embeddable: IManagedInteractive,
    oldAnswerMeta?: IExportableAnswerMetadata): (IExportableAnswerMetadata | void) => {

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

  if (interactiveState === null) {
    // All of the code below reads properties from the interactiveState if it
    // a string or a boolean, those properties just return undefined
    // It is null, reading those properies throws and exception.
    // This conversion to {} happens after the reportState, that way the null
    // value will still be saved into the report-service
    interactiveState = {};
  }

  // This follows the way LARA generates answers for the report-service
  // https://github.com/concord-consortium/lara/blob/0cf1de2d45dc35c2f6138a917fb480a0fffe050e/app/models/interactive_run_state.rb#L122
  const exportableAnswerBase = {
    version: 1,
    id: oldAnswerMeta ? oldAnswerMeta.id : uuidv4(),
    // In LARA there is also the ability to have "external_link" type
    // if the interactive has a report_url. The AP doesn't support report_url
    // interactives.
    type: interactiveState.answerType || "interactive_state",
    question_id: refIdToAnswersQuestionId(embeddable.ref_id),
    question_type: questionType(embeddable.authored_state),
    // In LARA this value will be set to null if it isn't in the interactiveState
    // Here it will be set to undefined, which means it won't be sent up to
    // firestore
    answer_text: interactiveState.answerText,
    submitted: typeof interactiveState.submitted === "boolean" ? interactiveState.submitted : null,
    report_state: reportStateJSON
  };

  // from https://github.com/concord-consortium/lara/blob/c40304a14ef495acdf4f9fd09ea892c7cc98247b/app/models/interactive_run_state.rb#L139
  let exportableAnswer;
  if (interactiveState.answerType === "multiple_choice_answer") {
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: {
        choice_ids: interactiveState.selectedChoiceIds
      }
    } as IExportableMultipleChoiceAnswerMetadata;
  } else if (interactiveState.answerType === "open_response_answer") {
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: interactiveState.answerText
    } as IExportableOpenResponseAnswerMetadata;
  } else if (interactiveState.answerType === "image_question_answer") {
    exportableAnswer = {
      ...exportableAnswerBase,
      answer: {
        text: interactiveState.answerText,
        image_url: interactiveState.answerImageUrl
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
