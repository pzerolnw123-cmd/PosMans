describe("customer display database events", () => {
  let appPool;
  let eventPool;
  let listenerClient;

  beforeEach(() => {
    jest.resetModules();
    listenerClient = {
      on: jest.fn(),
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    eventPool = {
      connect: jest.fn().mockResolvedValue(listenerClient),
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    appPool = {
      connect: jest.fn(),
      query: jest.fn(),
    };
    jest.doMock("../src/lib/db", () => ({ eventPool, pool: appPool }));
  });

  afterEach(() => {
    jest.dontMock("../src/lib/db");
  });

  test("does not open a database listener on import", () => {
    require("../src/utils/customer-display-events");

    expect(eventPool.connect).not.toHaveBeenCalled();
    expect(appPool.connect).not.toHaveBeenCalled();
  });

  test("uses the event pool for listener and notifications", async () => {
    const events = require("../src/utils/customer-display-events");
    const response = { write: jest.fn() };

    const unsubscribe = events.subscribeDisplay("display-1", response);
    await Promise.resolve();

    expect(eventPool.connect).toHaveBeenCalledTimes(1);
    expect(listenerClient.query).toHaveBeenCalledWith("LISTEN pos_mans_customer_display_events");

    await events.publishDisplayEvent("display-1", "payment", { amount: 1200 });

    expect(eventPool.query).toHaveBeenCalledWith("SELECT pg_notify($1, $2)", [
      "pos_mans_customer_display_events",
      JSON.stringify({ displayId: "display-1", event: "payment", data: { amount: 1200 } }),
    ]);
    expect(appPool.query).not.toHaveBeenCalled();

    unsubscribe();
  });
});
