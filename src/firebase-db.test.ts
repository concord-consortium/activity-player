import { IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import { setPortalData, createOrUpdateAnswer } from "./firebase-db";
import { DefaultManagedInteractive } from "./test-utils/model-for-tests";
import { getAnswerWithMetadata } from "./utilities/embeddable-utils";
import { IExportableAnswerMetadata } from "./types";
import firebase from "firebase";
import { mockFirestore } from "./test-utils/firestore-mock";

(firebase as any).firestore = mockFirestore;

describe("Firestore", () => {



  beforeEach(() => {
    jest.clearAllMocks();

    firebase.firestore();
  });

  it("creates answers with the correct metadata", () => {
    setPortalData({
      type: "authenticated",
      contextId: "context-id",
      database: {
        appName: "report-service-dev",
        sourceKey: "localhost",
        rawFirebaseJWT: "abc"
      },
      offering: {
        id: 1,
        activityUrl: "http://example/activities/1",
        rubricUrl: ""
      },
      platformId: "https://example",
      platformUserId: "1",
      resourceLinkId: "2",
      resourceUrl: "http://example/resource",
      toolId: "https://example",
      toolUserId: "https://example/users/1",
      userType: "learner"
    });

    const embeddable = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMetadata = {
      answerType: "open_response_answer",
      answerText: "test"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableAnswerMetadata;

    createOrUpdateAnswer(exportableAnswer);

    expect(mockFirestore().doc).toHaveBeenCalledWith(`sources/localhost/answers/${exportableAnswer.id}`);
    expect(mockFirestore().doc().set).toHaveBeenCalledWith({
      answer: "test",
      answer_text: "test",
      context_id: "context-id",
      id: exportableAnswer.id,
      platform_id: "https://example",
      platform_user_id: "1",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      remote_endpoint: "",
      report_state: "{\"mode\":\"report\",\"authoredState\":\"{\\\"version\\\":1,\\\"questionType\\\":\\\"open_response\\\",\\\"prompt\\\":\\\"<p>Write something:</p>\\\"}\",\"interactiveState\":\"{\\\"answerType\\\":\\\"open_response_answer\\\",\\\"answerText\\\":\\\"test\\\"}\",\"version\":1}",
      resource_link_id: "2",
      resource_url: "http://example/resource",
      run_key: "",
      source_key: "localhost",
      submitted: null,
      tool_id: "https://example",
      tool_user_id: "https://example/users/1",
      type: "open_response_answer",
    }, {merge: true});
  });
});
