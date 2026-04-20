export type WorkspaceRouteUser = {
  platformRole: string;
  storeRole: string | null;
};

export function getWorkspaceHref(user: WorkspaceRouteUser) {
  if (user.platformRole === "SUPER_ADMIN") {
    return "/superadmin";
  }

  return "/owner/sales";
}
