// src/config/env.js
const dotenv = require("dotenv");
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
  DB_PATH: process.env.DB_PATH || "./data/app.db",
  SESSION_SECRET: process.env.SESSION_SECRET || "change_me",
};

module.exports = { env };
