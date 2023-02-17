// NOTE: this code needs to be split up and moved to other repos before this feature branch is merged

const SessionStorageKey = "readAloud";

export const isReadAloudAvailable = () => {
  return !!window.speechSynthesis;
};

export const saveReadAloudSetting = (readAloud: boolean) => {
  try {
    window.sessionStorage.setItem(SessionStorageKey, `${readAloud}`);
  } catch (e) {
    // no-op
  }
};

export const loadReadAloudSetting = () => {
  let readAloud = "false";
  try {
    readAloud = window.sessionStorage.getItem(SessionStorageKey) || "false";
  } catch (e) {
    // no-op
  }
  return isReadAloudAvailable() && readAloud === "true";
};

