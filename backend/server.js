const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const { createApp } = require("./src/app");
const { env } = require("./src/config/env");
const { databaseDiagnostics } = require("./src/lib/db");

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`POS MANS backend running on http://localhost:${env.PORT}`);
  console.log("[startup] Runtime config", {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    frontendOrigin: new URL(env.FRONTEND_URL).origin,
    database: databaseDiagnostics,
  });
});
