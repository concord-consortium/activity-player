// import { WrappedDBAnswer, FirebaseAppName } from "./firebase-db";
import * as FirebaseImp from "./firebase-db";
import { fetchPortalData, IAnonymousPortalData, IPortalData } from "../portal-api";
import { IExportableAnswerMetadata } from "../types";
import { dexieStorage, IDexiePluginRecord, kOfflineAnswerSchemaVersion } from "./dexie-storage";
import { refIdToAnswersQuestionId } from "../utilities/embeddable-utils";
import { DataSyncTracker } from "./data-sync-tracker";

export interface IInitStorageParams {
  name: FirebaseImp.FirebaseAppName,
  preview: boolean,
  offline: boolean
}
export interface IDBInitializer extends IInitStorageParams{
  portalData: IPortalData | IAnonymousPortalData
}


export interface IWrappedDBAnswer {
  meta: IExportableAnswerMetadata;
  interactiveState: any;
}

export type IIndexedDBAnswer = IExportableAnswerMetadata & { resource_url: string };

export type ExportableActivity = {
  resource_url: string,
  filename: string,
  version: number,
  answers: IIndexedDBAnswer[],
  pluginStates: IDexiePluginRecord[]
}

export const TrackOfflineResourceUrl = (newId: string) => {
  _currentOfflineResourceUrl = newId;
};

let _currentOfflineResourceUrl = "/testactivity.json";


// A write-though cache of the learner plugin states is kept as the plugin's
// learner state is only loaded once at app startup but it is supplied on the
// plugin init which happens on any page change.

// TODO: change to watch the learner state so that it works across sessions and
// not just on the same page

const cachedLearnerPluginState: Record<number, string|null> = {};
export const getCachedLearnerPluginState = (pluginId: number) => cachedLearnerPluginState[pluginId] || null;

export const setCachedLearnerPluginState = (pluginId: number, value: string|null) => cachedLearnerPluginState[pluginId]=value;

const localStoragePluginStateKey = (id: number) => `ActivityPlayerPluginState-plugin-${id}`;

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

export interface IStorageInterface {
  // These seem to be FireStore specific:
  onSaveTimeout?: (handler: () => void) => void,
  onSaveAfterTimeout?:  (handler: () => void) => void,

  setPortalData: (_portalData: IPortalData | IAnonymousPortalData) => void,
  initializeDB: (initializer: IDBInitializer) => Promise<void>,
  // initializeAnonymousDB?: (preview: boolean) => Promise<firebase.firestore.Firestore>
  // signInWithToken?: (rawFirestoreJWT: string) => Promise<firebase.auth.UserCredential>,

  getPortalData: () => IPortalData | IAnonymousPortalData | null,

  // These are directly related to storing student answers and fetching them back
  watchAnswer(embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void): () => void
  watchAllAnswers: (callback: (wrappedAnswer: IWrappedDBAnswer[]) => void) => void,
  createOrUpdateAnswer: (answer: IExportableAnswerMetadata) => void,
  getLearnerPluginState: (pluginId: number) => Promise<string|null>,
  setLearnerPluginState: (pluginId: number, state: string) => Promise<string>,

  // for saving a whole activity to JSON
  exportActivityToJSON: (activityId?: string) => Promise<ExportableActivity>,
  importStudentAnswersFromJSONFile: (studentAnswers: string, filename: string) => boolean,
  canSyncData(): boolean,
  syncData(): Promise<boolean>
}

class FireStoreStorageProvider implements IStorageInterface {
  portalData: IPortalData|IAnonymousPortalData;
  onSaveTimeout(handler: () => void) {
    return FirebaseImp.onFirestoreSaveTimeout(handler);
  }

  onSaveAfterTimeout (handler: () => void) {
    return FirebaseImp.onFirestoreSaveAfterTimeout(handler);
  }

