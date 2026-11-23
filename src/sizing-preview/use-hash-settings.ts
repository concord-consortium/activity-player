import { useCallback, useEffect, useState } from "react";
import { formatSettings, ISizingSettings, parseSettings } from "./settings";

// The settings live in the URL's hash. Editing the hash by hand (or from a test) applies the
// new settings without a reload. Changing them from the page replaces the history entry
// rather than adding one, so the Back button leaves the page instead of stepping through
// each change.
// Compares every field. formatSettings leaves out settings that don't apply to the current
// layout or method, so comparing the formatted hashes would miss a change to one of those.
const sameSettings = (a: ISizingSettings, b: ISizingSettings) =>
  (Object.keys(a) as (keyof ISizingSettings)[]).every(key => a[key] === b[key]);

export function useHashSettings(): [ISizingSettings, (next: ISizingSettings) => void] {
  const [settings, setSettings] = useState(() => parseSettings(window.location.hash));

  useEffect(() => {
    // Keep the current settings object when the hash holds the same values, so catching up
    // doesn't rebuild the activity and remount the interactive.
    const handleHashChange = () => setSettings(current => {
      const parsed = parseSettings(window.location.hash);
      return sameSettings(parsed, current) ? current : parsed;
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
