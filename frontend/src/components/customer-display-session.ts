"use client";

import { requestJson } from "@/components/product-management-studio/lib";
import { parseCustomerDisplayStorageRecord, type CustomerDisplayStorageScope } from "@/components/customer-display/storage";

export type CustomerDisplayLink = {
  id: string;
  token: string;
  controlToken: string;
  storeId?: string;
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

export function readStoredCustomerDisplay(scope: CustomerDisplayStorageScope = {}): CustomerDisplayLink | null {
  const raw = sessionStorage.getItem(customerDisplayStorageKey);
  const parsed = parseCustomerDisplayStorageRecord(raw, scope);
  if (!parsed) {
    if (raw) {
      const staleDisplay = parseCustomerDisplayStorageRecord(raw);
      if (staleDisplay) {
        invalidateCustomerDisplay(staleDisplay.id);
      }
      clearStoredCustomerDisplay();
    }
    return null;
  }

  return {
    id: parsed.id,
    token: parsed.token,
    controlToken: parsed.controlToken,
    storeId: parsed.storeId,
    url: buildCustomerDisplayUrl(parsed.id, parsed.token),
  };
}

export function storeCustomerDisplay(display: CustomerDisplayLink) {
  clearCustomerDisplayInvalidation(display.id);
  sessionStorage.setItem(
    customerDisplayStorageKey,
    JSON.stringify({
      id: display.id,
      token: display.token,
      controlToken: display.controlToken,
      storeId: display.storeId,
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

  invalidateCustomerDisplay(customerDisplay.id);
  clearStoredCustomerDisplay();

  await requestJson(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}/revoke`, {
    method: "POST",
    body: JSON.stringify({ controlToken: customerDisplay.controlToken }),
  });
}
