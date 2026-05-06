"use client";

import { requestJson } from "@/components/product-management-studio/lib";

export type CustomerDisplayLink = {
  id: string;
  token: string;
  controlToken: string;
  url: string;
};

export const customerDisplayWindowName = "pos-mans-customer-display";

const customerDisplayStorageKey = "pos-mans.customerDisplay";
const customerDisplayInvalidationPrefix = "pos-mans.customerDisplay.invalidated";

export function clearStoredCustomerDisplay() {
  sessionStorage.removeItem(customerDisplayStorageKey);
}

function customerDisplayInvalidationKey(displayId: string) {
  return `${customerDisplayInvalidationPrefix}.${displayId}`;
}

export function invalidateCustomerDisplay(displayId: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(customerDisplayInvalidationKey(displayId), String(Date.now()));
}

export function clearCustomerDisplayInvalidation(displayId: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(customerDisplayInvalidationKey(displayId));
}

export function isCustomerDisplayInvalidated(displayId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(customerDisplayInvalidationKey(displayId)) !== null;
}

export function buildCustomerDisplayUrl(id: string, token: string) {
  return `${window.location.origin}/display/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
}

export function readStoredCustomerDisplay(): CustomerDisplayLink | null {
  try {
    const raw = sessionStorage.getItem(customerDisplayStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<Pick<CustomerDisplayLink, "id" | "token" | "controlToken">>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.token !== "string" ||
      typeof parsed.controlToken !== "string" ||
      parsed.id.length === 0 ||
      parsed.token.length === 0 ||
      parsed.controlToken.length === 0
    ) {
      clearStoredCustomerDisplay();
      return null;
    }

    return {
      id: parsed.id,
      token: parsed.token,
      controlToken: parsed.controlToken,
      url: buildCustomerDisplayUrl(parsed.id, parsed.token),
    };
  } catch {
    clearStoredCustomerDisplay();
    return null;
  }
}

export function storeCustomerDisplay(display: CustomerDisplayLink) {
  clearCustomerDisplayInvalidation(display.id);
  sessionStorage.setItem(
    customerDisplayStorageKey,
    JSON.stringify({
      id: display.id,
      token: display.token,
      controlToken: display.controlToken,
    }),
  );
}

export function openCustomerDisplayWindow(url: string) {
  const displayWindow = window.open(url, customerDisplayWindowName);
  displayWindow?.focus();
}

export async function setStoredCustomerDisplayIdle() {
  const customerDisplay = readStoredCustomerDisplay();
  if (!customerDisplay) {
    return;
  }

  await requestJson(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}/state`, {
    method: "PATCH",
    body: JSON.stringify({ status: "IDLE" }),
  });
}

export async function revokeStoredCustomerDisplay() {
  const customerDisplay = readStoredCustomerDisplay();
  if (!customerDisplay) {
    return;
  }

  try {
    await requestJson(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}/revoke`, {
      method: "POST",
      body: JSON.stringify({ controlToken: customerDisplay.controlToken }),
    });
  } finally {
    invalidateCustomerDisplay(customerDisplay.id);
    clearStoredCustomerDisplay();
  }
}
