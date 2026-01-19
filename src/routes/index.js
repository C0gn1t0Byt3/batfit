// src/routes/index.js
const express = require("express");
const router = express.Router();

router.use("/", require("./homeRoutes"));
router.use("/fit", require("./fitRoutes"));
router.use("/api", require("./apiRoutes"));

module.exports = router;
