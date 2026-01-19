// src/app.js
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const { limiter } = require("./middleware/rateLimit");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const routes = require("./routes");

// Ensure DB is initialised (schema + seed)
require("./config/db");

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // keep simple for Bootstrap/CDN in dev
  })
);

// Logging
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Basic anti-scrape throttling
app.use(limiter);

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Cookies (future auth/session)
app.use(cookieParser());

// Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("compileDebug", true);
app.set("debug", true);

// Static assets
app.use(express.static(path.join(__dirname, "..", "public")));

// Routes
app.use("/", routes);

// Errors
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