  async initializeDB (initializer: IDBInitializer) {
    const {preview, portalData}  = initializer;
    this.setPortalData(portalData);
    try {
      if(portalData.type === "authenticated") {
        const token = portalData.database.rawFirebaseJWT;
        await FirebaseImp.initializeDB({
          name: portalData.database.appName,
          preview});
        await FirebaseImp.signInWithToken(token);
      } else {
        await FirebaseImp.initializeAnonymousDB(preview);
        // No sign-in required for anonymous
      }
    }
    catch (err) {
     console.error("DB authentication error:", err);
    }
  }

  setPortalData(portalData: IPortalData | IAnonymousPortalData) {
    FirebaseImp.setPortalData(portalData);
  }

  getPortalData() {
    return FirebaseImp.getPortalData();
  }

  // Saving and Loading student work
  watchAnswer(embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void){
    return FirebaseImp.watchAnswer(embeddableRefId, callback);
  }

  watchAllAnswers(callback: (wrappedAnswer: IWrappedDBAnswer[]) => void){
    return FirebaseImp.watchAllAnswers(callback);
  }

  // Save an answer to Firebase
  createOrUpdateAnswer(answer: IExportableAnswerMetadata) {
    return FirebaseImp.createOrUpdateAnswer(answer);
  }

  batchCreateOrUpdateAnswers(answers: Array<IExportableAnswerMetadata>) {
    return FirebaseImp.batchCreateOrUpdateAnswers(answers);
  }

  async getLearnerPluginState(pluginId: number) {
    if (getCachedLearnerPluginState(pluginId)) {
      return getCachedLearnerPluginState(pluginId);
    }
    const state = await FirebaseImp.getLearnerPluginState(pluginId);
    setCachedLearnerPluginState(pluginId,state);
    return state;
  }

  async setLearnerPluginState(pluginId: number, state: string){
    FirebaseImp.setLearnerPluginState(pluginId, state);
    setCachedLearnerPluginState(pluginId, state);
    return state;
  }

  // TODO: Save activity to local JSON file and allow reloading from file
  exportActivityToJSON(activityId?: string) {
    return Promise.reject("Not yet implemented for Firebase Storage");
  }

  importStudentAnswersFromJSONFile(studentAnswers: string, filename: string) {
    return true;
  }

  // We are FireStore, so our data is synced by default....
  canSyncData() { return false; }
  syncData() { return Promise.resolve(false); }

  signOut() {
    FirebaseImp.signOut();
  }
}


interface IAnswerWatcherCallback { (answer: IWrappedDBAnswer): void }
type IQuestionWatchersRecord =  Record<string, Array<IAnswerWatcherCallback>>;
class DexieStorageProvider implements IStorageInterface {
  portalData: IPortalData|IAnonymousPortalData;
  haveFireStoreConnection: boolean;
  answerWatchers: Record<string, IQuestionWatchersRecord>;

  constructor(){
    this.haveFireStoreConnection = false;
    this.answerWatchers = {};
  }

  async initializeDB (initializer: IDBInitializer) {
    const {portalData}  = initializer;
    this.setPortalData(portalData);
  }

  setPortalData(_portalData: IPortalData | IAnonymousPortalData) {

    this.portalData = _portalData;
  }

  createOrUpdateAnswer(answer: IExportableAnswerMetadata) {
    const idxDBAnswer = answer as IIndexedDBAnswer;
    idxDBAnswer.resource_url = _currentOfflineResourceUrl;
    dexieStorage.answers.put(idxDBAnswer);
    const activityAnswerWatchers = this.answerWatchers[_currentOfflineResourceUrl];
    if (!activityAnswerWatchers || !answer.question_id) {
      return;
    }
    const questionAnswerWatchers = activityAnswerWatchers[answer.question_id];
    if (!questionAnswerWatchers) {
      return;
    }
    questionAnswerWatchers.forEach((callback:IAnswerWatcherCallback) => {
      callback(docToWrappedAnswer(answer));
    });
  }

