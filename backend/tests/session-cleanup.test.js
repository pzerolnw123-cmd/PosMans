jest.mock("../src/lib/db", () => ({
  prisma: {
    session: {
      findMany: jest.fn(),
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
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
    revokeDisplaysForSessionIds.mockResolvedValue([]);
  });

  test("revokes linked customer displays before deleting expired sessions", async () => {
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
    expect(revokeDisplaysForSessionIds).toHaveBeenCalledWith(["session-1", "session-2"]);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["session-1", "session-2"] } },
    });
  });
});
