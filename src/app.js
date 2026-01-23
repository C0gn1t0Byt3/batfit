// src/app.js
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const FitModel = require("./models/FitModel");
const fitHistoryRoutes = require("./routes/fitHistoryRoutes");
const fitRoutes = require("./routes/fitRoutes");
const adminBatsRoutes = require("./routes/adminBatsRoutes");
const session = require("express-session");
const adminAuthRoutes = require("./routes/adminAuthRoutes");

(async () => {
  await FitModel.ensureTable();
})();

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

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false // set true when https in production
  }
}));



// Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("compileDebug", true);
app.set("debug", true);

// Static assets
app.use(express.static(path.join(__dirname, "..", "public")));

// Routes
app.use("/", routes);
app.use("/", fitHistoryRoutes);
app.use("/fit", fitRoutes);
app.use("/", adminBatsRoutes);
app.use("/", adminAuthRoutes);

// Errors
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
