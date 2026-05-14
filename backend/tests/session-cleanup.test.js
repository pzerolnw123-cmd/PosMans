jest.mock("../src/lib/db", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("../src/utils/customer-display", () => ({
  revokeDisplaysForSessionIds: jest.fn(),
}));

const { prisma } = require("../src/lib/db");
const { revokeDisplaysForSessionIds } = require("../src/utils/customer-display");

describe("session cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.session.findMany.mockResolvedValue([]);
    prisma.session.findUnique.mockResolvedValue(null);
    prisma.session.delete.mockResolvedValue({});
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
    revokeDisplaysForSessionIds.mockResolvedValue([]);
  });

  test("deletes expired sessions without revoking customer displays", async () => {
    prisma.session.findMany.mockResolvedValue([{ id: "session-1" }, { id: "session-2" }]);
    prisma.session.deleteMany.mockResolvedValue({ count: 2 });

    const { cleanupExpiredSessions } = require("../src/utils/session");

    await cleanupExpiredSessions();

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
      select: { id: true },
      orderBy: { expiresAt: "asc" },
      take: 250,
    });
    expect(revokeDisplaysForSessionIds).not.toHaveBeenCalled();
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["session-1", "session-2"] } },
    });
  });

  test("explicit session deletion still revokes linked customer displays", async () => {
    prisma.session.findUnique.mockResolvedValue({ id: "session-1" });

    const { deleteSession } = require("../src/utils/session");

    await deleteSession("session-token");

    expect(revokeDisplaysForSessionIds).toHaveBeenCalledWith(["session-1"]);
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });

  test("expired token deletion does not revoke linked customer displays", async () => {
    prisma.session.findUnique
      .mockResolvedValueOnce({
        id: "session-1",
        createdAt: new Date(Date.now() - 90_000),
        expiresAt: new Date(Date.now() - 1_000),
        user: {
          isActive: true,
          storeId: "store-1",
          store: { isActive: true },
        },
      })
      .mockResolvedValueOnce({ id: "session-1" });

    const { getSessionFromToken } = require("../src/utils/session");

    const session = await getSessionFromToken("session-token");

    expect(session).toBeNull();
    expect(revokeDisplaysForSessionIds).not.toHaveBeenCalled();
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });
});
