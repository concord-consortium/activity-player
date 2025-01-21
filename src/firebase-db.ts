/**
 * The firebase-db handles initializing the connection to the firestore database, signing in, listening
 * to data and updating data.
 * We want to start listening for data such as student answers as soon as possible when the activity
 * player is loaded, but we also want individual components such as embeddables to request the data and
 * be notified of changes. To support this, we kick off the data watching by calling e.g. `watchAnswers`,
 * and then later can request the current data or to append a listener for that data.
 */

import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { anonymousPortalData } from "./portal-api";
import { IAnonymousPortalData, IPortalData, isPortalData } from "./portal-types";
import { getLegacyLinkedRefMap, LegacyLinkedRefMap, refIdToAnswersQuestionId } from "./utilities/embeddable-utils";
import { IExportableAnswerMetadata, LTIRuntimeAnswerMetadata, AnonymousRuntimeAnswerMetadata,
  IAuthenticatedLearnerPluginState, IAnonymousLearnerPluginState, ILegacyLinkedInteractiveState, IApRun, IBaseApRun,
  TeacherFeedback } from "./types";
import { queryValueBoolean } from "./utilities/url-query";
import { RequestTracker } from "./utilities/request-tracker";
import { ILaraData } from "./components/lara-data-context";
import { getReportUrl } from "./utilities/report-utils";

export type FirebaseAppName = "report-service-dev" | "report-service-pro";

let portalData: IPortalData | IAnonymousPortalData | null;

const answersPath = (answerId?: string) =>
  `sources/${portalData?.database.sourceKey}/answers${answerId ? "/" + answerId : ""}`;

const teacherFeedbackPath = (level: "activity" | "question") => {
  if (!isPortalData(portalData)) {
    throw new Error("Teacher feedback is only available for authenticated users.");
  }

  const sourceKey = portalData.teacherFeedbackSourceKey;
  return `sources/${sourceKey}/${level}_feedbacks`;
};

const learnerPluginStatePath = (docId: string) =>
  `sources/${portalData?.database.sourceKey}/plugin_states/${docId}`;

const apRunsPath = (id?: string) =>
  `sources/${portalData?.database.sourceKey}/ap_runs${id ? "/" + id : ""}`;

export interface WrappedDBAnswer {
  meta: IExportableAnswerMetadata;
  interactiveState: any;
}
export type DBChangeListener = (wrappedDBAnswer: WrappedDBAnswer | null) => void;

interface IConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
type IConfigs = {
  [index in FirebaseAppName]: IConfig;
}
const configurations: IConfigs = {
  "report-service-dev": {
    apiKey: atob("QUl6YVN5Q3Z4S1d1WURnSjRyNG84SmVOQU9ZdXN4MGFWNzFfWXVF"),
    authDomain: "report-service-dev.firebaseapp.com",
    databaseURL: "https://report-service-dev.firebaseio.com",
    projectId: "report-service-dev",
    storageBucket: "report-service-dev.appspot.com",
    messagingSenderId: "402218300971",
    appId: "1:402218300971:web:32b7266ef5226ff7"
  },
  "report-service-pro": {
    apiKey: atob("QUl6YVN5Qm1OU2EyVXozRGFFd0tjbHN2SFBCd2Z1Y1NtWldBQXpn"),
    authDomain: "report-service-pro.firebaseapp.com",
    databaseURL: "https://report-service-pro.firebaseio.com",
    projectId: "report-service-pro",
    storageBucket: "report-service-pro.appspot.com",
    messagingSenderId: "22386066971",
    appId: "1:22386066971:web:e0cdec7cb0f0893a8a5abe"
  }
};

const MAX_FIRESTORE_SAVE_TIME = 20000;
const requestTracker = new RequestTracker(MAX_FIRESTORE_SAVE_TIME);
// The provided handler will be invoked when some answer doesn't get saved in Firestore within MAX_FIRESTORE_SAVE_TIME.
// This lets the app notify users that there are some network issues.
export const onFirestoreSaveTimeout = (handler: () => void) => {
  requestTracker.timeoutHandler = handler;
};
// The provided handler will be invoked when all the requests that took longer than MAX_FIRESTORE_SAVE_TIME
// finally succeed. This lets the app notify users that network issues have been resolved.
export const onFirestoreSaveAfterTimeout = (handler: () => void) => {
  requestTracker.successAfterTimeoutHandler = handler;
};
let app: firebase.app.App;

