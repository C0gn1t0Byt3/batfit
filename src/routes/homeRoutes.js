// src/routes/homeRoutes.js
const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");

router.get("/", homeController.home);
router.get("/wiki", homeController.wiki);

module.exports = router;
