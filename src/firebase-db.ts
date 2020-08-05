/**
 * The firebase-db handles initializing the connection to the firestore database, signing in, listening
 * to data and updating data.
 * We want to start listening for data such as student answers as soon as possible when the activity
 * player is loaded, but we also want individual components such as embeddables to request the data and
 * be notified of changes. To support this, we kick off the data watching by calling e.g. `watchAnswers`,
 * and then later can request the current data or to append a listener for that data.
 */

import * as firebase from "firebase";
import "firebase/firestore";
import { IPortalData } from "./portal-api";
import { answersQuestionIdToRefId } from "./utilities/embeddable-utils";

export type FirebaseAppName = "report-service-dev" | "report-service-pro";
export const DEFAULT_FIREBASE_APP: FirebaseAppName = "report-service-pro";

let portalData: IPortalData;

// The LocalDB stores the data fetched from the DB by the `watchX` methods. The data gets added to keys
// such as `${refId}/interactiveState`, which can that be listened to by listeners. By keeping this
// local copy, we can provide listeners with data even if the listener is added after the data is fetched.
interface LocalDB {
  [path: string]: any;
}

const localDB: LocalDB = {};

export const interactiveStatePath = (refId: string) => `${refId}/interactiveState`;

export type DBChangeListener = (value: any) => void;

const listeners: {[path: string]: DBChangeListener[]} = {};

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
  return firebase.firestore();
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

  let query = firebase.firestore().collection(path)
    .where("platform_id", "==", portalData.platformId)
    .where("resource_link_id", "==", portalData.resourceLinkId);
  if (portalData.userType === "learner") {
    query = query.where("platform_user_id", "==", portalData.platformUserId.toString());
  } else {
    // "context_id" is theoretically redundant here, since we already filter by resource_link_id,
    // but that lets us use context_id value in the Firestore security rules.
    query = query.where("context_id", "==", portalData.contextId);
  }

  query.onSnapshot((snapshot: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>) => {
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(doc => doc.data());
      listener(docs);
    }
  }, (err) => {
    console.error(err);
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

// returns value immediately if it exists, or gets the value once on the first update.
// equivalent to `firebase.once`
export const getCurrentDBValue = (path: string, listener: DBChangeListener) => {
  const unsubscribe = addDBListener(path, (val => {
    listener(val);
    unsubscribe();
  }));
};

// updates `state.activity` to add `interactiveState` to embeddables
const handleAnswersUpdated = (answers: firebase.firestore.DocumentData[]) => {
  // this is annoying and possibly a bug? Embeddables are coming through with `refId`'s such
  // as "404-ManagedInteractive", while answers are coming through with `question_id`'s such
  // as "managed_interactive_404". This transforms the answer's version to the embeddable's version.
  const questionIdToRefId = (questionId: string) => {
    const snakeCaseRegEx = /(\D*)_(\d*)/gm;
    const parsed = snakeCaseRegEx.exec(questionId);
    if (parsed && parsed.length) {
      const [ , embeddableType, embeddableId] = parsed;
      const camelCased = embeddableType.split("_").map(str => str.charAt(0).toUpperCase() + str.slice(1)).join("");
      return `${embeddableId}-${camelCased}`;
    }
    return questionId;
  };

  const getInteractiveState = (answer: firebase.firestore.DocumentData) => {
    const reportState = JSON.parse(answer.report_state);
    return JSON.parse(reportState.interactiveState);
  };

  answers.forEach(answer => {
    const refId = answersQuestionIdToRefId(answer.question_id);
    const interactiveState = getInteractiveState(answer);
    notifyListeners(interactiveStatePath(refId), interactiveState);
    localDB[interactiveStatePath(refId)] = interactiveState;
  });
};

export const watchAnswers = (portalData: IPortalData) => {
  const answersPath = `sources/${portalData.database.sourceKey}/answers`;
  watchCollection(answersPath, portalData, handleAnswersUpdated);
};
