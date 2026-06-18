import { RegistryJson } from "./types";

export const REGISTRY_URL =
  "https://models-resources.concord.org/runtime-config/interactive-override-registry.json";

export const fetchRegistry = async (): Promise<RegistryJson> => {
  const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Registry fetch failed with status ${response.status}`);
  }
  const body = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Registry body is not a JSON object");
  }
  return body as RegistryJson;
};
