// src/routes/apiRoutes.js
const express = require("express");
const router = express.Router();
const apiController = require("../controllers/apiController");

router.get("/bats", apiController.listBats);
router.post("/recommend", apiController.recommend);

module.exports = router;
