// src/server.js
const http = require("http");
const app = require("./app");
const { env } = require("./config/env");

const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${env.PORT}`);
});
