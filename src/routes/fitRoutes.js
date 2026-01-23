// src/routes/fitRoutes.js
const express = require("express");
const router = express.Router();
const FitModel = require("../models/FitModel");

const fitController = require("../controllers/fitController");

router.get("/start", fitController.start);
router.get("/step1", fitController.step1);
router.post("/shotmap", async (req, res) => {
  try {
    const tenantId = 1;
    const fitId = req.body.fitId ? Number(req.body.fitId) : null;
    const shotMap = req.body.shot_map_json || [];

    if (!fitId) return res.status(400).json({ ok: false, error: "fitId required" });

    await FitModel.updateShotMap(tenantId, fitId, shotMap);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

//
router.post("/results", fitController.results);

module.exports = router;
