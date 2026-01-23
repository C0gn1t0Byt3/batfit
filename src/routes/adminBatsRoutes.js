const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/adminAuth");
const adminBatsController = require("../controllers/adminBatsController");

router.get("/admin/bats", requireAdmin, adminBatsController.list);
router.get("/admin/bats/upload", requireAdmin, adminBatsController.uploadForm);
router.post("/admin/bats/upload", requireAdmin, adminBatsController.upload.single("csvfile"), adminBatsController.uploadProcess);
router.post("/admin/bats/clear", requireAdmin, adminBatsController.clear);
router.get("/admin/bats/download", requireAdmin, adminBatsController.downloadCsv);

module.exports = router;
