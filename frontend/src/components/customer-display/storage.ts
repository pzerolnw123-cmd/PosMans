export type CustomerDisplayStorageRecord = {
  id: string;
  token: string;
  controlToken: string;
  storeId?: string;
};

export type CustomerDisplayStorageScope = {
  storeId?: string;
};

export function parseCustomerDisplayStorageRecord(raw: string | null, scope: CustomerDisplayStorageScope = {}): CustomerDisplayStorageRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomerDisplayStorageRecord>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.token !== "string" ||
      typeof parsed.controlToken !== "string" ||
      parsed.id.length === 0 ||
      parsed.token.length === 0 ||
      parsed.controlToken.length === 0
    ) {
      return null;
    }

    if (scope.storeId && parsed.storeId !== scope.storeId) {
      return null;
    }

    return {
      id: parsed.id,
      token: parsed.token,
      controlToken: parsed.controlToken,
      storeId: typeof parsed.storeId === "string" ? parsed.storeId : undefined,
    };
  } catch {
    return null;
  }
}
