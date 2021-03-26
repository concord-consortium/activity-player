import { IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import { setPortalData, createOrUpdateAnswer, initializeDB, signInWithToken, setLearnerPluginState, getLearnerPluginStateDocId, getLearnerPluginState } from "./firebase-db";
import { DefaultManagedInteractive } from "../test-utils/model-for-tests";
import { getAnswerWithMetadata } from "../utilities/embeddable-utils";
import { IExportableAnswerMetadata } from "../types";
import firebase from "firebase/app";
import "firebase/firestore";

describe("Firestore", () => {

  let appMock: any;
  let signInWithCustomTokenMock: any;
  let signOutMock: any;

  beforeEach(async () => {
    const docResult = {
      set: jest.fn(() => new Promise((resolve) => resolve())),
      onSnapshot: jest.fn()
    };
    const docMock: any = jest.fn(() => docResult);
    const collectionResult: any = {
      onSnapshot: jest.fn(),
      where: jest.fn(() => collectionResult),
      doc: docMock
    };
    const collectionMock: any = jest.fn(() => collectionResult);

    signInWithCustomTokenMock = jest.fn();
    signOutMock = jest.fn(() => new Promise((resolve) => resolve()));
    appMock = {
      firestore: jest.fn(() => ({
        doc: docMock,
        collection: collectionMock,
        settings: jest.fn()
      })),
      auth: jest.fn(() => ({
        signInWithCustomToken: signInWithCustomTokenMock,
        signOut: signOutMock
      }))
    };
    jest.spyOn(firebase, "initializeApp").mockImplementation(jest.fn(() => appMock));

    await initializeDB({name: "report-service-dev", preview: false});
  });

  it("calls signout when signing in", async () => {
    await signInWithToken("test");
    expect(signOutMock).toHaveBeenCalled();
    expect(signInWithCustomTokenMock).toHaveBeenCalledWith("test");
  });

  it("does nothing in the absence of metadata", () => {
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

    expect(appMock.firestore().doc().set).not.toHaveBeenCalled();
  });

  it("creates answers with the correct metadata for authenticated users", () => {
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
      toolId: "activity-player.concord.org",
      userType: "learner",
      runRemoteEndpoint: "https://example.com/learner/1234",
      loggingUsername: "1@example.com"
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

    expect(appMock.firestore().doc).toHaveBeenCalledWith(`sources/localhost/answers/${exportableAnswer.id}`);
    expect(appMock.firestore().doc().set).toHaveBeenCalledWith({
      version:1,
      answer: "test",
      answer_text: "test",
      context_id: "context-id",
      id: exportableAnswer.id,
      platform_id: "https://example",
      platform_user_id: "1",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      remote_endpoint: "https://example.com/learner/1234",
      report_state: "{\"mode\":\"report\",\"authoredState\":\"{\\\"version\\\":1,\\\"questionType\\\":\\\"open_response\\\",\\\"prompt\\\":\\\"<p>Write something:</p>\\\"}\",\"interactiveState\":\"{\\\"answerType\\\":\\\"open_response_answer\\\",\\\"answerText\\\":\\\"test\\\"}\",\"version\":1}",
      resource_link_id: "2",
      resource_url: "http://example/resource",
      run_key: "",
      source_key: "localhost",
      submitted: null,
      tool_id: "activity-player.concord.org",
      type: "open_response_answer",
    }, {merge: true});
  });

  it("creates answers with the correct metadata for an anonymous user", () => {
    setPortalData({
      type: "anonymous",
      database: {
        appName: "report-service-dev",
        sourceKey: "localhost"
      },
      resourceUrl: "http://example/resource",
      toolId: "activity-player.concord.org",
      toolUserId: "anonymous",
      userType: "learner",
      runKey: "fake-run-key"
    });

    const embeddable = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
      ref_id: "123-ManagedInteractive"
    };

    const interactiveState: IRuntimeMetadata = {
      answerType: "open_response_answer",
      answerText: "anonymous test"
    };

    const exportableAnswer = getAnswerWithMetadata(interactiveState, embeddable) as IExportableAnswerMetadata;

    createOrUpdateAnswer(exportableAnswer);

    expect(appMock.firestore().doc).toHaveBeenCalledWith(`sources/localhost/answers/${exportableAnswer.id}`);
    expect(appMock.firestore().doc().set).toHaveBeenCalledWith({
      version: 1,
      answer: "anonymous test",
      answer_text: "anonymous test",
      id: exportableAnswer.id,
      platform_user_id: "fake-run-key",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      report_state: "{\"mode\":\"report\",\"authoredState\":\"{\\\"version\\\":1,\\\"questionType\\\":\\\"open_response\\\",\\\"prompt\\\":\\\"<p>Write something:</p>\\\"}\",\"interactiveState\":\"{\\\"answerType\\\":\\\"open_response_answer\\\",\\\"answerText\\\":\\\"anonymous test\\\"}\",\"version\":1}",
      resource_url: "http://example/resource",
      run_key: "fake-run-key",
      source_key: "localhost",
      submitted: null,
      tool_id: "activity-player.concord.org",
      tool_user_id: "anonymous",
      type: "open_response_answer"
    }, {merge: true});
  });

  describe("#setLearnerPluginState", () => {
    const state = '{"new": "state"}';

    describe("with no portal data", () => {
      beforeEach(() => setPortalData(null));

      it("should throw an error", async () => {
        expect.assertions(1);
        await expect(setLearnerPluginState(1, state)).rejects.toEqual(new Error("Not logged in"));
      });
    });


    describe("with anonymous portal data", () => {
      beforeEach(() => {
        setPortalData({
          type: "anonymous",
          database: {
            appName: "report-service-dev",
            sourceKey: "localhost"
          },
          resourceUrl: "http://example/resource",
          toolId: "activity-player.concord.org",
          toolUserId: "anonymous",
          userType: "learner",
          runKey: ""
        });
      });

      it("should save data", () => {
        return setLearnerPluginState(1, state)
          .then((d) => expect(d).toEqual(state));
      });
    });

    describe("with authenticated portal data", () => {
      beforeEach(() => {
        setPortalData({
          platformId: "testPlatformId",
          platformUserId: "testPlatformUserId",
          contextId: "testContextId",
          resourceLinkId: "testResourceLinkId",
          type: "authenticated",
          offering: {
            id: 1,
            activityUrl: "http://example.com/1",
            rubricUrl: "http://example.com/2"
          },
          userType: "learner",
          database: {
            appName: "report-service-dev",
            sourceKey: "1",
            rawFirebaseJWT: "foo",
          },
          toolId: "2",
          resourceUrl: "http://example.com/3",
          fullName: "Test Testerson",
          learnerKey: "bar",
          basePortalUrl: "http://example.com/",
          rawPortalJWT: "",
          portalJWT: {
            alg: "1",
            iat: 2,
            exp: 3,
            uid: 4,
            domain: "5",
            user_type: "learner",
            user_id: "6",
            learner_id: 7,
            class_info_url: "http://example.com/4",
            offering_id: 8
          },
          runRemoteEndpoint: "http://example.com/5",
          loggingUsername: "1@example.com"
        });
      });

      it("should save data", () => {
        return setLearnerPluginState(1, state)
          .then((d) => expect(d).toEqual(state));
      });
    });
  });

  describe("#getLearnerPluginStateDocId", () => {

    describe("with no portal data", () => {
      beforeEach(() => setPortalData(null));

      it("should return undefined", () => {
        expect(getLearnerPluginStateDocId(1)).toEqual(undefined);
      });

      // the rest of the code is handled with other tests
    });
  });

  describe("#getLearnerPluginState", () => {

    describe("with no portal data", () => {
      beforeEach(() => setPortalData(null));

      it("should return null", async () => {
        await expect(getLearnerPluginState(1)).resolves.toEqual(null);
      });

      // the rest of the code is handled with other tests
    });
  });

});
