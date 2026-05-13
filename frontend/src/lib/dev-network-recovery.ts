const devNetworkErrorPatterns = [
  "network error",
  "failed to fetch rsc payload",
  "failed to fetch server response",
];

export function isRecoverableDevNetworkError(value: unknown, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv !== "development") {
    return false;
  }

  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : "";
  const normalizedMessage = message.toLowerCase();

  return devNetworkErrorPatterns.some((pattern) => normalizedMessage.includes(pattern));
}
