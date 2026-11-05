import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "tint:theme";

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(choice: ThemeChoice) {
  const el = document.documentElement;
  if (choice === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", choice);
}

/** Per-viewer theme override; "system" follows prefers-color-scheme. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read);

  useEffect(() => {
    apply(choice);
    try {
      if (choice === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* storage blocked: theme still applies for this session */
    }
  }, [choice]);

  const cycle = useCallback(
    () => setChoice((c) => (c === "system" ? "dark" : c === "dark" ? "light" : "system")),
    [],
  );

  return { choice, setChoice, cycle };
}

/** Apply the stored theme before React renders, to avoid a flash. */
export function applyStoredTheme() {
  apply(read());
}
