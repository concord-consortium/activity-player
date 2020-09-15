import { v4 as uuidv4 } from "uuid";
import { IAuthoringMetadata, IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import { IExportableAnswerMetadata, IManagedInteractive, IReportState, IExportableMultipleChoiceAnswerMetadata, IExportableOpenResponseAnswerMetadata, IExportableInteractiveAnswerMetadata } from "../types";

export const getAnswerWithMetadata = (
    interactiveState: IRuntimeMetadata,
    embeddable: IManagedInteractive,
    oldAnswerMeta?: IExportableAnswerMetadata): (IExportableAnswerMetadata | void) => {

  if (!embeddable.authored_state) return;

  const authoredState = JSON.parse(embeddable.authored_state) as IAuthoringMetadata;
  const reportState: IReportState = {
    mode: "report",
    authoredState: embeddable.authored_state,
    interactiveState: JSON.stringify(interactiveState)
  };
  if ((authoredState as any).version) {
    reportState.version = (authoredState as any).version;
  }

  const reportStateJSON = JSON.stringify(reportState);

  const exportableAnswerBase = {
    remote_endpoint: "",
    question_id: refIdToAnswersQuestionId(embeddable.ref_id),
    question_type: authoredState.questionType,
    id: oldAnswerMeta ? oldAnswerMeta.id : uuidv4(),
    type: interactiveState.answerType,
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
