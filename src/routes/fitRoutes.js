// src/routes/fitRoutes.js
const express = require("express");
const router = express.Router();

const fitController = require("../controllers/fitController");

router.get("/start", fitController.start);
router.get("/step1", fitController.step1);

// ✅ this is the key one:
router.post("/results", fitController.results);

module.exports = router;
