const path = require("path");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const BatModel = require("../models/BatModel");
const ALLOWED_SWEET_SPOT = new Set(["low", "mid_low", "mid", "mid_high", "high"]);
const ALLOWED_PROFILE = new Set(["toe_heavy", "power", "balanced", "full_profile", "short_blade_long_handle"]);
const ALLOWED_HANDLE_SHAPE = new Set(["oval", "round"]);
const ALLOWED_HANDLE_LENGTH = new Set(["standard", "long", "short"]);
const ALLOWED_BOW = new Set(["low", "medium", "high"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function downloadCsv(req, res) {
  const tenantId = 1;
  const rows = await BatModel.adminListForExport(tenantId);

  const headers = [
    "brand","model","size_label","weight_g","pickup_rating","sweet_spot","profile",
    "handle_shape","handle_length","bow","notes","image_url"
  ];

  let csv = headers.join(",") + "\n";
  for (const r of rows) {
    csv += headers.map(h => csvEscape(r[h])).join(",") + "\n";
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="bats_catalogue_tenant_${tenantId}.csv"`);
  return res.send(csv);
}


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
  const row = `Row ${idx}`;

  if (!b.brand) errors.push(`${row}: brand is required`);
  if (!b.model) errors.push(`${row}: model is required`);

  if (b.pickup_rating !== null && (b.pickup_rating < 0 || b.pickup_rating > 10)) {
    errors.push(`${row}: pickup_rating must be 0–10`);
  }
  if (b.weight_g !== null && (b.weight_g < 700 || b.weight_g > 1400)) {
    errors.push(`${row}: weight_g looks unrealistic (expected 700–1400)`);
  }

  if (b.sweet_spot && !ALLOWED_SWEET_SPOT.has(b.sweet_spot)) {
    errors.push(`${row}: sweet_spot must be one of: ${Array.from(ALLOWED_SWEET_SPOT).join(", ")}`);
  }
  if (b.profile && !ALLOWED_PROFILE.has(b.profile)) {
    errors.push(`${row}: profile must be one of: ${Array.from(ALLOWED_PROFILE).join(", ")}`);
  }
  if (b.handle_shape && !ALLOWED_HANDLE_SHAPE.has(b.handle_shape)) {
    errors.push(`${row}: handle_shape must be oval or round`);
  }
  if (b.handle_length && !ALLOWED_HANDLE_LENGTH.has(b.handle_length)) {
    errors.push(`${row}: handle_length must be standard/long/short`);
  }
  if (b.bow && !ALLOWED_BOW.has(b.bow)) {
    errors.push(`${row}: bow must be low/medium/high`);
  }

  return errors;
}


async function list(req, res) {
  const tenantId = 1;

  const filters = {
    q: req.query.q || "",
    brand: req.query.brand || "",
    profile: req.query.profile || "",
    sweet_spot: req.query.sweet_spot || "",
    limit: 2000,
  };

  const [bats, options] = await Promise.all([
    BatModel.adminListFiltered(tenantId, filters),
    BatModel.adminFilterOptions(tenantId),
  ]);

  res.render("admin/bats-list", {
    title: "Admin - Bats",
    bats,
    filters,
    options,
  });
}

function parseCsvToBats(csvText) {
  // Parse CSV to array of objects using headers
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // handles UTF-8 BOM
  });

  // Normalize to your DB schema fields
  return records.map(normalizeRow);
}


function uploadForm(req, res) {
  res.render("admin/bats-upload", { title: "Upload Bats CSV", preview: null, errors: [], stats: null });
}

async function uploadProcess(req, res) {
  try {
    const tenantId = 1;

    if (!req.file) {
      return res.status(400).render("admin/bats-upload", {
        title: "Upload Bats CSV",
        preview: [],
        stats: null,
        errors: ["No file uploaded"],
      });
    }

    const csvText = req.file.buffer.toString("utf-8");

    // Parse + normalize
    const bats = parseCsvToBats(csvText); // <- assumes you already have this
    const errors = [];

    // Row validation
    bats.forEach((b, idx) => {
      errors.push(...validateRow(b, idx + 2)); // +2 for header row
    });

    if (errors.length) {
      return res.status(400).render("admin/bats-upload", {
        title: "Upload Bats CSV",
        preview: bats.slice(0, 10),
        stats: null,
        errors,
      });
    }

    // ✅ inserted vs updated counts
    const keyList = bats.map(b => ({
      brand: b.brand,
      model: b.model,
      size_label: b.size_label || "",
    }));

    const existing = await BatModel.existingKeys(tenantId, keyList);

    let wouldInsert = 0;
    let wouldUpdate = 0;

    for (const b of bats) {
      const key = `${b.brand}||${b.model}||${b.size_label || ""}`;
      if (existing.has(key)) wouldUpdate++;
      else wouldInsert++;
    }

    // Upsert
    const stats = await BatModel.upsertMany(tenantId, bats);
    stats.total = bats.length;
    stats.wouldInsert = wouldInsert;
    stats.wouldUpdate = wouldUpdate;

    return res.render("admin/bats-upload", {
      title: "Upload Bats CSV",
      preview: bats.slice(0, 10),
      stats,
      errors: [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).render("admin/bats-upload", {
      title: "Upload Bats CSV",
      preview: [],
      stats: null,
      errors: [err.message || "Upload failed"],
    });
  }
}


async function clear(req, res) {
  const tenantId = 1;
  await BatModel.clearTenant(tenantId);
  res.redirect("/admin/bats");
}

module.exports = { list, uploadForm, uploadProcess, clear, downloadCsv, upload };
