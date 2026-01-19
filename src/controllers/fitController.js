// src/controllers/fitController.js
const FitModel = require("../models/FitModel");
const { recommendBats } = require("../services/fitService");

// enums used in step1 view
const SHOT_TYPES = ["ground", "aerial", "mixed"];
const CONDITIONS = ["synthetic", "turf"];
const FOOTWORK = ["front_foot", "back_foot", "mixed"];
const BATTER_STYLE = ["shot_maker", "power", "all_rounder", "defensive"];
const EXPERIENCE = ["beginner", "intermediate", "advanced"];

async function start(req, res) {
  // New fit always starts clean (no fitId)
  res.redirect("/fit/step1");
}

async function step1(req, res, next) {
  try {
    const tenantId = 1;
    const fitId = req.query.fitId ? Number(req.query.fitId) : null;

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
    };

    // If editing, load previous values
    if (fitId) {
      const row = await FitModel.getById(fitId, tenantId);
      if (row) {
        form = {
          fitId: row.id,
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
        };
      }
    }

    res.render("fit/step1-measurements", {
      title: "Measurements",
      enums: { SHOT_TYPES, CONDITIONS, FOOTWORK, BATTER_STYLE, EXPERIENCE },
      form,
      errors: [],
    });
  } catch (err) {
    next(err);
  }
}

async function results(req, res, next) {
  try {
    const tenantId = 1;
    const fitId = req.body.fitId ? Number(req.body.fitId) : null;

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
    };

    // compute-only recommendations
    const result = await recommendBats(input, tenantId);

    if (fitId) {
      // Update existing fit
      await FitModel.update(fitId, tenantId, input, result);
      result.savedFitId = fitId;
      result.mode = "UPDATED";
    } else {
      // Create new fit
      const saved = await FitModel.create(tenantId, input, result);
      result.savedFitId = saved.id;
      result.mode = "NEW";
    }

    res.render("fit/results", { title: "Results", result });
  } catch (err) {
    next(err);
  }
}

module.exports = { start, step1, results };
