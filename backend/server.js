require("dotenv").config();
const { createApp } = require("./src/app");
const { env } = require("./src/config/env");

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`POS MANS backend running on http://localhost:${env.PORT}`);
});