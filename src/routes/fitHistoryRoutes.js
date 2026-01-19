// src/routes/fitHistoryRoutes.js
const express = require("express");
const router = express.Router();

const { list, view } = require("../controllers/fitHistoryController");

// Debug guard (optional, remove later)
if (typeof list !== "function" || typeof view !== "function") {
  throw new Error("fitHistoryController exports are wrong. Expected { list, view } functions.");
}

router.get("/fits", list);
router.get("/fits/:id", view);

module.exports = router;
