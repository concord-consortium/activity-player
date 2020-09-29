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
import { IPortalData, IAnonymousPortalData, anonymousPortalData } from "./portal-api";
import { answersQuestionIdToRefId } from "./utilities/embeddable-utils";
import { IExportableAnswerMetadata, LTIRuntimeAnswerMetadata, AnonymousRuntimeAnswerMetadata } from "./types";
import { queryValueBoolean } from "./utilities/url-query";

export type FirebaseAppName = "report-service-dev" | "report-service-pro";

let portalData: IPortalData | IAnonymousPortalData;

const answersPath = (answerId?: string) =>
  `sources/${portalData?.database.sourceKey}/answers${answerId ? "/" + answerId : ""}`;

// The LocalDB stores the data fetched from the DB by the `watchX` methods. The data gets added to keys
// such as `${refId}/answers`, which can that be listened to by listeners. By keeping this
// local copy, we can provide listeners with data even if the listener is added after the data is fetched.
interface LocalDB {
  [path: string]: any;
}

const localDB: LocalDB = {};
export const localAnswerPath = (refId: string) => `answers/${refId}`;
const isAnswerPath = (path: string) => /^answers\/.*/.test(path);

export type DBChangeListener = (value: any) => void;

const listeners: {[path: string]: DBChangeListener[]} = {};

type initialDataState = "NOT_REQUESTED" | "PENDING" | "COMPLETED";

// whether we have completed an initil request for a collection
const initialData: {[collection: string]: initialDataState} = {
  answers: "NOT_REQUESTED"
};

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

export async function initializeDB(name: FirebaseAppName) {
  const config = configurations[name];
  firebase.initializeApp(config);

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
  if (queryValueBoolean("clearFirestorePersistence")) {
    // we cannot enable the persistence until the
    // clearing is complete, so this await is necessary
    await firebase.firestore().clearPersistence();
  }

  if (queryValueBoolean("enableFirestorePersistence")) {
    await firebase.firestore().enablePersistence({ synchronizeTabs: true });
    await firebase.firestore().disableNetwork();
  }

  return firebase.firestore();
}

export async function initializeAnonymousDB() {
  portalData = anonymousPortalData();
  return initializeDB(portalData.database.appName);
}

export const signInWithToken = async (rawFirestoreJWT: string) => {
  // It's actually useful to sign out first, as firebase seems to stay signed in between page reloads otherwise.
  await firebase.auth().signOut();
  return firebase.auth().signInWithCustomToken(rawFirestoreJWT);
};

export const setPortalData = (_portalData: IPortalData) => {
  portalData = _portalData;
};

type DocumentsListener = (docs: firebase.firestore.DocumentData[]) => void;

const watchCollection = (path: string, listener: DocumentsListener) => {
  if (!portalData) {
    throw new Error("Must set portal data first");
  }

  let query: firebase.firestore.Query<firebase.firestore.DocumentData>;
  if (portalData.type === "authenticated") {     // logged in user
    query = firebase.firestore().collection(path)
      .where("platform_id", "==", portalData.platformId)
      .where("resource_link_id", "==", portalData.resourceLinkId)
      .where("context_id", "==", portalData.contextId);
    if (portalData.userType === "learner") {
      query = query.where("platform_user_id", "==", portalData.platformUserId.toString());
    }
  } else {
    query = firebase.firestore().collection(path)
      .where("run_key", "==", portalData.runKey);
  }

  query.onSnapshot((snapshot: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>) => {
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

export const addDBListener = (path: string, listener: DBChangeListener) => {
  if (!listeners[path]) {
    listeners[path] = [];
  }
  listeners[path].push(listener);

  // notify right away if we already have data (asynchronously, so that a listener that wants
  // to immediately unsubscribe will get the unsubscribe method first).
  if (localDB[path]) {
    setTimeout(() => {
      listener(localDB[path]);
    }, 0);
  }

  const unsubscribe = () => {
    const idx = listeners[path].indexOf(listener);
    if (idx > -1) {
      listeners[path].splice(idx, 1);
    }
  };
  return unsubscribe;
};

const notifyListeners = (path: string, value: any) => {
  listeners[path]?.forEach(listener => listener(value));
};

// If we've already requested data for this collection before, return immediately whether or not
// this path has a value. If we have a requestb pending, return the value once on the first update.
// equivalent to `firebase.once`
export const getCurrentDBValue = (path: string) => new Promise<any>((resolve, reject) => {
  const collection = path.split("/")[0];

  if (initialData[collection] !== "PENDING") {
    resolve(localDB[path]);
  }
  else {
    const unsubscribe = addDBListener(path, (val => {
      resolve(val);
      unsubscribe();
    }));
  }
});

// updates `state.activity` to add `interactiveState` to embeddables
const handleAnswersUpdated = (answers: firebase.firestore.DocumentData[]) => {
  const getInteractiveState = (answer: firebase.firestore.DocumentData) => {
    const reportState = JSON.parse(answer.report_state);
    return JSON.parse(reportState.interactiveState);
  };

  answers.forEach(answer => {
    const refId = answersQuestionIdToRefId(answer.question_id);
    const interactiveState = getInteractiveState(answer);
    const wrappedAnswer = {
      meta: answer,
      interactiveState
    };
    notifyListeners(localAnswerPath(refId), wrappedAnswer);
    localDB[localAnswerPath(refId)] = wrappedAnswer;
  });

  // if this is our first notification, notify all `answers` listeners if they have empty data, as they
  // would not have been notified of this above
  if (initialData.answers === "PENDING") {
    Object.keys(listeners).forEach(path => {
      if (isAnswerPath(path) && !localDB[path]) {
        notifyListeners(path, null);
      }
    });
  }

  // permanently set that we have completed initial request for answers data
  initialData.answers = "COMPLETED";
};

export const watchAnswers = () => {
  initialData.answers = "PENDING";
  watchCollection(answersPath(), handleAnswersUpdated);
};

export function createOrUpdateAnswer(answer: IExportableAnswerMetadata) {
  if (!portalData) {
    return;
  }

  let postAnswer;

  if (portalData.type === "authenticated") {
    postAnswer = {
      ...answer,
      platform_id: portalData.platformId,
      platform_user_id: portalData.platformUserId.toString(),
      context_id: portalData.contextId,
      resource_link_id: portalData.resourceLinkId,
      source_key: portalData.database.sourceKey,
      tool_id: portalData.toolId,
      resource_url: portalData.resourceUrl,
      run_key: "",
    } as LTIRuntimeAnswerMetadata;
  } else {
    postAnswer = {
      ...answer,
      run_key: portalData.runKey,
      source_key: portalData.database.sourceKey,
      resource_url: portalData.resourceUrl,
      tool_id: portalData.toolId,
      tool_user_id: "anonymous",
    } as AnonymousRuntimeAnswerMetadata;
  }

  return firebase.firestore()
      .doc(answersPath(answer.id))
      .set(postAnswer, {merge: true});
}