// preview mode will run Firestore in offline mode and clear it (as otherwise the local data is persisted).
export async function initializeDB({ name, preview }: { name: FirebaseAppName, preview: boolean }) {
  const config = configurations[name];
  app = firebase.initializeApp(config, "activity-player");

  // Save action seems to be failing when you try to save a document with a property explicitly set to undefined value.
  // `null` or empty string are fine. ActivityPlayer was not saving some interactive states because of that.
  // See: https://github.com/googleapis/nodejs-firestore/issues/1031#issuecomment-636308604
  app.firestore().settings({
    ignoreUndefinedProperties: true,
  });

  // The following flags are useful for tests. It makes it possible to clear the persistence
  // at the beginning of a test, and enable perisistence on each visit call
  // this way the tests can run offline but still share firestore state across visits
  //
  // WARNING: as far as I can tell persistence is based on the domain of the page.
  // So if persistence is enabled on a page loaded from the
  // portal-report.concord.org domain this will likely affect all tabs in the same browser
  // regardless of what branch or version of the portal report code that tab is running.
  // Cypress runs its test in a different browser instance so its persistence should not pollute
  // non-cypress tabs
  if (queryValueBoolean("clearFirestorePersistence") || preview) {
    // we cannot enable the persistence until the
    // clearing is complete, so this await is necessary
    await app.firestore().clearPersistence();
  }

  if (queryValueBoolean("enableFirestorePersistence") || preview) {
    await app.firestore().enablePersistence({ synchronizeTabs: true });
    await app.firestore().disableNetwork();
    // When network is disabled, Firestore promises will never resolve. So tracking requests make no sense.
    requestTracker.disabled = true;
  }

  return app.firestore();
}

export async function initializeAnonymousDB(preview: boolean) {
  portalData = anonymousPortalData(preview);
  return initializeDB({ name: portalData.database.appName, preview });
}

export const signInWithToken = async (rawFirestoreJWT: string) => {
  // It's actually useful to sign out first, as firebase seems to stay signed in between page reloads otherwise.
  await app.auth().signOut();
  return app.auth().signInWithCustomToken(rawFirestoreJWT);
};

export const setPortalData = (_portalData: IPortalData | null) => {
  portalData = _portalData;
};

// This will not fetch the portal data, if this is called before the
// portalData has been fetched it will return null
export const getPortalData = (): IPortalData | IAnonymousPortalData | null => {
  return portalData;
};

export const setAnonymousPortalData = (_portalData: IAnonymousPortalData) => {
  portalData = _portalData;
};

type DocumentsListener = (docs: firebase.firestore.DocumentData[]) => void;

const getAnswerDocsQuery = (questionId?: string) => {
  if (!portalData) {
    throw new Error("Must set portal data first");
  }
  let query: firebase.firestore.Query = app.firestore().collection(answersPath());

  if (portalData.type === "authenticated") {     // logged in user
    query = query
      .where("platform_id", "==", portalData.platformId)
      .where("resource_link_id", "==", portalData.resourceLinkId)
      .where("context_id", "==", portalData.contextId);
    if (portalData.userType === "learner") {
      query = query.where("platform_user_id", "==", portalData.platformUserId.toString());
    }
  } else {
    query = query.where("run_key", "==", portalData.runKey);
  }

  // If questionId is provided, it'll limit answers to just one question.
  if (questionId) {
    query = query.where("question_id", "==", questionId);
  }
  return query;
};

const watchAnswerDocs = (listener: DocumentsListener, questionId?: string) => {
  const query = getAnswerDocsQuery(questionId);
  // Note that query.onSnapshot returns unsubscribe method.
  return query.onSnapshot((snapshot: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>) => {
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(doc => doc.data());
      listener(docs);
    }
    else {
      listener([]);
    }
  }, (err) => {
    throw new Error(err.message);
  });
};

const getAnswerDocs = (questionId?: string) => {
  const query = getAnswerDocsQuery(questionId);
  // Note that query.onSnapshot returns unsubscribe method.
  return query.get().then(snapshot => {
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => doc.data());
    }
    return [];
  });
};

