// import { WrappedDBAnswer, FirebaseAppName } from "./firebase-db";
import * as FirebaseImp from "./firebase-db";
import { IAnonymousPortalData, IPortalData } from "./portal-api";
import { IExportableAnswerMetadata } from "./types";
import {dexieStorage, kOfflineAnswerSchemaVersion} from "./dexie-storage";
import { refIdToAnswersQuestionId } from "./utilities/embeddable-utils";

export interface IStorageInitializer { name: FirebaseImp.FirebaseAppName, preview: boolean }

export interface IWrappedDBAnswer {
  meta: IExportableAnswerMetadata;
  interactiveState: any;
}

export type IIndexedDBAnswer = IExportableAnswerMetadata & { activity: string };

export type ExportableActivity = { activity: string, filename: string, version: number, answers: IIndexedDBAnswer[] };

export const TrackOfflineActivityId = (newId: string) => {
  _currentOfflineActivityId = newId;
};
let _currentOfflineActivityId = "/testactivity.json";

export const docToWrappedAnswer = (doc: firebase.firestore.DocumentData) => {
  const getInteractiveState = () => {
    const reportState = JSON.parse(doc.report_state);
    const returnObject = JSON.parse(reportState.interactiveState);
    return returnObject;
  };

  const interactiveState = getInteractiveState();
  const wrappedAnswer: IWrappedDBAnswer = {
    meta: doc as IExportableAnswerMetadata,
    interactiveState
  };
  return wrappedAnswer;
};

const activityExportFileName = (activity: string) => {
  const d = new Date();
  const year = (d.getFullYear()).toString();
  let month = (d.getMonth() + 1).toString();
  let day = (d.getDate()).toString();

  if (month.length < 2) {
    month = "0" + month;
  }
  if (day.length < 2) {
    day = "0" + day;
  }

  // get the activity name - or improvise

  return ["Activity_", activity, "_", year, month, day].join("");
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
  watchAnswer(embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void): () => void
  watchAllAnswers: (callback: (wrappedAnswer: IWrappedDBAnswer[]) => void) => void,
  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => void,
  getLearnerPluginStateDocId: (pluginId: number) => string|undefined,
  getCachedLearnerPluginState: (pluginId: number) => string|null,
  getLearnerPluginState: (pluginId: number) => Promise<string|null>,
  setLearnerPluginState: (pluginId: number, state: string) => Promise<string>,
  checkIfOnline: () => Promise<boolean>,

  // for saving a whole activity to JSON
  exportActivityToJSON: (activityId?: string) => Promise<ExportableActivity>
  importStudentAnswersFromJSONFile: (studentAnswers: string, filename: string) => boolean
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
  watchAnswer:  (embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void) => FirebaseImp.watchAnswer(embeddableRefId, callback),
  watchAllAnswers: (callback: (wrappedAnswer: IWrappedDBAnswer[]) => void) => FirebaseImp.watchAllAnswers(callback),

  // Save an answer to Firebase
  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => FirebaseImp.createOrUpdateAnswer(answer),
  getLearnerPluginStateDocId: (pluginId: number) => FirebaseImp.getLearnerPluginStateDocId(pluginId),
  getCachedLearnerPluginState: (pluginId: number) => FirebaseImp.getCachedLearnerPluginState(pluginId),
  getLearnerPluginState: (pluginId: number) => FirebaseImp.getLearnerPluginState(pluginId),
  setLearnerPluginState: (pluginId: number, state: string) => FirebaseImp.setLearnerPluginState(pluginId,state),
  checkIfOnline: () => FirebaseImp.checkIfOnline(),

  // TODO: Save activity to local JSON file and allow reloading from file
  exportActivityToJSON: (activityId?: string) => Promise.reject("Not yet implemented for Firebase Storage"),
  importStudentAnswersFromJSONFile: (studentAnswers: string, filename: string) => true
};

const DexieStorageProvider = {...FireStoreStorageProvider,

  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => {
    const idxDBAnswer = answer as IIndexedDBAnswer;
    idxDBAnswer.activity = _currentOfflineActivityId;
    dexieStorage.answers.put(idxDBAnswer);
  },

  watchAllAnswers: (callback: (wrappedAnswer: IWrappedDBAnswer[]) => void) => {
    const foundAnswers = dexieStorage
      .answers
      .where("activity")
      .equals(_currentOfflineActivityId)
      .toArray();
    return foundAnswers.then((answers) => {
      const response = answers.map( (a) => docToWrappedAnswer(a));
      callback(response);
    });
  },

  watchAnswer: (embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void) => {
    const questionId = refIdToAnswersQuestionId(embeddableRefId);
    const getAnswerFromIndexDB = (qID: string) => {
      const foundAnswers = dexieStorage
        .answers
        .where("question_id")
        .equals(qID).toArray();
      return foundAnswers.then((answers) => {
        return answers[0];
      });
    };

    getAnswerFromIndexDB(questionId).then( (answer: IIndexedDBAnswer|null) => {
      if (answer) {
        callback(docToWrappedAnswer(answer));
      } else {
        callback(null);
      }
    });
  },


  exportActivityToJSON: (activityId?: string) => {
    const currentActivityId = activityId ? activityId : _currentOfflineActivityId;
    const activityShortId = currentActivityId.indexOf("/") > -1 ? currentActivityId.substr(currentActivityId.lastIndexOf("/")+1).replace(".json", "") : currentActivityId;
    const filename = activityExportFileName(activityShortId);
    const getAllAnswersFromIndexDB = () => {
      const foundAnswers = dexieStorage
        .answers
        .where("activity")
        .equals(currentActivityId).toArray();
      return foundAnswers.then((answers) => {
        return answers;
      });
    };

    return getAllAnswersFromIndexDB().then((answers: IIndexedDBAnswer[] | null) => {
      // Adding an explicit variable for the exportable activity for Typescript reasons
      const exportableActivity: ExportableActivity = { activity: currentActivityId, filename, version: kOfflineAnswerSchemaVersion, answers: [] };
      if (answers) {
        exportableActivity.answers = answers;
        return exportableActivity;
      } else {
        return exportableActivity;
      }
    });
  },

  importStudentAnswersFromJSONFile: (studentAnswers: string, filename: string) => {

    const verifyActivityImport = (answers: ExportableActivity): boolean => {
      // TODO:
      // Could check the file name is in the answer file (unsure if this helps?)
      // Check if the student that saved the file is the same as the logged in user?
      // Warn that uploading answers will overwrite current answers (do we want this, or do we want to only update empty answers?)

      if (!answers) {
        return false;
      }
      if (!("activity" in answers)) {
        return false;
      }
      if (!("version" in answers)){
        return false;
      }
      if (!answers.version || answers.version <= 0 || answers.version > kOfflineAnswerSchemaVersion) {
        return false;
      }

      console.log(`The file ${filename} appears valid`);
      return true;
    };

    try {
      const parsedAnswers = JSON.parse(studentAnswers) as ExportableActivity;
      if (verifyActivityImport(parsedAnswers)) {
        // Import answers to indexedDB
        parsedAnswers.answers.forEach((answer: IIndexedDBAnswer) => {
          const idxDBAnswer = answer as IIndexedDBAnswer;
          // TODO: what happens if the answers loaded are for a different activity?
          idxDBAnswer.activity = answer.activity;
          dexieStorage.answers.put(idxDBAnswer);
        });
        return true;
      } else {
        return false;
      }

    } catch (ex) {
      console.log(ex);
      return false;
    }

  }
};

export const Storage = DexieStorageProvider;
