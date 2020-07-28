import * as firebase from "firebase";
import "firebase/firestore";
import { IPortalData } from "./portal-api";

export type FirebaseAppName = "report-service-dev" | "report-service-pro";
export const DEFAULT_FIREBASE_APP: FirebaseAppName = "report-service-pro";

type IDocumentsListener = (docs: firebase.firestore.DocumentData[]) => void;

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

const watchCollection = (path: string, portalData: IPortalData, listener: IDocumentsListener) => {
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

export const watchAnswers = (portalData: IPortalData, listener: IDocumentsListener) => {
  const answersPath = `sources/${portalData.database.sourceKey}/answers`;
  watchCollection(answersPath, portalData, listener);
};
