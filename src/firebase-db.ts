/**
 * The firebase-db handles initializing the connection to the firestore database, signing in, listening
 * to data and updating data.
 * We want to start listening for data such as student answers as soon as possible when the activity
 * player is loaded, but we also want individual components such as embeddables to request the data and
 * be notified of changes. To support this, we kick off the data watching by calling e.g. `watchAnswers`,
 * and then later can request the current data or to append a listener for that data.
 */

import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
// import "firebase/database"; // TODO: add if we want to use for testing if connected
import { IPortalData, IAnonymousPortalData, anonymousPortalData } from "./portal-api";
import { refIdToAnswersQuestionId } from "./utilities/embeddable-utils";
import { IExportableAnswerMetadata, LTIRuntimeAnswerMetadata, AnonymousRuntimeAnswerMetadata, IAuthenticatedLearnerPluginState, IAnonymousLearnerPluginState } from "./types";
import { queryValueBoolean } from "./utilities/url-query";
import { RequestTracker } from "./utilities/request-tracker";
import { docToWrappedAnswer, IWrappedDBAnswer } from "./storage-facade";

export type FirebaseAppName = "report-service-dev" | "report-service-pro";

let portalData: IPortalData | IAnonymousPortalData | null;

const answersPath = (answerId?: string) =>
  `sources/${portalData?.database.sourceKey}/answers${answerId ? "/" + answerId : ""}`;

const learnerPluginStatePath = (docId: string) =>
  `sources/${portalData?.database.sourceKey}/plugin_states/${docId}`;


export type DBChangeListener = (wrappedDBAnswer: IWrappedDBAnswer | null) => void;

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
    apiKey: "AIzaSyCvxKWuYDgJ4r4o8JeNAOYusx0aV71_YuE",
    authDomain: "report-service-dev.firebaseapp.com",
    databaseURL: "https://report-service-dev.firebaseio.com",
    projectId: "report-service-dev",
    storageBucket: "report-service-dev.appspot.com",
    messagingSenderId: "402218300971",
    appId: "1:402218300971:web:32b7266ef5226ff7"
  },
  "report-service-pro": {
    apiKey: "AIzaSyBmNSa2Uz3DaEwKclsvHPBwfucSmZWAAzg",
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

export const signOut = async() =>{
  try {
    await app.auth().signOut();
  }
  catch(e) {
    // maybe we weren't signed in?
    console.error("unable to signout from FireStore:");
    console.error(e);
  }
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

const watchAnswerDocs = (listener: DocumentsListener, questionId?: string) => {
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



// Watches ONE question answer defined by embeddableRefId.
export const watchAnswer = (embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void) => {
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
    callback(docToWrappedAnswer(answers[0]));
  }, questionId); // limit observer to single question
};

// Watches ALL the answers for the given activity.
export const watchAllAnswers = (callback: (wrappedAnswer: IWrappedDBAnswer[]) => void) => {
  // Note that watchAnswerDocs returns unsubscribe method.
  return watchAnswerDocs((answers: firebase.firestore.DocumentData[]) => {
    callback(answers.map(doc => docToWrappedAnswer(doc)));
  });
};

export function createOrUpdateAnswer(answer: IExportableAnswerMetadata) {
  if (!portalData) {
    return;
  }

  let answerDocData: LTIRuntimeAnswerMetadata | AnonymousRuntimeAnswerMetadata;

  if (portalData.type === "authenticated") {
    const ltiAnswer: LTIRuntimeAnswerMetadata = {
      ...answer,
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
    answerDocData = ltiAnswer;
  } else {
    const anonymousAnswer: AnonymousRuntimeAnswerMetadata = {
      ...answer,
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

const cachedLearnerPluginState: Record<number, string|null> = {};
export const getCachedLearnerPluginState = (pluginId: number) => cachedLearnerPluginState[pluginId] || null;

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

  await app.firestore()
    .doc(learnerPluginStatePath(docId))
    .set(learnerPluginState);

  cachedLearnerPluginState[pluginId] = state;

  return state;
};

export const checkIfOnline = () => {
  return new Promise<boolean>((resolve) => {
    /*

    DISABLED FOR NOW: need to decide if we also want to add both the size of the database import
    and enable the database in the Firebase console.  Use a POST request instead.

    const connectedRef = app.database().ref(".info/connected");
    return connectedRef.once("value")
      .then(snap => resolve(snap.val() === true))
      .catch(() => resolve(false));
    */

    // if online this will result in a 400 error due to the portal token not being included
    // we don't care about the status code, just that we get a response to check if we are online
    // NOTE: if this is the final method we need our own POST endpoint that returns 200 instead
    // of using this (free) external service which may go down
    return fetch("https://ipapi.co/json/", {method: "POST"})
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
};
