// src/controllers/fitController.js
const FitModel = require("../models/FitModel");
const { recommendBats } = require("../services/fitService");
const BatModel = require("../models/BatModel");


// enums used in step1 view
const SHOT_TYPES = ["ground", "aerial", "mixed"];
const CONDITIONS = ["synthetic", "turf"];
const FOOTWORK = ["front_foot", "back_foot", "mixed"];
const BATTER_STYLE = ["shot_maker", "power", "all_rounder", "defensive"];
const EXPERIENCE = ["beginner", "intermediate", "advanced"];

async function start(req, res) {
  res.redirect("/fit/step1");
}

async function step1(req, res, next) {
  try {
    const tenantId = 1;
    const fitId = req.query.fitId ? Number(req.query.fitId) : null;
    // whatever you already do to fetch saved/prefill data:
    let fit = req.session.fitDraft || {}; // <-- use your existing source (session/db)

    // load brands from DB
    const rows = await BatModel.listBrands(tenantId);
    const brands = rows.map(r => r.brand);
    // defaults
    let form = {
      fitId: "",
      height_cm: "",
      weight_kg: "",
      hand_size_cm: "",
      floor_to_wrist_cm: "",
      shot_type: "ground",
      conditions: "synthetic",
      footwork: "front_foot",
      batter_style: "all_rounder",
      max_distance_m: "",
      experience: "intermediate",
      shot_map_json: "[]",
    };

    // If editing, load previous values (from JSON input stored on the fit)
    if (fitId) {
     fit = await FitModel.getById(tenantId, fitId); // ✅ correct arg order
      if (fit && fit.input) {
        const row = fit.input;
        form = {
          fitId: fitId,
          height_cm: row.height_cm ?? "",
          weight_kg: row.weight_kg ?? "",
          hand_size_cm: row.hand_size_cm ?? "",
          floor_to_wrist_cm: row.floor_to_wrist_cm ?? "",
          shot_type: row.shot_type ?? "ground",
          conditions: row.conditions ?? "synthetic",
          footwork: row.footwork ?? "front_foot",
          batter_style: row.batter_style ?? "all_rounder",
          max_distance_m: row.max_distance_m ?? "",
          experience: row.experience ?? "intermediate",
          shot_map_json: (fit.shot_map_json != null ? fit.shot_map_json : "[]"),
        };
      }
    }

    res.render("fit/step1-measurements", {
      title: "Measurements",
      enums: { SHOT_TYPES, CONDITIONS, FOOTWORK, BATTER_STYLE, EXPERIENCE },
      brands,
      fit,
      form,
      errors: [],
    });
  } catch (err) {
    next(err);
  }
}

function computeShotFeatures(shotMap) {
  // shotMap: [{ring, sector, type}]
  // sectors: 0..7 (0 = straight, then clockwise)
  // We'll compute:
  // - aerialRatio
  // - legBias (sectors 4..7 treated as leg-side, tweak if you like)
  // - aggression (outer ring weight)
  const n = Array.isArray(shotMap) ? shotMap.length : 0;
  if (!n) return { n: 0, aerialRatio: 0, legBias: 0.5, aggression: 0.5 };

  let aerial = 0;
  let leg = 0;
  let ag = 0;

  for (let i = 0; i < shotMap.length; i++) {
    const s = shotMap[i] || {};
    if (String(s.type).toLowerCase() === "aerial") aerial++;

    // leg-side approximation (adjust mapping later)
    if (typeof s.sector === "number" && s.sector >= 4) leg++;

    // aggression: outer ring shots push aggression up
    if (s.ring === 2) ag += 1.0;
    else if (s.ring === 1) ag += 0.5;
    else ag += 0.2;
  }

  return {
    n,
    aerialRatio: aerial / n,
    legBias: leg / n,
    aggression: Math.min(1, ag / n)
  };
}

module.exports = { computeShotFeatures };

async function results(req, res, next) {
  try {
    const fitId = req.body.fitId ? Number(req.body.fitId) : null;

    // IMPORTANT: match your form field names exactly (hand_size_cm not hand_size)
    const input = {
      height_cm: req.body.height_cm,
      weight_kg: req.body.weight_kg,
      hand_size_cm: req.body.hand_size_cm,
      floor_to_wrist_cm: req.body.floor_to_wrist_cm,
      shot_type: req.body.shot_type,
      conditions: req.body.conditions,
      footwork: req.body.footwork,
      batter_style: req.body.batter_style,
      max_distance_m: req.body.max_distance_m,
      experience: req.body.experience,
      brand_filter: req.body.brand_filter || "any",
      shot_map_json: req.body.shot_map_json || "[]"
    };

    console.log("brand_filter:", req.body.brand_filter);
    const result = await recommendBats(input, fitId); // ✅ inside async handler
    return res.render("fit/results", { title: "Results", result });
  } catch (err) {
    next(err);
  }
}

module.exports = { start, step1, results, computeShotFeatures };
