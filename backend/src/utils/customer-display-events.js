const displayClients = new Map();
const storeClients = new Map();
const pgNotifyChannel = "pos_mans_customer_display_events";
let listenerStarted = false;
let listenerClient = null;

function subscribeDisplay(displayId, res) {
  const clients = displayClients.get(displayId) || new Set();
  clients.add(res);
  displayClients.set(displayId, clients);

  return () => {
    clients.delete(res);
    if (clients.size === 0) {
      displayClients.delete(displayId);
    }
  };
}

function subscribeStore(storeId, res) {
  const clients = storeClients.get(storeId) || new Set();
  clients.add(res);
  storeClients.set(storeId, clients);

  return () => {
    clients.delete(res);
    if (clients.size === 0) {
      storeClients.delete(storeId);
    }
  };
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendSseFlush(res) {
  // Small SSE frames can sit in proxy buffers. A comment frame with padding nudges
  // intermediaries to flush without changing the browser EventSource payload.
  res.write(`: ${" ".repeat(2048)}\n\n`);
}

function broadcastDisplayEvent(displayId, event, data) {
  deliverDisplayEvent(displayId, event, data);
}

function broadcastStoreEvent(storeId, event, data) {
  deliverStoreEvent(storeId, event, data);
}

function deliverDisplayEvent(displayId, event, data) {
  const clients = displayClients.get(displayId);
  if (!clients) {
    return;
  }

  clients.forEach((client) => {
    sendSse(client, event, data);
    sendSseFlush(client);
  });
}

function deliverStoreEvent(storeId, event, data) {
  const clients = storeClients.get(storeId);
  if (!clients) {
    return;
  }

  clients.forEach((client) => {
    sendSse(client, event, data);
    sendSseFlush(client);
  });
}

function getPool() {
  try {
    return require("../lib/db").pool;
  } catch {
    return null;
  }
}

async function startDisplayEventListener() {
  if (listenerStarted) {
    return;
  }

  const pool = getPool();
  if (!pool?.connect) {
    return;
  }

  listenerStarted = true;

  try {
    listenerClient = await pool.connect();
    listenerClient.on("notification", (message) => {
      if (message.channel !== pgNotifyChannel || !message.payload) {
        return;
      }

      try {
        const payload = JSON.parse(message.payload);
        if (typeof payload.displayId === "string" && typeof payload.event === "string") {
          deliverDisplayEvent(payload.displayId, payload.event, payload.data);
        }
        if (typeof payload.storeId === "string" && typeof payload.event === "string") {
          deliverStoreEvent(payload.storeId, payload.event, payload.data);
        }
      } catch {
        // Ignore malformed notification payloads. They should never come from app code.
      }
    });
    listenerClient.on("error", () => {
      listenerStarted = false;
      listenerClient = null;
      windowlessRetryListener();
    });
    await listenerClient.query(`LISTEN ${pgNotifyChannel}`);
  } catch {
    listenerStarted = false;
    listenerClient?.release?.();
    listenerClient = null;
  }
}

function windowlessRetryListener() {
  setTimeout(() => {
    void startDisplayEventListener();
  }, 2500).unref?.();
}

async function publishDisplayEvent(displayId, event, data) {
  deliverDisplayEvent(displayId, event, data);
  void startDisplayEventListener();

  const pool = getPool();
  if (!pool?.query) {
    return;
  }

  const payload = JSON.stringify({ displayId, event, data });
  if (Buffer.byteLength(payload, "utf8") > 7900) {
    return;
  }

  try {
    await pool.query(`SELECT pg_notify($1, $2)`, [pgNotifyChannel, payload]);
  } catch {
    // Local in-process delivery already happened; DB notification is a cross-instance best effort.
  }
}

async function publishStoreEvent(storeId, event, data) {
  deliverStoreEvent(storeId, event, data);
  void startDisplayEventListener();

  const pool = getPool();
  if (!pool?.query) {
    return;
  }

  const payload = JSON.stringify({ storeId, event, data });
  if (Buffer.byteLength(payload, "utf8") > 7900) {
    return;
  }

  try {
    await pool.query(`SELECT pg_notify($1, $2)`, [pgNotifyChannel, payload]);
  } catch {
    // Local in-process delivery already happened; DB notification is a cross-instance best effort.
  }
}

void startDisplayEventListener();

module.exports = { broadcastDisplayEvent, broadcastStoreEvent, publishDisplayEvent, publishStoreEvent, sendSse, subscribeDisplay, subscribeStore };
