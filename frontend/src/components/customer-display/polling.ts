export type CustomerDisplayConnectionState = "connecting" | "live" | "offline" | "blocked";

export function customerDisplayPollDelay(connectionState: CustomerDisplayConnectionState) {
  return connectionState === "live" ? 30000 : 1500;
}

export function shouldRefreshCustomerDisplayStoreSnapshot({
  now,
  lastStoreSnapshotAt,
  connectionState,
}: {
  now: number;
  lastStoreSnapshotAt: number;
  connectionState: CustomerDisplayConnectionState;
}) {
  return now - lastStoreSnapshotAt >= customerDisplayPollDelay(connectionState);
}