  getPortalData() {
    return this.portalData;
  }

  watchAllAnswers(callback: (wrappedAnswer: IWrappedDBAnswer[]) => void){
    console.log("WatchAllAnsweres called");
    console.log(`current resource: ${_currentOfflineResourceUrl}`);

    const foundAnswers = dexieStorage
      .answers
      .where({resource_url: _currentOfflineResourceUrl})
      .toArray();
    return foundAnswers.then((answers) => {
      console.dir(answers);
      const response = answers.map( (a) => docToWrappedAnswer(a));
      callback(response);
    });
  }

  watchAnswer(embeddableRefId: string, callback: (wrappedAnswer: IWrappedDBAnswer | null) => void) {
    const questionId = refIdToAnswersQuestionId(embeddableRefId);
    const getAnswerFromIndexDB = (qID: string) => {
      const foundAnswers = dexieStorage
        .answers
        .where({resource_url: _currentOfflineResourceUrl, question_id: qID})
        .toArray();
      return foundAnswers.then((answers) => {
        return answers[0];
      });
    };

    let activityAnswerWatchers = this.answerWatchers[_currentOfflineResourceUrl];
    if (!activityAnswerWatchers) {
      activityAnswerWatchers = {};
      this.answerWatchers[_currentOfflineResourceUrl] = activityAnswerWatchers;
    }

    let questionAnswerWatchers = activityAnswerWatchers[questionId];
    if (!questionAnswerWatchers) {
      questionAnswerWatchers = [];
      activityAnswerWatchers[questionId] = questionAnswerWatchers;
    }

    questionAnswerWatchers.push(callback);

    getAnswerFromIndexDB(questionId).then( (answer: IIndexedDBAnswer|null) => {
      if (answer) {
        callback(docToWrappedAnswer(answer));
      } else {
        callback(null);
      }
    });
    // TODO: We are supposed to return a function that will stop observing the answer ...
    // We aren't actually watching anything...
    return ()=>null;
  }

  async exportActivityToJSON(activityId?: string) {
    const currentActivityId = activityId ? activityId : _currentOfflineResourceUrl;
    const activityShortId = currentActivityId.indexOf("/") > -1 ? currentActivityId.substr(currentActivityId.lastIndexOf("/")+1).replace(".json", "") : currentActivityId;
    const filename = activityExportFileName(activityShortId);

    const getAllAnswersFromIndexDB = () => dexieStorage
      .answers
      .where({resource_url: _currentOfflineResourceUrl})
      .toArray();

    const getAllPluginStates = () => dexieStorage.pluginStates.toArray();

    const exportableActivity: ExportableActivity = {
      resource_url: currentActivityId,
      filename, version: kOfflineAnswerSchemaVersion,
      answers: [],
      pluginStates: [],
     };


    await getAllAnswersFromIndexDB().then((answers: IIndexedDBAnswer[] | null) => {
      if (answers) {
        exportableActivity.answers = answers;
        return exportableActivity;
      }
    });
    await getAllPluginStates().then((states: IDexiePluginRecord[]) => {
      if(states) {
        exportableActivity.pluginStates = states;
      }
    });
    return exportableActivity;
  }

