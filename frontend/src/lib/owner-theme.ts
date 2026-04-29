export const ownerThemeIds = ["violet", "light", "dark", "mono"] as const;
export type OwnerThemeId = (typeof ownerThemeIds)[number];

export const defaultOwnerTheme: OwnerThemeId = "light";
export const ownerThemeStorageKey = "pos-mans-owner-theme";
export const ownerThemeChangeEvent = "pos-mans-owner-theme-change";

const ownerThemeSet = new Set<string>(ownerThemeIds);

export function isOwnerTheme(value: string | undefined | null): value is OwnerThemeId {
  return Boolean(value && ownerThemeSet.has(value));
}

export function readStoredOwnerTheme(): OwnerThemeId | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(ownerThemeStorageKey);
    return isOwnerTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

export function readActiveOwnerTheme(): OwnerThemeId {
  if (typeof document !== "undefined") {
    const activeTheme = document.documentElement.dataset.storeTheme;
    if (isOwnerTheme(activeTheme)) {
      return activeTheme;
    }
  }

  return readStoredOwnerTheme() || defaultOwnerTheme;
}

export function applyOwnerTheme(theme: OwnerThemeId) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.storeTheme = theme;

  try {
    window.localStorage.setItem(ownerThemeStorageKey, theme);
  } catch {
    // Persisting the theme is optional; the visual update should still work.
  }

  window.dispatchEvent(new CustomEvent(ownerThemeChangeEvent));
}

export function subscribeOwnerTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", callback);
  window.addEventListener(ownerThemeChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ownerThemeChangeEvent, callback);
  };
}
