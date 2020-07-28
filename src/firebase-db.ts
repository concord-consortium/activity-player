import * as firebase from "firebase";
import "firebase/firestore";

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
