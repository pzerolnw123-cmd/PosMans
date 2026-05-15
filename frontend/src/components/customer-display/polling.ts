export type CustomerDisplayConnectionState = "connecting" | "live" | "offline" | "blocked";

export function customerDisplayPollDelay(connectionState: CustomerDisplayConnectionState, consecutiveFailures = 0) {
  const baseDelay = connectionState === "live" ? 30000 : connectionState === "offline" ? 5000 : 2000;
  const failureMultiplier = 2 ** Math.min(Math.max(consecutiveFailures, 0), 4);
  return Math.min(baseDelay * failureMultiplier, 60000);
}

export function shouldRefreshCustomerDisplayStoreSnapshot({
  now,
  lastStoreSnapshotAt,
  connectionState,
  consecutiveFailures = 0,
}: {
  now: number;
  lastStoreSnapshotAt: number;
  connectionState: CustomerDisplayConnectionState;
  consecutiveFailures?: number;
}) {
  return now - lastStoreSnapshotAt >= customerDisplayPollDelay(connectionState, consecutiveFailures);
}
