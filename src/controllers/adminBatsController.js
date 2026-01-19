const path = require("path");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const BatModel = require("../models/BatModel");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

function normalizeRow(r) {
  // match your bats.csv headers exactly
  const numOrNull = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  return {
    brand: (r.brand || "").trim(),
    model: (r.model || "").trim(),
    size_label: (r.size_label || "").trim(),
    weight_g: numOrNull(r.weight_g),
    pickup_rating: numOrNull(r.pickup_rating),
    sweet_spot: (r.sweet_spot || "").trim(),
    profile: (r.profile || "").trim(),
    handle_shape: (r.handle_shape || "").trim(),
    handle_length: (r.handle_length || "").trim(),
    bow: (r.bow || "").trim(),
    notes: (r.notes || "").trim(),
    image_url: (r.image_url || "").trim() || null,
  };
}

function validateRow(b, idx) {
  const errors = [];
  if (!b.brand) errors.push(`Row ${idx}: brand is required`);
  if (!b.model) errors.push(`Row ${idx}: model is required`);
  // size_label can be blank, but it’s better if present
  return errors;
}

async function list(req, res) {
  const tenantId = 1;
  const bats = await BatModel.adminList(tenantId, 1000);
  res.render("admin/bats-list", { title: "Admin - Bats", bats });
}

function uploadForm(req, res) {
  res.render("admin/bats-upload", { title: "Upload Bats CSV", preview: null, errors: [], stats: null });
}

const uploadProcess = [
  upload.single("csvfile"),
  async (req, res) => {
    try {
      const tenantId = 1;
      if (!req.file) {
        return res.render("admin/bats-upload", { title: "Upload Bats CSV", preview: null, errors: ["No file uploaded"], stats: null });
      }

      const csvText = req.file.buffer.toString("utf-8");

      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const bats = records.map(normalizeRow);

      // validate
      const errors = [];
      bats.forEach((b, i) => errors.push(...validateRow(b, i + 2))); // +2 for header line
      if (errors.length) {
        return res.render("admin/bats-upload", {
          title: "Upload Bats CSV",
          preview: bats.slice(0, 25),
          errors,
          stats: null,
        });
      }

      const stats = await BatModel.upsertMany(tenantId, bats);

      return res.render("admin/bats-upload", {
        title: "Upload Bats CSV",
        preview: bats.slice(0, 25),
        errors: [],
        stats,
      });
    } catch (err) {
      console.error(err);
      return res.render("admin/bats-upload", { title: "Upload Bats CSV", preview: null, errors: [String(err.message || err)], stats: null });
    }
  },
];

async function clear(req, res) {
  const tenantId = 1;
  await BatModel.clearTenant(tenantId);
  res.redirect("/admin/bats");
}

module.exports = { list, uploadForm, uploadProcess, clear };
