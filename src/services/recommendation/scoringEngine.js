// src/services/recommendation/scoringEngine.js
const { explainPick } = require("./explain");

function scoreBats(input, bats) {
  const scored = bats
    .map((bat) => {
      const score = computeScore(input, bat);
      let why = explainPick(input, bat, score);

      // GUARANTEE array
      if (!Array.isArray(why)) {
        why = (typeof why === "string" && why.trim()) ? [why] : ["Match details unavailable."];
      }

      return { bat, score, why };
    })
    .sort((a, b) => b.score - a.score);

  return scored;
}

function computeScore(input, bat, sizeTarget) {
  let s = 0;

  // -------------------------
  // 1) SIZE (foundation)
  // -------------------------
  // Size is important
  // If wrong size, penalise heavily so only correct size appears.
  if (bat.size_label === sizeTarget) {
    s += 30;
  } else {
    // allow "nearby" sizes with penalty (optional)
    // for now, strong penalty
    s -= 40;
  }

  // -------------------------
  // 2) PROFILE + SWEET SPOT
  // -------------------------
  // Use footwork + shot type + conditions to select sweet spot
  const footwork = input.footwork;
  const shotType = input.shot_type;
  const cond = input.conditions;

  // Sweet spot expectations:
  // - front foot / ground: low-mid
  // - back foot / aerial: mid-high
  // - mixed: mid
  let desiredSweet = "mid";
  if (footwork === "front_foot" || shotType === "ground") desiredSweet = "low_mid";
  if (footwork === "back_foot" || shotType === "aerial") desiredSweet = "mid_high";

  // score sweet spot match
  if (desiredSweet === "low_mid") {
    if (bat.sweet_spot === "low") s += 18;
    if (bat.sweet_spot === "mid") s += 12;
    if (bat.sweet_spot === "high") s += 2;
  } else if (desiredSweet === "mid_high") {
    if (bat.sweet_spot === "high") s += 18;
    if (bat.sweet_spot === "mid") s += 12;
    if (bat.sweet_spot === "low") s += 2;
  } else {
    // mid
    if (bat.sweet_spot === "mid") s += 16;
    if (bat.sweet_spot === "low" || bat.sweet_spot === "high") s += 10;
  }

  // profile mapping
  // - power/aerial: toe heavy ok
  // - controlled/ground: balanced ok
  if (shotType === "aerial" || input.batter_style === "power") {
    if (bat.profile === "toe_heavy") s += 12;
    if (bat.profile === "balanced") s += 8;
  } else {
    if (bat.profile === "balanced") s += 12;
    if (bat.profile === "toe_heavy") s += 6;
  }

  // -------------------------
  // 3) PICK-UP (dominant)
  // -------------------------
  // Pick-up beats dead weight.
  // Synthetic generally rewards quicker pick-up and fast hands.
  const pickup = Number(bat.pickup_rating || 0);

  // target pickup rating band:
  // synthetic -> 8–9
  // turf -> 7–8
  const pickupTarget = cond === "synthetic" ? 8.5 : 7.5;
  s += Math.max(0, 22 - Math.abs(pickup - pickupTarget) * 6); // high weight

  // -------------------------
  // 4) WEIGHT (banded)
  // -------------------------
  // Use experience + style + max_distance to place in light/med/heavy.
  const w = Number(bat.weight_g || 0);
  const exp = input.experience;
  const style = input.batter_style;
  const dist = input.max_distance_m ? Number(input.max_distance_m) : null;

  const strengthScore = calcStrengthScore(exp, style, dist);

  // set target weight by strengthScore
  // (this is intentionally loose)
  let targetWeight = 1180; // medium default
  if (strengthScore >= 7) targetWeight = 1210; // heavier ok
  if (strengthScore <= 3) targetWeight = 1160; // lighter

  // weight influence is weaker than pick-up
  s += Math.max(0, 12 - Math.abs(w - targetWeight) / 15);

  // -------------------------
  // 5) HANDLE SHAPE
  // -------------------------
  // Style-driven + hand size modifier
  const handle = (bat.handle_shape || "").toLowerCase();
  const hs = input.hand_size_cm ? Number(input.hand_size_cm) : null;

  // basic style mapping:
  // - shot_maker -> round helpful
  // - power/front foot -> oval helpful
  if (style === "shot_maker") {
    if (handle === "round") s += 10;
    if (handle === "oval") s += 6;
  } else if (style === "power" || footwork === "front_foot") {
    if (handle === "oval") s += 10;
    if (handle === "round") s += 6;
  } else {
    // all-rounder
    if (handle === "oval") s += 8;
    if (handle === "round") s += 8;
  }

  // hand size modifier
  if (hs != null) {
    if (hs >= 20 && handle === "oval") s += 3;
    if (hs < 20 && handle === "round") s += 3;
  }

  // final clamp
  s = Math.round(Math.max(0, Math.min(100, s)));
  return s;
}

function calcStrengthScore(experience, batterStyle, maxDistanceM) {
  let score = 5; // baseline

  // experience
  if (experience === "beginner") score -= 2;
  if (experience === "advanced") score += 2;

  // style
  if (batterStyle === "power") score += 2;
  if (batterStyle === "defensive") score -= 1;

  // distance
  if (typeof maxDistanceM === "number" && Number.isFinite(maxDistanceM)) {
    if (maxDistanceM >= 70) score += 2;
    else if (maxDistanceM <= 35) score -= 2;
  }

  return Math.max(1, Math.min(10, score));
}

function inferredSizeLabel(input) {
  const h = Number(input.height_cm);
  if (!Number.isFinite(h)) return "SH";
  if (h <= 135) return "6";      // placeholder for juniors
  if (h <= 160) return "Harrow";
  return "SH";
}

module.exports = { scoreBats };
