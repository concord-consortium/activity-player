export const isNetworkConnected = () => window.navigator.onLine;

export const monitorNetworkConnection = (callback: (connected: boolean) => void) => {
  const isConnected = () => callback(true);
  const isNotConnected = () => callback(false);

  window.addEventListener("online", isConnected);
  window.addEventListener("offline", isNotConnected);

  callback(isNetworkConnected());

  return () => {
    window.removeEventListener("online", isConnected);
    window.removeEventListener("offline", isNotConnected);
  };
};
