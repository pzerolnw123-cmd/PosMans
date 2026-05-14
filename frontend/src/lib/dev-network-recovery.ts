const recoverableNetworkErrorPatterns = [
  "network error",
  "failed to fetch rsc payload",
  "failed to fetch server response",
];

export function isRecoverableNetworkError(value: unknown) {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : "";
  const normalizedMessage = message.toLowerCase();

  return recoverableNetworkErrorPatterns.some((pattern) => normalizedMessage.includes(pattern));
}

export function isRecoverableDevNetworkError(value: unknown, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv !== "development") {
    return false;
  }

  return isRecoverableNetworkError(value);
}
