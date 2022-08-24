import ClientOAuth2 from "client-oauth2";
import { hashValue, queryValue } from "./url-query";

// Portal has to have AuthClient configured with this clientId.
// The AuthClient has to have:
// - redirect URLs of each branch being tested
// - "client type" needs to be configured as 'public', to allow browser requests
const OAUTH_CLIENT_NAME = "activity-player";
const PORTAL_AUTH_PATH = "/auth/oauth_authorize";

let accessToken: string | null = null;

export const getBearerToken = () => {
  // `accessToken` variable will be available after OAuth redirect.
  // However, AP is mostly launched with a short-lived token provided as an URL param.
  // Both tokens have the same purpose and they let AP obtain Portal JWT.
  return queryValue("token") || accessToken;
};

// Returns true if it is redirecting
export const initializeAuthorization = () => {
  const state = hashValue("state");
  accessToken = hashValue("access_token") || null;

  if (accessToken && state) {
    const savedParamString = sessionStorage.getItem(state);
    window.history.pushState(null, "Activity Player", savedParamString);
  }
  else {
    const authDomain = queryValue("auth-domain");

    if (authDomain) {
      const key = Math.random().toString(36).substring(2,15);
      sessionStorage.setItem(key, window.location.search);
      authorizeInPortal(authDomain, OAUTH_CLIENT_NAME, key);
      return true;
    }
  }
  return false;
};

export const authorizeInPortal = (portalUrl: string, oauthClientName: string, state: string) => {
  const portalAuth = new ClientOAuth2({
    clientId: oauthClientName,
    redirectUri: window.location.origin + window.location.pathname,
    authorizationUri: `${portalUrl}${PORTAL_AUTH_PATH}`,
    state
  });
  // Redirect
  window.location.assign(portalAuth.token.getUri());
};