const firestoreDocToWrappedAnswer = (doc: firebase.firestore.DocumentData) => {
  const getInteractiveState = () => {
    const reportState = JSON.parse(doc.report_state);
    return JSON.parse(reportState.interactiveState);
  };
  const interactiveState = getInteractiveState();
  const wrappedAnswer: WrappedDBAnswer = {
    meta: doc as IExportableAnswerMetadata,
    interactiveState
  };
  return wrappedAnswer;
};

export const getAnswer = (embeddableRefId: string): Promise<WrappedDBAnswer | null> => {
  const questionId = refIdToAnswersQuestionId(embeddableRefId);
  return getAnswerDocs(questionId)
    .then((answers: firebase.firestore.DocumentData[]) => {
      if (answers.length === 0) {
        return null;
      }
      if (answers.length > 1) {
        console.warn(
          "Found multiple answer objects for the same question. It might be result of early " +
          "ActivityPlayer versions. Your data might be corrupted."
        );
      }
      return firestoreDocToWrappedAnswer(answers[0]);
    });
};

// TODO: this could be optimized to a single "in" query.  For now it is a set of queries, one per answer.
export const getAllAnswersInList = (embeddableRefIds: string[]): Promise<Array<WrappedDBAnswer | null>> => {
  return Promise.all([...embeddableRefIds.map(getAnswer)]);
};

export const getAllAnswers = (): Promise<WrappedDBAnswer[]>  => {
  return getAnswerDocs()
    .then((answers: firebase.firestore.DocumentData[]) =>
      answers.map(doc => firestoreDocToWrappedAnswer(doc))
    );
};

// Watches ONE question answer defined by embeddableRefId.
export const watchAnswer = (embeddableRefId: string, callback: (wrappedAnswer: WrappedDBAnswer | null) => void) => {
  const questionId = refIdToAnswersQuestionId(embeddableRefId);
  // Note that watchAnswerDocs returns unsubscribe method.
  return watchAnswerDocs((answers: firebase.firestore.DocumentData[]) => {
    if (answers.length === 0) {
      callback(null);
      return;
    }
    if (answers.length > 1) {
      console.warn(
        "Found multiple answer objects for the same question. It might be result of early " +
        "ActivityPlayer versions. Your data might be corrupted."
      );
    }
    callback(firestoreDocToWrappedAnswer(answers[0]));
  }, questionId); // limit observer to single question
};

// Watches ALL the answers for the given activity.
export const watchAllAnswers = (callback: (wrappedAnswer: WrappedDBAnswer[]) => void) => {
  // Note that watchAnswerDocs returns unsubscribe method.
  return watchAnswerDocs((answers: firebase.firestore.DocumentData[]) => {
    callback(answers.map(doc => firestoreDocToWrappedAnswer(doc)));
  });
};

const getActivityLevelFeedbackDocsQuery = () => {
  if (!portalData) {
    throw new Error("Must set portal data first");
  }
  // Only logged-in students will have feedback.
  if (portalData.userType !== "learner" || portalData.type === "anonymous") return;

  let query: firebase.firestore.Query = app.firestore().collection(teacherFeedbackPath("activity"));

  if (portalData.type === "authenticated") {
    query = query
      .where("platformId", "==", portalData.platformId)
      .where("resourceLinkId", "==", portalData.resourceLinkId)
      .where("contextId", "==", portalData.contextId)
      .where("platformStudentId", "==", portalData.platformUserId.toString());
  }

  return query;
};

const getQuestionLevelFeedbackDocsQuery = (answerId: string) => {
  if (!portalData) {
    throw new Error("Must set portal data first");
  }
  // Only logged-in students will have feedback.
  if (portalData.userType !== "learner" || portalData.type === "anonymous") return;

  let query: firebase.firestore.Query = app.firestore().collection(teacherFeedbackPath("question"));

  if (portalData.type === "authenticated") {
    query = query
      .where("answerId", "==", answerId)
      .where("platformId", "==", portalData.platformId)
      .where("resourceLinkId", "==", portalData.resourceLinkId)
      .where("contextId", "==", portalData.contextId)
      .where("platformStudentId", "==", portalData.platformUserId.toString());
  }

  return query;
};

