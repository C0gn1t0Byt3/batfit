// src/services/fitService.js
const BatModel = require("../models/BatModel");
const { scoreBats } = require("./recommendation/scoringEngine");

async function recommendBats(input, tenantId = 1) {
  // Load bats from DB
  const bats = await BatModel.listAll(tenantId);

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

  return result;
}

// Very simple placeholders (improve later)
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