  importStudentAnswersFromJSONFile(studentAnswers: string, filename: string) {

    const verifyActivityImport = (answers: ExportableActivity): boolean => {
      // TODO:
      // Could check the file name is in the answer file (unsure if this helps?)
      // Check if the student that saved the file is the same as the logged in user?
      // Warn that uploading answers will overwrite current answers (do we want this, or do we want to only update empty answers?)

      if (!answers) {
        return false;
      }
      if (!("resource_url" in answers)) {
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
          idxDBAnswer.resource_url = answer.resource_url;
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

  async getLearnerPluginState(pluginId: number) {
    if (getCachedLearnerPluginState(pluginId)) {
      return getCachedLearnerPluginState(pluginId);
    }
    const record = await dexieStorage.pluginStates.get({pluginId});
    const state = record?.state || null;
    setCachedLearnerPluginState(pluginId, state);
    return state;
  }

  async setLearnerPluginState(pluginId: number, state: string){
    const key = localStoragePluginStateKey(pluginId);
    localStorage.setItem(key,state);
    dexieStorage.pluginStates.put({pluginId, state});
    setCachedLearnerPluginState(pluginId, state);
    return state;
  }

  canSyncData() {
    const portalToken = (this.portalData as IPortalData)?.portalJWT;
    const correctActivity = this.portalData.resourceUrl === _currentOfflineResourceUrl;
    if(portalToken) {
      const { exp } = portalToken;
      const unixTimeStamp = Math.floor(Date.now()/1000);
      const tokenStillValid = unixTimeStamp < exp;
      return tokenStillValid && correctActivity;
    }
    return false;
  }

  ensureFirebaseConnection(): Promise<FireStoreStorageProvider> {
    const fsProvider = new FireStoreStorageProvider();
    if(! this.haveFireStoreConnection) {
      const portalData = this.portalData;
      const appName = portalData?.database.appName ?? "report-service-dev";
      return fsProvider
        .initializeDB({name: appName, preview: false, offline: false, portalData})
        .then(() =>  {
          this.haveFireStoreConnection = true;
          return fsProvider;
        })
        .catch((e) => {
          console.error(e);
          console.warn("reinitialization of database?");
          return Promise.resolve(fsProvider);
        });
    }
    return Promise.resolve(fsProvider);
  }

  // This is hack to simulate requests taking some time.
  fakeWaitingPromise(timeToResolve=5000) {
    return new Promise((res) => window.setTimeout(()=> res(), timeToResolve));
  }

  syncData(): Promise<boolean> {
    const portalData = this.portalData;
    if(portalData) {
      // DataSyncTracker will emit an event that tells plugins
      // that we are online, and its time to save data:
      const mySyncTracker = new DataSyncTracker(60 * 30, 5);
      const portalResourceUrl = portalData.resourceUrl;
      // Save student answers ...
      const answerSavingPromise = this.ensureFirebaseConnection()
        .then((fsProvider)  => {
          dexieStorage.answers
            .where({resource_url: portalResourceUrl})
            .toArray()
            .then((answers) => {
              console.dir(answers);
              return fsProvider.batchCreateOrUpdateAnswers(answers);
            });
      });

      // Save learner plugin states ...
      const learnerPluginStateSavingPromise = this.ensureFirebaseConnection()
        .then((fsProvider)  => {
          dexieStorage
            .pluginStates
            .toArray()
            .then((pluginStates) => {
              for(const pState of pluginStates) {
                const {pluginId, state} = pState;
                if(state) {
                  // TODO: Look into FireStore Batch operations
                  fsProvider.setLearnerPluginState(pluginId, state);
                }
              }
              return this.fakeWaitingPromise();
            });
      });

      mySyncTracker.addPromise(answerSavingPromise);
      mySyncTracker.addPromise(learnerPluginStateSavingPromise);
      return mySyncTracker.start()
        .catch((e) => {
          console.error("Could not sync local indexDB to FireStore:");
          console.error(e);
          this.haveFireStoreConnection = false;
          return Promise.resolve(false);
        });
    }
    return Promise.resolve(false);
  }

}

let storageInstance: IStorageInterface;

export const initStorage = async (config: IInitStorageParams) => {
  const portalData = await fetchPortalData();
  const initConfig = { portalData, ...config};

  if(config?.offline) {
    storageInstance = new DexieStorageProvider();
  }
  else {
    storageInstance = new FireStoreStorageProvider();
  }
  await storageInstance.initializeDB(initConfig);
  return storageInstance;
};

export const getStorage = () => {
  return storageInstance;
};
