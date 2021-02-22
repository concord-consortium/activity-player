// import { WrappedDBAnswer, FirebaseAppName } from "./firebase-db";
import * as FirebaseImp from "./firebase-db";
import { IAnonymousPortalData, IPortalData } from "./portal-api";
import { IExportableAnswerMetadata } from "./types";
import {DexieStorage} from "./dexie-storage";
import { refIdToAnswersQuestionId } from "./utilities/embeddable-utils";

export interface IStorageInitializer { name: FirebaseImp.FirebaseAppName, preview: boolean }

export interface WrappedDBAnswer {
  meta: IExportableAnswerMetadata;
  interactiveState: any;
}

export const docToWrappedAnswer = (doc: firebase.firestore.DocumentData) => {
  const getInteractiveState = () => {
    const reportState = JSON.parse(doc.report_state);
    const returnObject = JSON.parse(reportState.interactiveState);
    console.log(`C&N: ----- firestore:`);
    console.dir(returnObject);
    return returnObject;
  };
  const interactiveState = getInteractiveState();
  const wrappedAnswer: WrappedDBAnswer = {
    meta: doc as IExportableAnswerMetadata,
    interactiveState
  };
  return wrappedAnswer;
};
export interface StorageInterface {
  // These seem to be FireStore specific:
  onFirestoreSaveTimeout: (handler: () => void) => void,
  onFirestoreSaveAfterTimeout:  (handler: () => void) => void,
  initializeDB: ({name, preview}: IStorageInitializer) => Promise<firebase.firestore.Firestore>,
  initializeAnonymousDB: (preview: boolean) => Promise<firebase.firestore.Firestore>
  signInWithToken: (rawFirestoreJWT: string) => Promise<firebase.auth.UserCredential>,

  // These seem like authentication and identity concerns, and should be extracted:
  setPortalData: (_portalData: IPortalData | null) => void,
  getPortalData: () => IPortalData | IAnonymousPortalData | null,
  setAnonymousPortalData: (_portalData: IAnonymousPortalData) => void,

  // These are directly related to storing student answers and fetching them back
  watchAnswer(embeddableRefId: string, callback: (wrappedAnswer: WrappedDBAnswer | null) => void): () => void
  watchAllAnswers: (callback: (wrappedAnswer: WrappedDBAnswer[]) => void) => void,
  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => void,
  getLearnerPluginStateDocId: (pluginId: number) => string|undefined,
  getCachedLearnerPluginState: (pluginId: number) => string|null,
  getLearnerPluginState: (pluginId: number) => Promise<string|null>,
  setLearnerPluginState: (pluginId: number, state: string) => Promise<string>,
  checkIfOnline: () => Promise<boolean>
}

const FireStoreStorageProvider: StorageInterface = {
  // TODO: Specific to FireStore:
  onFirestoreSaveTimeout: (handler: () => void) => FirebaseImp.onFirestoreSaveTimeout(handler),
  onFirestoreSaveAfterTimeout: (handler: () => void) => FirebaseImp.onFirestoreSaveAfterTimeout(handler),
  initializeDB: ({name, preview}: IStorageInitializer) => FirebaseImp.initializeDB({name, preview}),
  initializeAnonymousDB: (preview: boolean) => FirebaseImp.initializeAnonymousDB(preview),
  signInWithToken: (rawFirestoreJWT: string) =>FirebaseImp.signInWithToken(rawFirestoreJWT),

  // TODO: authentication and identity concerns, and should be extracted elsewhere:
  setPortalData: (_portalData: IPortalData | null) => FirebaseImp.setPortalData(_portalData),
  getPortalData: () => FirebaseImp.getPortalData(),
  setAnonymousPortalData: (_portalData: IAnonymousPortalData) => FirebaseImp.setAnonymousPortalData(_portalData),

  // Saving and Loading student work
  watchAnswer:  (embeddableRefId: string, callback: (wrappedAnswer: WrappedDBAnswer | null) => void) => FirebaseImp.watchAnswer(embeddableRefId, callback),
  watchAllAnswers: (callback: (wrappedAnswer: WrappedDBAnswer[]) => void) => FirebaseImp.watchAllAnswers(callback),

  // Save an answer to Firebase
  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => FirebaseImp.createOrUpdateAnswer(answer),
  getLearnerPluginStateDocId: (pluginId: number) => FirebaseImp.getLearnerPluginStateDocId(pluginId),
  getCachedLearnerPluginState: (pluginId: number) => FirebaseImp.getCachedLearnerPluginState(pluginId),
  getLearnerPluginState: (pluginId: number) => FirebaseImp.getLearnerPluginState(pluginId),
  setLearnerPluginState: (pluginId: number, state: string) => FirebaseImp.setLearnerPluginState(pluginId,state),
  checkIfOnline: () => FirebaseImp.checkIfOnline()
};


const indexDBConnection = new DexieStorage();

const DexieStorageProvider = {...FireStoreStorageProvider,

  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => {
    console.dir(answer);
    indexDBConnection.answers.put(answer);
  },

  watchAnswer: (embeddableRefId: string, callback: (wrappedAnswer: WrappedDBAnswer | null) => void) => {
    const questionId = refIdToAnswersQuestionId(embeddableRefId);
    const getAnswerFromIndexDB = (qID: string) => {
      const foundAnswers = indexDBConnection
        .answers
        .where("question_id")
        .equals(qID).toArray();
      return foundAnswers.then( (answers) => {
        return answers[0];
      });
    };

    getAnswerFromIndexDB(questionId).then( (answer: IExportableAnswerMetadata|null) => {
      if(answer){
        callback(docToWrappedAnswer(answer));
      }
    });
  }
};

export const Storage = DexieStorageProvider;
