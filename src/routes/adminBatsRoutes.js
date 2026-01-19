const express = require("express");
const router = express.Router();

const adminBatsController = require("../controllers/adminBatsController");

router.get("/admin/bats", adminBatsController.list);
router.get("/admin/bats/upload", adminBatsController.uploadForm);
router.post("/admin/bats/upload", adminBatsController.uploadProcess);
router.post("/admin/bats/clear", adminBatsController.clear);

module.exports = router;
