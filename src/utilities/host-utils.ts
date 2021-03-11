export const isOfflineHost = (host: string) => (host === "localhost:11002") || (host === "activity-player-offline.concord.org");

export const getCanonicalHostname = () => {
  if(window.location.hostname === "activity-player-offline.concord.org") {
    return "activity-player.concord.org";
  }
  return window.location.hostname;
}

export const isProductionOrigin = (origin: string) => {
  return origin === "https://activity-player.concord.org" || origin === "https://activity-player-offline.concord.org";
};
