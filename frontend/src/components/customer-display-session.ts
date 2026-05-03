"use client";

import { requestJson } from "@/components/product-management-studio/lib";

export type CustomerDisplayLink = {
  id: string;
  token: string;
  url: string;
};

export const customerDisplayWindowName = "pos-mans-customer-display";

const customerDisplayStorageKey = "pos-mans.customerDisplay";

export function clearStoredCustomerDisplay() {
  sessionStorage.removeItem(customerDisplayStorageKey);
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

    const parsed = JSON.parse(raw) as Partial<Pick<CustomerDisplayLink, "id" | "token">>;
    if (typeof parsed.id !== "string" || typeof parsed.token !== "string" || parsed.id.length === 0 || parsed.token.length === 0) {
      clearStoredCustomerDisplay();
      return null;
    }

    return {
      id: parsed.id,
      token: parsed.token,
      url: buildCustomerDisplayUrl(parsed.id, parsed.token),
    };
  } catch {
    clearStoredCustomerDisplay();
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
    await requestJson(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}`, {
      method: "DELETE",
    });
  } finally {
    clearStoredCustomerDisplay();
  }
}
