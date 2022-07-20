import { IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import { setPortalData, setAnonymousPortalData, createOrUpdateAnswer, initializeDB, signInWithToken, setLearnerPluginState, getLearnerPluginStateDocId, getLearnerPluginState, getLegacyLinkedRefIds, utcString, getApRun, createOrUpdateApRun } from "./firebase-db";
import { DefaultManagedInteractive } from "./test-utils/model-for-tests";
import { getAnswerWithMetadata, LegacyLinkedRefMap } from "./utilities/embeddable-utils";
import { IExportableAnswerMetadata } from "./types";
import firebase from "firebase/compat/app";
import { RawClassInfo } from "./portal-api";
import "firebase/compat/firestore";
import { IAnonymousPortalData, IPortalData } from "./portal-types";

describe("Firestore", () => {

  let appMock: any;
  let signInWithCustomTokenMock: any;
  let signOutMock: any;

  beforeEach(async () => {
    const docResult = {
      set: jest.fn(() => new Promise<void>((resolve) => resolve())),
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
    signOutMock = jest.fn(() => new Promise<void>((resolve) => resolve()));
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
      rawClassInfo: {} as RawClassInfo,
      collaboratorsDataUrl: "https://example.com/collaborations/1234",
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
    const shouldWatchAnswer = true;
    const exportableAnswer = shouldWatchAnswer && getAnswerWithMetadata(interactiveState, embeddable) as IExportableAnswerMetadata;

    const created = utcString();
    createOrUpdateAnswer(exportableAnswer);

    expect(appMock.firestore().doc).toHaveBeenCalledWith(`sources/localhost/answers/${exportableAnswer.id}`);
    expect(appMock.firestore().doc().set).toHaveBeenCalledWith({
      version: 1,
      created,
      answer: "test",
      answer_text: "test",
      context_id: "context-id",
      id: exportableAnswer.id,
      platform_id: "https://example",
      platform_user_id: "1",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      remote_endpoint: "https://example.com/learner/1234",
      report_state: "{\"mode\":\"report\",\"authoredState\":\"{\\\"version\\\":1,\\\"questionType\\\":\\\"open_response\\\",\\\"prompt\\\":\\\"<p>Write something:</p>\\\"}\",\"interactiveState\":\"{\\\"answerType\\\":\\\"open_response_answer\\\",\\\"answerText\\\":\\\"test\\\"}\",\"interactive\":{\"id\":\"managed_interactive_123\",\"name\":\"\"},\"version\":1}",
      resource_link_id: "2",
      resource_url: "http://example/resource",
      run_key: "",
      source_key: "localhost",
      submitted: null,
      tool_id: "activity-player.concord.org",
      type: "open_response_answer",
      collaborators_data_url: "https://example.com/collaborations/1234",
      collaboration_owner_id: "1"
    }, {merge: true});
  });

  it("creates answers with the correct metadata for an anonymous user", () => {
    setAnonymousPortalData({
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

    const created = utcString();
    createOrUpdateAnswer(exportableAnswer);

    expect(appMock.firestore().doc).toHaveBeenCalledWith(`sources/localhost/answers/${exportableAnswer.id}`);
    expect(appMock.firestore().doc().set).toHaveBeenCalledWith({
      version: 1,
      created,
      answer: "anonymous test",
      answer_text: "anonymous test",
      id: exportableAnswer.id,
      platform_user_id: "fake-run-key",
      question_id: "managed_interactive_123",
      question_type: "open_response",
      report_state: "{\"mode\":\"report\",\"authoredState\":\"{\\\"version\\\":1,\\\"questionType\\\":\\\"open_response\\\",\\\"prompt\\\":\\\"<p>Write something:</p>\\\"}\",\"interactiveState\":\"{\\\"answerType\\\":\\\"open_response_answer\\\",\\\"answerText\\\":\\\"anonymous test\\\"}\",\"interactive\":{\"id\":\"managed_interactive_123\",\"name\":\"\"},\"version\":1}",
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
        setAnonymousPortalData({
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
          rawClassInfo: {} as RawClassInfo,
          collaboratorsDataUrl: "https://example.com/collaborations/1234",
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

  describe("#getLegacyLinkedRefIds", () => {
    it("handles cycles", () => {
      // not needed in function but necessary in passed in map
      const activity: any = null;
      const page: any = null;
      const linkedRefMap: LegacyLinkedRefMap = {
        "a": {activity, page, linkedRefId: "d"},
        "b": {activity, page, linkedRefId: "a"},
        "c": {activity, page, linkedRefId: "b"},
        "d": {activity, page, linkedRefId: "c"}
      };
      const ids = getLegacyLinkedRefIds("d", linkedRefMap);
      expect(ids).toEqual(["c", "b", "a"]);
    });
  });
});

describe("AP run functions", () => {

  const anonymousPortalData: IAnonymousPortalData = {
    type: "anonymous",
    database: {
      appName: "report-service-dev",
      sourceKey: "localhost"
    },
    resourceUrl: "http://example/resource",
    toolId: "activity-player.concord.org",
    toolUserId: "anonymous",
    userType: "learner",
    runKey: "test"
  };

  const portalData: IPortalData = {
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
    rawClassInfo: {} as RawClassInfo,
    collaboratorsDataUrl: "https://example.com/collaborations/1234",
  };

  let appMock: any;
  let signInWithCustomTokenMock: any;
  let signOutMock: any;
  let collectionResult: any;
  let docMock: any;
  let docResult: any;

  beforeEach(async () => {
    docMock = jest.fn(() => docResult);
    docResult = {
      empty: false,
      docs: [{
        id: 1,
        data: jest.fn(() => ({foo: "bar"})),
      }],
      set: jest.fn(() => new Promise<void>((resolve) => resolve())),
      add: jest.fn(() => new Promise<void>((resolve) => resolve())),
    };
    collectionResult = {
      where: jest.fn(() => collectionResult),
      orderBy: jest.fn(() => collectionResult),
      get: jest.fn(() => docResult)
    };
    const collectionMock: any = jest.fn(() => collectionResult);

    signInWithCustomTokenMock = jest.fn();
    signOutMock = jest.fn(() => new Promise<void>((resolve) => resolve()));
    appMock = {
      firestore: jest.fn(() => ({
        collection: collectionMock,
        settings: jest.fn(),
        doc: docMock
      })),
      auth: jest.fn(() => ({
        signInWithCustomToken: signInWithCustomTokenMock,
        signOut: signOutMock
      }))
    };
    jest.spyOn(firebase, "initializeApp").mockImplementation(jest.fn(() => appMock));

    await initializeDB({name: "report-service-dev", preview: false});
  });

  describe("getApRun", () => {
    it("throws an error if the portal data isn't set", async () => {
      setPortalData(null);
      await expect(async () => {
        await getApRun();
      }).rejects.toThrowError("Must set portal data first");
    });

    describe("with anonymous portal data", () => {
      beforeEach(() => {
        setAnonymousPortalData(anonymousPortalData);
      });

      it("works without a sequenceActivity parameter", async () => {
        expect(await getApRun()).toStrictEqual({ id: 1, data: { foo: "bar" } });
        expect(collectionResult.where).toBeCalledTimes(1);
        expect(collectionResult.where).toHaveBeenNthCalledWith(1, "run_key", "==", "test");
        expect(collectionResult.orderBy).toBeCalledWith("updated_at", "desc");
      });

      it("works with a sequenceActivity parameter", async () => {
        expect(await getApRun("test2")).toStrictEqual({ id: 1, data: { foo: "bar" } });
        expect(collectionResult.where).toBeCalledTimes(2);
        expect(collectionResult.where).toHaveBeenNthCalledWith(1, "run_key", "==", "test");
        expect(collectionResult.where).toHaveBeenNthCalledWith(2, "sequence_activity", "==", "test2");
      });

    });

    describe("with authenticated portal data", () => {
      beforeEach(() => {
        setPortalData(portalData);
      });

      it("works without a sequenceActivity parameter", async () => {
        expect(await getApRun()).toStrictEqual({ id: 1, data: { foo: "bar" } });
        expect(collectionResult.where).toBeCalledTimes(4);
        expect(collectionResult.where).toHaveBeenNthCalledWith(1, "platform_id", "==", "testPlatformId");
        expect(collectionResult.where).toHaveBeenNthCalledWith(2, "resource_url", "==", "http://example.com/3");
        expect(collectionResult.where).toHaveBeenNthCalledWith(3, "context_id", "==", "testContextId");
        expect(collectionResult.where).toHaveBeenNthCalledWith(4, "platform_user_id", "==", "testPlatformUserId");
        expect(collectionResult.orderBy).toBeCalledWith("updated_at", "desc");
      });

      it("works with a sequenceActivity parameter", async () => {
        expect(await getApRun("test2")).toStrictEqual({ id: 1, data: { foo: "bar" } });
        expect(collectionResult.where).toBeCalledTimes(5);
        expect(collectionResult.where).toHaveBeenNthCalledWith(1, "platform_id", "==", "testPlatformId");
        expect(collectionResult.where).toHaveBeenNthCalledWith(2, "resource_url", "==", "http://example.com/3");
        expect(collectionResult.where).toHaveBeenNthCalledWith(3, "context_id", "==", "testContextId");
        expect(collectionResult.where).toHaveBeenNthCalledWith(4, "platform_user_id", "==", "testPlatformUserId");
        expect(collectionResult.where).toHaveBeenNthCalledWith(5, "sequence_activity", "==", "test2");
      });
    });
  });

  describe("createOrUpdateApRun", () => {
    it("throws an error if the portal data isn't set", async () => {
      setPortalData(null);
      await expect(async () => {
        await createOrUpdateApRun({pageId: 1});
      }).rejects.toThrowError("Must set portal data first");
    });

    describe("with anonymous portal data", () => {
      beforeEach(() => {
        setAnonymousPortalData(anonymousPortalData);
      });

      it("works without a sequenceActivity parameter", async () => {
        await createOrUpdateApRun({ pageId: 1 });
        expect(docMock).toHaveBeenCalledWith("sources/localhost/ap_runs/1");
        expect(docResult.set).toHaveBeenCalled();
      });

      it("works with a sequenceActivity parameter", async () => {
        await createOrUpdateApRun({ pageId: 1, sequenceActivity: "test2" });
        expect(docMock).toHaveBeenCalledWith("sources/localhost/ap_runs/1");
        expect(docResult.set).toHaveBeenCalled();
      });

    });

    describe("with authenticated portal data", () => {
      beforeEach(() => {
        setPortalData(portalData);
      });

      it("works without a sequenceActivity parameter", async () => {
        await createOrUpdateApRun({ pageId: 1 });
        expect(docMock).toHaveBeenCalledWith("sources/1/ap_runs/1");
        expect(docResult.set).toHaveBeenCalled();
      });

      it("works with a sequenceActivity parameter", async () => {
        await createOrUpdateApRun({ pageId: 1, sequenceActivity: "test2" });
        expect(docMock).toHaveBeenCalledWith("sources/1/ap_runs/1");
        expect(docResult.set).toHaveBeenCalled();
      });

    });
  });
});
