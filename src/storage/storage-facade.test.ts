
import {
  initStorage, IInitStorageParams,
  DexieStorageProvider, FireStoreStorageProvider,
  TrackOfflineResourceUrl, IStorageInterface
} from "./storage-facade";
import "firebase/firestore";
import { IPortalData, PortalJWT } from "../portal-api";

const goodPortalData: IPortalData = {
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
  loggingUsername: "1@example.com"
};

const getGoodPortalJWT = ():PortalJWT =>  {
  return {
    exp: Date.now() / 1000 + 60 * 1000,
    domain: "test",
    alg: "alg",
    iat: Date.now() / 1000,
    class_info_url: "class_info_url",
    learner_id: 777,
    offering_id: 777,
    uid: 777,
    user_id: "777",
    user_type: "learner"
  };
};

describe("Storage Facade", () => {

  const storageInitParams: IInitStorageParams = {
    offline: true,
    preview: false,
    name: "report-service-dev"
  };

  let storage: IStorageInterface | null = null;

  describe("initStorage", () => {
    it("it returns a Dexie storage provider if we are offline", async () => {
      storageInitParams.offline = true;
      storage = await initStorage(storageInitParams);
      expect(storage).toBeInstanceOf(DexieStorageProvider);
    });

    it("it returns a FireBase storage provider if we are offline", async () => {
      storageInitParams.offline = false;
      storage = await initStorage(storageInitParams);
      expect(storage).toBeInstanceOf(FireStoreStorageProvider);
    });
  });



  describe("canSyncData", () => {
    describe("DexieStorageProvider", () => {
      beforeEach(async () => {
        storageInitParams.offline = true;
        storage = await initStorage(storageInitParams);
        storage.setPortalData(goodPortalData);
      });

      describe("With valid portal JWT", () => {
        beforeEach(() => goodPortalData.portalJWT = getGoodPortalJWT());
        describe("When on the correct activity", () => {
          beforeEach(() => TrackOfflineResourceUrl(goodPortalData.resourceUrl));

          it("can Sync", async () => {
            expect(storage?.canSyncData()).toBeTruthy();
          });
        });

        describe("When on a different activity", () => {
          beforeEach(() => TrackOfflineResourceUrl("bogus"));
          it("Can't Sync", async () => {
            expect(storage?.canSyncData()).toBeFalsy();
          });
        });
      });

      describe("Without a portal JWT", () => {
        beforeEach(() => goodPortalData.portalJWT = undefined);
        it("can't Sync", async () => {
          expect(storage?.canSyncData()).toBeFalsy();
        });
      });
    });

    describe("FireStoreStorageProvider", () => {
      beforeEach(() => storageInitParams.offline = false);
      it("can't sync", async () => {
        expect(storage?.canSyncData()).toBeFalsy();
      });
    });
  });
});