const watchQuestionLevelFeedbackDocs = (listener: DocumentsListener, answerId: string) => {
  const query = getQuestionLevelFeedbackDocsQuery(answerId);
  // Note that query.onSnapshot returns unsubscribe method.
  return query?.onSnapshot((snapshot: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>) => {
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(doc => doc.data());
      listener(docs);
    }
    else {
      listener([]);
    }
  }, (err) => {
    throw new Error(err.message);
  });
};

const watchActivityLevelFeedbackDocs = (listener: DocumentsListener) => {
  const query = getActivityLevelFeedbackDocsQuery();
  // Note that query.onSnapshot returns unsubscribe method.
  return query?.onSnapshot((snapshot: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>) => {
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(doc => doc.data());
      listener(docs);
    }
    else {
      listener([]);
    }
  }, (err) => {
    throw new Error(err.message);
  });
};

// Watches ONE question feedback
export const watchQuestionLevelFeedback = (answerId: string, callback: (feedback: TeacherFeedback | null) => void) => {
  // Note that watchQuestionLevelFeedbackDocs returns unsubscribe method.
  return watchQuestionLevelFeedbackDocs((feedbackDocs: firebase.firestore.DocumentData[]) => {
    if (feedbackDocs.length === 0) {
      callback(null);
      return;
    }
    if (feedbackDocs.length > 1) {
      console.warn(
        "Found multiple answer objects for the same question. It might be result of early " +
        "ActivityPlayer versions. Your data might be corrupted."
      );
    }

    const feedback = feedbackDocs[0].feedback;
    const timestamp = feedbackDocs[0].updatedAt.toDate().toLocaleString();
    callback({content: feedback, timestamp});
  }, answerId); // limit observer to single answer
};

// Watches ONE activity feedback
export const watchActivityLevelFeedback = (callback: (feedback:TeacherFeedback | null) => void) => {
  // Note that watchAnswerDocs returns unsubscribe method.
  return watchActivityLevelFeedbackDocs((feedbackDocs: firebase.firestore.DocumentData[]) => {
    if (feedbackDocs.length === 0) {
      callback(null);
      return;
    }
    if (feedbackDocs.length > 1) {
      console.warn(
        "Found multiple activity objects for the same question. It might be result of early " +
        "ActivityPlayer versions. Your data might be corrupted."
      );
    }

    const feedback = feedbackDocs[0].feedback;
    const timestamp = feedbackDocs[0].updatedAt.toDate().toLocaleString();
    callback({content: feedback, timestamp});
  });
};

// use same universal timezone (UTC) as Lara uses for writing created
export const utcString = () => (new Date()).toUTCString().replace("GMT", "UTC");

export function createOrUpdateAnswer(answer: IExportableAnswerMetadata) {
  if (!portalData) {
    return;
  }

  let answerDocData: LTIRuntimeAnswerMetadata | AnonymousRuntimeAnswerMetadata;
  if (portalData.type === "authenticated") {
    const ltiAnswer: LTIRuntimeAnswerMetadata = {
      ...answer,
      created: utcString(),
      source_key: portalData.database.sourceKey,
      resource_url: portalData.resourceUrl,
      tool_id: portalData.toolId,
      platform_id: portalData.platformId,
      platform_user_id: portalData.platformUserId.toString(),
      context_id: portalData.contextId,
      resource_link_id: portalData.resourceLinkId,
      run_key: "",
      remote_endpoint: portalData.runRemoteEndpoint
    };

    // remove any existing collaboration data cached in the answer
    delete ltiAnswer.collaborators_data_url;
    delete ltiAnswer.collaboration_owner_id;

    // only add collaboration data if present as it is rarely used
    if (portalData.collaboratorsDataUrl) {
      ltiAnswer.collaborators_data_url = portalData.collaboratorsDataUrl;
      ltiAnswer.collaboration_owner_id = ltiAnswer.platform_user_id;
    }

    answerDocData = ltiAnswer;
  } else {
    const anonymousAnswer: AnonymousRuntimeAnswerMetadata = {
      ...answer,
      created: utcString(),
      source_key: portalData.database.sourceKey,
      resource_url: portalData.resourceUrl,
      tool_id: portalData.toolId,
      run_key: portalData.runKey,
      tool_user_id: "anonymous",
      platform_user_id: portalData.runKey
    };
    answerDocData = anonymousAnswer;
  }

  // TODO: LARA stores a created field with the date the answer was created
  // I'm not sure how to do that easily in Firestore, we could at least add
  // an updatedAt time using Firestore's features.
  const firestoreSetPromise = app.firestore()
    .doc(answersPath(answer.id))
    .set(answerDocData as Partial<firebase.firestore.DocumentData>, {merge: true});

  requestTracker.registerRequest(firestoreSetPromise);

  return firestoreSetPromise;
}

