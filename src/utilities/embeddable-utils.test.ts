import { IRuntimeMetadata, IRuntimeMultipleChoiceMetadata } from "@concord-consortium/lara-interactive-api";
import { answersQuestionIdToRefId, refIdToAnswersQuestionId, getAnswerWithMetadata, getLegacyLinkedRefMap, hasLegacyLinkedInteractive, legacyLinkedRefMapCache, getInteractiveInfo } from "./embeddable-utils";
import { DefaultManagedInteractive } from "../test-utils/model-for-tests";
import {
  IManagedInteractive,
  IExportableOpenResponseAnswerMetadata,
  IExportableInteractiveAnswerMetadata,
  IExportableAnswerMetadata,
  IExportableImageQuestionAnswerMetadata,
  Activity,
  Sequence
} from "../types";

import _activity1 from "../data/version-2/sample-new-sections-activity-1.json";
import _legacyLinkedInteractiveActivity from "../data/version-2/sample-new-sections-legacy-linked-interactives.json";
import _sequenceWithQuestions from "../data/version-2/sample-new-sections-sequence-with-questions.json";
const activity1 = _activity1 as Activity;
const legacyLinkedInteractiveActivity = _legacyLinkedInteractiveActivity as Activity;
const sequenceWithQuestions = _sequenceWithQuestions as Sequence;

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

    expect(exportableAnswer.id).toBeDefined();          // random uuid
    // overwrite this id so we can do a full equals test below without a random value
    exportableAnswer.id = "overwritten-answer-id";

    expect(exportableAnswer).toEqual({
      version: 1,
      id: "overwritten-answer-id",
      type: "open_response_answer",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      answer_text: "test",
      answer: "test",
      submitted: null,
      report_state: JSON.stringify({
        mode: "report",
        authoredState: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
        interactiveState: `{"answerType":"open_response_answer","answerText":"test"}`,
        interactive: {id: "123-ManagedInteractive", name: ""},
        version: 1
      })
    });
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

    expect(exportableAnswer.id).toBeDefined();          // random uuid
    // overwrite this id so we can do a full equals test below without a random value
    exportableAnswer.id = "overwritten-answer-id";

    expect(exportableAnswer).toEqual({
      version: 1,
      id: "overwritten-answer-id",
      type: "image_question_answer",
      question_id: "managed_interactive_123",
      question_type: "image_question",
      answer_text: "test",
      answer: {
        text: "test",
        image_url: "http://test.snapshot.com"
      },
      submitted: null,
      report_state: JSON.stringify({
        mode: "report",
        authoredState: `{"version":1,"questionType":"image_question","prompt":"<p>Write something:</p>"}`,
        interactiveState: `{"answerType":"image_question_answer","answerText":"test","answerImageUrl":"http://test.snapshot.com"}`,
        interactive: {id: "123-ManagedInteractive", name: ""},
        version: 1
      })
    });
  });

  it("can create an exportable answer for a submittable multiple choice embeddable", () => {
    const authoredState = `{"version":1,"questionType":"multiple_choice","choices":[{"id":"1","content":"A","correct":false},{"id":"2","content":"B","correct":false}],"prompt":""}`;
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: authoredState,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMultipleChoiceMetadata = {
      answerType: "multiple_choice_answer",
      selectedChoiceIds: ["1"]
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableInteractiveAnswerMetadata;

    expect(exportableAnswer.id).toBeDefined();          // random uuid
    // overwrite this id so we can do a full equals test below without a random value
    exportableAnswer.id = "overwritten-answer-id";

    expect(exportableAnswer).toEqual({
      version: 1,
      id: "overwritten-answer-id",
      type: "multiple_choice_answer",
      question_id: "managed_interactive_123",
      question_type: "multiple_choice",
      answer_text: undefined,
      report_state: JSON.stringify({
        mode: "report",
        authoredState,
        interactiveState: `{"answerType":"multiple_choice_answer","selectedChoiceIds":["1"]}`,
        interactive: {id: "123-ManagedInteractive", name: ""},
        version: 1
      }),
      answer: {"choice_ids": ["1"]},
      submitted: null
    });
  });

  const testGenericInteractive = (interactiveState: any) => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: "",
      ref_id: "123-ManagedInteractive"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableInteractiveAnswerMetadata;

    expect(exportableAnswer.id).toBeDefined();          // random uuid
    // overwrite this id so we can do a full equals test below without a random value
    exportableAnswer.id = "overwritten-answer-id";

    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState: "",
      interactiveState: JSON.stringify(interactiveState),
      interactive: {id: "123-ManagedInteractive", name: ""},
      version: 1
    });

    expect(exportableAnswer).toEqual({
      version: 1,
      id: "overwritten-answer-id",
      type: "interactive_state",
      question_id: "managed_interactive_123",
      question_type: "iframe_interactive",
      answer_text: undefined,
      report_state: expectedReport,
      answer: expectedReport,
      submitted: null
    });
  };

  it("can create an exportable answer for a generic interactive without authored state and no meta data", () => {
    testGenericInteractive({myState: "<state />"});
  });

  it("can create an exportable answer for a generic interactive that uses a string for its state", () => {
    testGenericInteractive("<state />");
  });

  it("can create an exportable answer for a generic interactive that saves '' for its state", () => {
    testGenericInteractive("");
  });

  it("can create an exportable answer for a generic interactive that saves false for its state", () => {
    testGenericInteractive(false);
  });

  it("can create an exportable answer for a generic interactive that saves 0 for its state", () => {
    testGenericInteractive(0);
  });

  it("can create an exportable answer for a generic interactive that saves a number for its state", () => {
    testGenericInteractive(1.876);
  });

  it("can create an exportable answer for a generic interactive that saves null for its state", () => {
    testGenericInteractive(null);
  });

  it("can create an exportable answer for a generic interactive embeddable with authored state", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: `{"myConfiguration": "something"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState = {
      myState: "<state />"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableInteractiveAnswerMetadata;

    expect(exportableAnswer.id).toBeDefined();          // random uuid
    // overwrite this id so we can do a full equals test below without a random value
    exportableAnswer.id = "overwritten-answer-id";

    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState: `{"myConfiguration": "something"}`,
      interactiveState: `{"myState":"<state />"}`,
      interactive: {id: "123-ManagedInteractive", name: ""},
      version: 1
    });

    expect(exportableAnswer).toEqual({
      version: 1,
      id: "overwritten-answer-id",
      type: "interactive_state",
      question_id: "managed_interactive_123",
      question_type: "iframe_interactive",
      answer_text: undefined,
      report_state: expectedReport,
      answer: expectedReport,
      submitted: null
    });
  });

  it("can create an exportable answer for a generic interactive embeddable with a custom question type", () => {
    const embeddable: IManagedInteractive = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"my_question_type"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState = {
      answerType: "my_question_type_answer",
      myState: "<state />"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableInteractiveAnswerMetadata;

    expect(exportableAnswer.id).toBeDefined();          // random uuid
    // overwrite this id so we can do a full equals test below without a random value
    exportableAnswer.id = "overwritten-answer-id";

    const expectedReport = JSON.stringify({
      mode: "report",
      authoredState: `{"version":1,"questionType":"my_question_type"}`,
      interactiveState: `{"answerType":"my_question_type_answer","myState":"<state />"}`,
      interactive: {id: "123-ManagedInteractive", name: ""},
      version: 1
    });

    expect(exportableAnswer).toEqual({
      version: 1,
      id: "overwritten-answer-id",
      type: "my_question_type_answer",
      question_id: "managed_interactive_123",
      question_type: "my_question_type",
      answer_text: undefined,
      report_state: expectedReport,
      answer: expectedReport,
      submitted: null
    });
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
      id: "open_response_answer_123",
      type: "open_response_answer",
      question_id: "managed_interactive_123",
      question_type: "open_response",
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
      id: "open_response_answer_123",
      type: "open_response_answer",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      submitted: null,
      report_state: "",
      answer: ""
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable, originalAnswer) as IExportableOpenResponseAnswerMetadata;

    expect(exportableAnswer.id).toBe("open_response_answer_123");
  });

  describe("#getLegacyLinkedRefMap", () => {
    it("can generate and cache an empty legacy linked ref map without data", () => {
      const laraData = {};
      expect(getLegacyLinkedRefMap(laraData)).toEqual({});
      expect(legacyLinkedRefMapCache.get(laraData)).toEqual({});
    });

    it("can generate and cache a legacy linked ref map with an activity with no linked refs", () => {
      const laraData = {activity: activity1};
      const map = getLegacyLinkedRefMap(laraData);
      expect(legacyLinkedRefMapCache.get(laraData)).toEqual(map);
      expect(Object.keys(map)).toEqual(["328-ManagedInteractive", "327-ManagedInteractive"]);
      expect(map["328-ManagedInteractive"]).not.toBeUndefined();
      expect(map["327-ManagedInteractive"]).not.toBeUndefined();
      expect(map["328-ManagedInteractive"]?.linkedRefId).toBeUndefined();
      expect(map["327-ManagedInteractive"]?.linkedRefId).toBeUndefined();
    });

    it("can generate and cache a legacy linked ref map with an activity with linked refs", () => {
      const laraData = {activity: legacyLinkedInteractiveActivity};
      const map = getLegacyLinkedRefMap(laraData);
      expect(legacyLinkedRefMapCache.get(laraData)).toEqual(map);
      expect(Object.keys(map)).toEqual([
        "319-ManagedInteractive","210507-MwInteractive","312-ManagedInteractive","313-ManagedInteractive",
        "352-ManagedInteractive","210508-MwInteractive","314-ManagedInteractive","315-ManagedInteractive",
        "331-ManagedInteractive","344-ManagedInteractive","340-ManagedInteractive","341-ManagedInteractive",
        "342-ManagedInteractive","339-ManagedInteractive","336-ManagedInteractive","337-ManagedInteractive",
        "316-ManagedInteractive","210510-MwInteractive","609-ManagedInteractive","640-ManagedInteractive",
        "366-ManagedInteractive","384-ManagedInteractive","367-ManagedInteractive","368-ManagedInteractive",
        "369-ManagedInteractive","370-ManagedInteractive","382-ManagedInteractive","383-ManagedInteractive",
        "371-ManagedInteractive","387-ManagedInteractive","372-ManagedInteractive","373-ManagedInteractive",
        "374-ManagedInteractive","375-ManagedInteractive","385-ManagedInteractive","386-ManagedInteractive"
      ]);
      expect(map["313-ManagedInteractive"]?.linkedRefId).toEqual("312-ManagedInteractive");
      expect(map["352-ManagedInteractive"]?.linkedRefId).toEqual("313-ManagedInteractive");
    });
  });

  describe("#hasLegacyLinkedInteractive", () => {
    it("returns false when an embeddable doesn't have a legacy linked interactive", () => {
      const embeddable = legacyLinkedInteractiveActivity.pages[0].sections[1].embeddables[1];
      const activity = legacyLinkedInteractiveActivity;
      expect(embeddable.ref_id).toEqual("312-ManagedInteractive");
      expect(hasLegacyLinkedInteractive(embeddable, {activity})).toEqual(false);
    });

    it("returns true when an embeddable has a legacy linked interactive", () => {
      const embeddable = legacyLinkedInteractiveActivity.pages[0].sections[1].embeddables[2];
      const activity = legacyLinkedInteractiveActivity;
      expect(embeddable.ref_id).toEqual("313-ManagedInteractive");
      expect(hasLegacyLinkedInteractive(embeddable, {activity})).toEqual(true);
    });
  });

  describe("#getInteractiveInfo", () => {
    it("returns undefined when the embeddableRefId isn't found", () => {
      const laraData = {activity: activity1};
      expect(getInteractiveInfo(laraData, "nonExistantEmbeddableRefId")).toBeUndefined();
    });

    it("returns the correct info for any embeddableRefId in a sequence", () => {
      const laraData = {sequence: sequenceWithQuestions};
      expect(getInteractiveInfo(laraData, "650-ManagedInteractive")).toEqual({
        activityName: "Question-Interactives Activity Player",
        pageName: "Header block text and interactives",
        pageNumber: 1,
          });
    });

    it("returns the correct info for any embeddableRefId without a page name in an activity", () => {
      const laraData = {activity: activity1};
      expect(getInteractiveInfo(laraData, "328-ManagedInteractive")).toEqual({
        activityName: "Single Page Test Activity",
        pageName: undefined,
        pageNumber: 1,
      });
    });

    it("returns the correct info for any embeddableRefId with a page name in an activity", () => {
      const laraData = {activity: legacyLinkedInteractiveActivity};
      expect(getInteractiveInfo(laraData, "312-ManagedInteractive")).toEqual({
        activityName: "Sample Layout Types",
        pageName: "Full Width",
        pageNumber: 1,
      });
    });
  });

});
