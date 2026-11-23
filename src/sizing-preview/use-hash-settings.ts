import { useCallback, useEffect, useState } from "react";
import { formatSettings, ISizingSettings, parseSettings } from "./settings";

// The settings live in the URL's hash. Editing the hash by hand (or from a test) applies the
// new settings without a reload. Changing them from the page replaces the history entry
// rather than adding one, so the Back button leaves the page instead of stepping through
// each change.
export function useHashSettings(): [ISizingSettings, (next: ISizingSettings) => void] {
  const [settings, setSettings] = useState(() => parseSettings(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => setSettings(parseSettings(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const updateSettings = useCallback((next: ISizingSettings) => {
    window.history.replaceState(null, "", formatSettings(next));
    setSettings(next);
  }, []);

  return [settings, updateSettings];
}
