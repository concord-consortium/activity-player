import { IRuntimeMetadata, IRuntimeInteractiveMetadata, IRuntimeMultipleChoiceMetadata } from "@concord-consortium/lara-interactive-api";
import { answersQuestionIdToRefId, refIdToAnswersQuestionId, getAnswerWithMetadata } from "./embeddable-utils";
import { DefaultManagedInteractive } from "../test-utils/model-for-tests";
import {
  IManagedInteractive,
  IExportableOpenResponseAnswerMetadata,
  IExportableInteractiveAnswerMetadata,
  IExportableAnswerMetadata,
  IExportableImageQuestionAnswerMetadata
} from "../types";

describe("Embeddable utility functions", () => {
  it("correctly converts from answer's question-id to ref_id", () => {
    expect(answersQuestionIdToRefId("managed_interactive_123")).toBe("123-ManagedInteractive");
    expect(answersQuestionIdToRefId("mw_interactive_123")).toBe("123-MwInteractive");
    expect(answersQuestionIdToRefId("123-NotSnakeCase")).toBe("123-NotSnakeCase");
  });

  it("correctly converts from ref_id to answer's question-id", () => {
    expect(refIdToAnswersQuestionId("123-ManagedInteractive")).toBe("managed_interactive_123");
    expect(refIdToAnswersQuestionId("123-MwInteractive")).toBe("mw_interactive_123");
    expect(refIdToAnswersQuestionId("not_camel_Case_123")).toBe("not_camel_Case_123");
  });

  it("can create an exportable answer for an open response embeddable", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMetadata = {
      answerType: "open_response_answer",
      answerText: "test"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableOpenResponseAnswerMetadata;

    expect(exportableAnswer).toBeDefined();

    expect(exportableAnswer.remote_endpoint).toBe("");
    expect(exportableAnswer.question_id).toBe("managed_interactive_123");
    expect(exportableAnswer.question_type).toBe("open_response");
    expect(exportableAnswer.id).toBeDefined();          // random uuid
    expect(exportableAnswer.type).toBe("open_response_answer");
    expect(exportableAnswer.answer_text).toBe("test");
    expect(exportableAnswer.answer).toBe("test");
    expect(exportableAnswer.submitted).toBeNull();
    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
      interactiveState: `{"answerType":"open_response_answer","answerText":"test"}`,
      version: 1
    });
    expect(exportableAnswer.report_state).toBe(expectedReport);
  });

  it("can create an exportable answer for an image question embeddable", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"image_question","prompt":"<p>Write something:</p>"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMetadata = {
      answerType: "image_question_answer",
      answerText: "test",
      answerImageUrl: "http://test.snapshot.com"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableImageQuestionAnswerMetadata;

    expect(exportableAnswer).toBeDefined();

    expect(exportableAnswer.remote_endpoint).toBe("");
    expect(exportableAnswer.question_id).toBe("managed_interactive_123");
    expect(exportableAnswer.question_type).toBe("image_question");
    expect(exportableAnswer.id).toBeDefined();          // random uuid
    expect(exportableAnswer.type).toBe("image_question_answer");
    expect(exportableAnswer.answer_text).toBe("test");
    expect(exportableAnswer.answer).toEqual({
      text: "test",
      image_url: "http://test.snapshot.com"
    });
    expect(exportableAnswer.submitted).toBeNull();
    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState: `{"version":1,"questionType":"image_question","prompt":"<p>Write something:</p>"}`,
      interactiveState: `{"answerType":"image_question_answer","answerText":"test","answerImageUrl":"http://test.snapshot.com"}`,
      version: 1
    });
    expect(exportableAnswer.report_state).toBe(expectedReport);
  });

  it("can create an exportable answer for a generic interactive embeddable", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"my_question_type"}`
    };

    interface IInteractiveState extends IRuntimeInteractiveMetadata {
      myState: string;
    }
    const interactiveState: IInteractiveState = {
      answerType: "interactive_state",
      myState: "<state />"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableInteractiveAnswerMetadata;

    expect(exportableAnswer.question_type).toBe("my_question_type");
    expect(exportableAnswer.type).toBe("interactive_state");
    expect(exportableAnswer.answer_text).toBeUndefined();
    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState: `{"version":1,"questionType":"my_question_type"}`,
      interactiveState: `{"answerType":"interactive_state","myState":"<state />"}`,
      version: 1
    });
    expect(exportableAnswer.report_state).toBe(expectedReport);
    expect(exportableAnswer.answer).toBe(expectedReport);
  });

  it("can create an exportable answer for a submittable multiple choice embeddable", () => {
    const authoredState = `{"version":1,"questionType":"multiple_choice","choices":[{"id":"1","content":"A","correct":false},{"id":"2","content":"B","correct":false}],"prompt":""}`;
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: authoredState
    };

    const interactiveState: IRuntimeMultipleChoiceMetadata = {
      answerType: "multiple_choice_answer",
      selectedChoiceIds: ["1"]
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableInteractiveAnswerMetadata;

    expect(exportableAnswer.question_type).toBe("multiple_choice");
    expect(exportableAnswer.type).toBe("multiple_choice_answer");
    expect(exportableAnswer.answer_text).toBeUndefined();
    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState,
      interactiveState: `{"answerType":"multiple_choice_answer","selectedChoiceIds":["1"]}`,
      version: 1
    });
    expect(exportableAnswer.report_state).toBe(expectedReport);
    expect(exportableAnswer.answer).toStrictEqual({"choice_ids": ["1"]});
  });

  it("can create an exportable answer, keeping the id of an existing answer meta", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMetadata = {
      answerType: "open_response_answer",
      answerText: "test"
    };

    const originalAnswer: IExportableAnswerMetadata = {
      type: "open_response_answer",
      remote_endpoint: "",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      id: "open_response_answer_123",
      submitted: null,
      report_state: "",
      answer: ""
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable, originalAnswer) as IExportableOpenResponseAnswerMetadata;

    expect(exportableAnswer.id).toBe("open_response_answer_123");
  });

  it("can create an exportable answer when authored state is empty", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: "",
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMetadata = {
      answerType: "open_response_answer",
      answerText: "test"
    };

    const originalAnswer: IExportableAnswerMetadata = {
      type: "open_response_answer",
      remote_endpoint: "",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      id: "open_response_answer_123",
      submitted: null,
      report_state: "",
      answer: ""
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable, originalAnswer) as IExportableOpenResponseAnswerMetadata;

    expect(exportableAnswer.id).toBe("open_response_answer_123");
  });
});
