"use client";

export type CustomerDisplayLink = {
  id: string;
  token: string;
  url: string;
};

export const customerDisplayWindowName = "pos-mans-customer-display";

const customerDisplayStorageKey = "pos-mans.customerDisplay";

export function buildCustomerDisplayUrl(id: string, token: string) {
  return `${window.location.origin}/display/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
}

export function readStoredCustomerDisplay(): CustomerDisplayLink | null {
  try {
    const raw = sessionStorage.getItem(customerDisplayStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<Pick<CustomerDisplayLink, "id" | "token">>;
    if (typeof parsed.id !== "string" || typeof parsed.token !== "string" || parsed.id.length === 0 || parsed.token.length === 0) {
      sessionStorage.removeItem(customerDisplayStorageKey);
      return null;
    }

    return {
      id: parsed.id,
      token: parsed.token,
      url: buildCustomerDisplayUrl(parsed.id, parsed.token),
    };
  } catch {
    sessionStorage.removeItem(customerDisplayStorageKey);
    return null;
  }
}

export function storeCustomerDisplay(display: CustomerDisplayLink) {
  sessionStorage.setItem(
    customerDisplayStorageKey,
    JSON.stringify({
      id: display.id,
      token: display.token,
    }),
  );
}

export function openCustomerDisplayWindow(url: string) {
  const displayWindow = window.open(url, customerDisplayWindowName);
  displayWindow?.focus();
}