export const getLearnerPluginStateDocId = (pluginId: number) => {
  if (!portalData) {
    return undefined;
  }

  let docId: string;
  if (portalData.type === "authenticated") {
    const {platformId, platformUserId, contextId, resourceLinkId} = portalData;
    docId = [platformId, platformUserId.toString(), contextId, resourceLinkId, pluginId].join("-");
  } else {
    docId = [portalData.runKey, pluginId].join("-");
  }

  return docId.replace(/[.$[\]#/]/g, "_");
};

// A write-though cache of the learner plugin states is kept as the plugin's learner state is only loaded
// once at app startup but it is supplied on the plugin init which happens on any page change.

// TODO: change to watch the learner state so that it works across sessions and not just on the same page

let cachedLearnerPluginState: Record<number, string|null> = {};
export const getCachedLearnerPluginState = (pluginId: number) => cachedLearnerPluginState[pluginId] || null;

export const clearCachedLearnerPluginState = () => cachedLearnerPluginState = {};

export const getLearnerPluginState = async (pluginId: number) => {
  const docId = getLearnerPluginStateDocId(pluginId);
  if (docId === undefined) {
    return null;
  }

  if (cachedLearnerPluginState[pluginId]) {
    return cachedLearnerPluginState[pluginId];
  }

  let state: string|null = null;
  try {
    const doc = await app.firestore()
      .doc(learnerPluginStatePath(docId))
      .get();

    const data = doc.data() as IAuthenticatedLearnerPluginState | IAnonymousLearnerPluginState | undefined;

    state = data?.state || null;
  } catch (e) {} // eslint-disable-line no-empty

  cachedLearnerPluginState[pluginId] = state;

  return state;
};

export const setLearnerPluginState = async (pluginId: number, state: string): Promise<string> => {
  if (!portalData) {
    throw new Error("Not logged in");
  }

  let learnerPluginState: IAuthenticatedLearnerPluginState | IAnonymousLearnerPluginState;
  if (portalData.type === "authenticated") {
    const authenticatedState: IAuthenticatedLearnerPluginState = {
      platform_id: portalData.platformId,
      platform_user_id: portalData.platformUserId.toString(),
      context_id: portalData.contextId,
      resource_link_id: portalData.resourceLinkId,
      source_key: portalData.database.sourceKey,
      tool_id: portalData.toolId,
      resource_url: portalData.resourceUrl,
      run_key: "",
      remote_endpoint: portalData.runRemoteEndpoint,
      pluginId,
      state
      };
    learnerPluginState = authenticatedState;
  } else {
    const anonymousState: IAnonymousLearnerPluginState = {
      run_key: portalData.runKey,
      source_key: portalData.database.sourceKey,
      resource_url: portalData.resourceUrl,
      tool_id: portalData.toolId,
      tool_user_id: "anonymous",
      platform_user_id: portalData.runKey,
      pluginId,
      state
      };
    learnerPluginState = anonymousState;
  }

  const docId = getLearnerPluginStateDocId(pluginId);
  if (docId === undefined) {
    throw new Error("Cannot compute learner plugin state doc id");
  }

  try {
    await app.firestore()
    .doc(learnerPluginStatePath(docId))
    .set(learnerPluginState);
  } catch (e) {} // eslint-disable-line no-empty

  cachedLearnerPluginState[pluginId] = state;

  return state;
};

export const getLegacyLinkedRefIds = (embeddableRefId: string, linkedRefMap: LegacyLinkedRefMap) => {
  const linkedRefIds: string[] = [];
  let refId: string | undefined = embeddableRefId;
  do {
    // break out if a cycle is found
    if (linkedRefIds.indexOf(refId) !== -1) {
      break;
    }
    if (refId !== embeddableRefId) {
      linkedRefIds.push(refId);
    }
    refId = linkedRefMap[refId]?.linkedRefId;
  } while (refId);

  return linkedRefIds;
};

export const getLegacyLinkedInteractiveInfo = (embeddableRefId: string, laraData: ILaraData, callback: (info: ILegacyLinkedInteractiveState) => void) => {
  // get a map of embeddable refs to linked refs
  const linkedRefMap = getLegacyLinkedRefMap(laraData);

  // if this ref isn't in the map it doesn't have linked interactives so we are done
  if (!linkedRefMap[embeddableRefId]) {
    callback({
      hasLinkedInteractive: false,
      linkedState: null,
      allLinkedStates: []
    });
    return;
  }

  // get all the linked ref states in ancestry order with a guard against a loop in the graph
  const linkedRefIds = getLegacyLinkedRefIds(embeddableRefId, linkedRefMap);

  getAllAnswersInList(linkedRefIds)
    .then(answers => {
      const allLinkedStates = linkedRefIds.map((linkedRefId, index) => {
        const linkedRef = linkedRefMap[linkedRefId];

        return {
          pageNumber: linkedRef?.page.position,
          pageName: linkedRef?.page.name,
          activityName: linkedRef?.activity.name,
          interactiveState: answers[index]?.interactiveState || null,
          updatedAt: answers[index]?.meta.created,  // created is same as updated as it is set on each write
          externalReportUrl: getReportUrl(linkedRefId) || undefined,
          interactive: {
            id: linkedRefId
          }
        };
      });
      const linkedState = allLinkedStates.find(ls => ls.interactiveState)?.interactiveState || null;

      callback({
        hasLinkedInteractive: true,
        linkedState,
        allLinkedStates: allLinkedStates as any,  // any here as we are missing things Lara sets
        externalReportUrl: getReportUrl(embeddableRefId) || undefined
      });
    });
};

export const getApRun = async (sequenceActivity?: string|null) => {
  if (!portalData) {
    throw new Error("Must set portal data first");
  }
  let query: firebase.firestore.Query = app.firestore().collection(apRunsPath());

  if (portalData.type === "authenticated") {     // logged in user
    query = query
      .where("platform_id", "==", portalData.platformId)
      .where("resource_url", "==", portalData.resourceUrl)
      .where("context_id", "==", portalData.contextId)
      .where("platform_user_id", "==", portalData.platformUserId.toString());
  } else {
    query = query.where("run_key", "==", portalData.runKey);
  }

  // for sequence runs the sequence_activity will be set but will be null for activity only runs
  if (sequenceActivity) {
    query = query.where("sequence_activity", "==", sequenceActivity);
  }

  // get the most latest run (might be multiple on the first load of a previously run sequence
  // as this won't have an initial sequenceActivity to query)
  query = query.orderBy("updated_at", "desc");

  const doc = await query.get();
  if (doc.empty) {
    return null;
  }

  return {id: doc.docs[0].id, data: doc.docs[0].data() as IApRun};
};

export const createOrUpdateApRun = async ({sequenceActivity, pageId}: {sequenceActivity?: string, pageId: number}) => {
  if (!portalData) {
    throw new Error("Must set portal data first");
  }

  let apRun: IApRun;
  const existingApRun = await getApRun(sequenceActivity);

  // for sequence runs the sequence_activity will be set but will be null for activity only runs
  const common: IBaseApRun = {
    sequence_activity: sequenceActivity || null,
    page_id: pageId,
    created_at: existingApRun?.data.created_at || Date.now(),
    updated_at: Date.now(),
  };

  if (portalData.type === "authenticated") {
    apRun = {
      type: "authenticated",
      platform_id: portalData.platformId,
      platform_user_id: portalData.platformUserId,
      context_id: portalData.contextId,
      resource_url: portalData.resourceUrl,
      ...common
    };
  } else {
    apRun = {
      type: "anonymous",
      run_key: portalData.runKey,
      ...common
    };
  }

  let firestoreSetPromise: Promise<any>;

  if (existingApRun) {
    firestoreSetPromise = app.firestore()
      .doc(apRunsPath(existingApRun.id))
      .set(apRun as Partial<firebase.firestore.DocumentData>);
  } else {
    firestoreSetPromise = app.firestore()
      .collection(apRunsPath())
      .add(apRun as Partial<firebase.firestore.DocumentData>);
  }

  requestTracker.registerRequest(firestoreSetPromise);

  return firestoreSetPromise;
};
