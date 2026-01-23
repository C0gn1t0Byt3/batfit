// src/services/fitService.js
const BatModel = require("../models/BatModel");
const FitModel = require("../models/FitModel");
const { scoreBats } = require("./recommendation/scoringEngine");

async function recommendBats(input, fitId = null) {
  const tenantId = 1; // ✅ define it once, use everywhere

  // Load bats from DB
  let bats = await BatModel.listAll(tenantId);

  if (input.brand_filter && input.brand_filter !== "any") {
    bats = bats.filter(b => b.brand === input.brand_filter);
  }

  console.log("Filtered bats count:", bats.length, "brand:", input.brand_filter);

  // Score all bats (returns sorted highest score first)
  const scored = scoreBats(input, bats);

  // Take top 3
  const top = scored.slice(0, 3);

  const result = {
    generatedAt: new Date().toISOString(),
    top,
    summary: {
      recommendedSize: inferSize(input),
      pickupPreference: inferPickup(input),
    },
  };

  // ✅ If editing an existing fit, update it (keeps same Fit ID)
  if (fitId) {
    await FitModel.update(tenantId, fitId, input, result);
    result.savedFitId = Number(fitId);
    result.mode = "Updated";
    return result;
  }

  // ✅ Otherwise create a new fit
  const saved = await FitModel.create(tenantId, input, result);
  result.savedFitId = saved.id;
  result.mode = "New";
  return result;
}

// placeholders (tune later)
function inferSize(input) {
  const h = Number(input.height_cm);
  if (!Number.isFinite(h)) return "Short Handle (SH)";
  if (h <= 135) return "Size 4–5 (junior)";
  if (h <= 160) return "Harrow / Size 6";
  return "Short Handle (SH)";
}

function inferPickup(input) {
  if (input.experience === "beginner") return "lighter pick-up";
  if (input.batter_style === "power") return "heavier swing weight (if comfortable)";
  return "balanced pick-up";
}

module.exports = { recommendBats };
