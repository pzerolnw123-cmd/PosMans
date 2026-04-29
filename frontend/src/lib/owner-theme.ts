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

export function storeOwnerTheme(theme: OwnerThemeId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ownerThemeStorageKey, theme);
  } catch {
    // Persisting the theme is optional; the visual update should still work.
  }
}

export function clearStoredOwnerTheme() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(ownerThemeStorageKey);
  } catch {
    // Persisting the theme is optional; the visual update should still work.
  }
}

function announceOwnerThemeChange(previousTheme: string | undefined) {
  if (previousTheme !== document.documentElement.dataset.storeTheme) {
    window.dispatchEvent(new CustomEvent(ownerThemeChangeEvent));
  }
}

export function applyOwnerTheme(theme: OwnerThemeId, source: "server" | "local" = "local") {
  if (typeof document === "undefined") {
    return;
  }

  const previousTheme = document.documentElement.dataset.storeTheme;
  document.documentElement.dataset.storeTheme = theme;
  document.documentElement.dataset.userThemeSource = source;

  storeOwnerTheme(theme);

  announceOwnerThemeChange(previousTheme);
}

export function applySystemOwnerTheme() {
  if (typeof document === "undefined") {
    return;
  }

  const previousTheme = document.documentElement.dataset.storeTheme;
  document.documentElement.dataset.storeTheme = defaultOwnerTheme;
  document.documentElement.dataset.userThemeSource = "system";

  announceOwnerThemeChange(previousTheme);
}

export function resetOwnerTheme() {
  if (typeof document === "undefined") {
    return;
  }

  const previousTheme = document.documentElement.dataset.storeTheme;
  document.documentElement.dataset.storeTheme = defaultOwnerTheme;
  document.documentElement.dataset.userThemeSource = "system";

  clearStoredOwnerTheme();

  announceOwnerThemeChange(previousTheme);
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
