import { useCallback, useEffect, useState } from "react";
import { formatSettings, ISizingSettings, parseSettings } from "./settings";

// The settings live in the URL's hash. Editing the hash by hand (or from a test) applies the
// new settings without a reload. Changing them from the page replaces the history entry
// rather than adding one, so the Back button leaves the page instead of stepping through
// each change.
export function useHashSettings(): [ISizingSettings, (next: ISizingSettings) => void] {
  const [settings, setSettings] = useState(() => parseSettings(window.location.hash));

  useEffect(() => {
    // Keep the current settings object when the hash holds the same values, so catching up
    // doesn't rebuild the activity and remount the interactive.
    const handleHashChange = () => setSettings(current => {
      const parsed = parseSettings(window.location.hash);
      return formatSettings(parsed) === formatSettings(current) ? current : parsed;
    });
    window.addEventListener("hashchange", handleHashChange);
    // The hash can change between the first render and this effect, before the listener exists.
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const updateSettings = useCallback((next: ISizingSettings) => {
    window.history.replaceState(null, "", formatSettings(next));
    setSettings(next);
  }, []);

  return [settings, updateSettings];
}
