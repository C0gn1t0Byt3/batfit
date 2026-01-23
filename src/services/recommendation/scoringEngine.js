// src/services/recommendation/scoringEngine.js
const { explainPick } = require("./explain");

function parseShotMap(input) {
  var raw = input && input.shot_map_json ? input.shot_map_json : "[]";
  if (Array.isArray(raw)) return raw;
  try {
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function computeShotFeatures(shotMap) {
  var n = Array.isArray(shotMap) ? shotMap.length : 0;
  if (!n) return { n: 0, aerialRatio: 0, aggression: 0 };

  var aerial = 0;
  var ag = 0;

  for (var i = 0; i < shotMap.length; i++) {
    var s = shotMap[i] || {};
    var t = (s.type || "").toString().toLowerCase();
    if (t === "aerial") aerial++;

    if (s.ring === 2) ag += 1.0;
    else if (s.ring === 1) ag += 0.5;
    else ag += 0.2;
  }

  return {
    n: n,
    aerialRatio: aerial / n,
    aggression: Math.max(0, Math.min(1, ag / n))
  };
}

function applyShotMapAdjustment(baseScore, bat, shotMap) {
  var f = computeShotFeatures(shotMap);
  if (!f.n) return baseScore;

  var pickup = Number(bat.pickup_rating || 0);
  var sweet = (bat.sweet_spot || "").toString().toLowerCase();
  var profile = (bat.profile || "").toString().toLowerCase();

  var aerialIntent = f.aerialRatio; // 0..1
  var pickupNorm = Math.max(0, Math.min(1, pickup / 10));

  var sweetAerial = (sweet === "high") ? 1 : (sweet === "mid" ? 0.7 : 0.3);
  var sweetGround = (sweet === "low") ? 1 : (sweet === "mid" ? 0.7 : 0.3);

  var profileAerial = (profile === "toe_heavy") ? 1 : 0.7;
  var profileGround = (profile === "balanced") ? 1 : 0.7;

  var aerialMatch = (0.55 * pickupNorm) + (0.25 * sweetAerial) + (0.20 * profileAerial);
  var groundMatch = (0.45 * (1 - Math.abs(pickupNorm - 0.75))) + (0.35 * sweetGround) + (0.20 * profileGround);

  var match = (aerialIntent * aerialMatch) + ((1 - aerialIntent) * groundMatch);

  // +/- ~8 points
  var delta = Math.round((match - 0.5) * 16);
  delta += Math.round(f.aggression * 2);

  return Math.round(baseScore * (0.92 + match * 0.16 + f.aggression * 0.04));

}

function scoreBats(input, bats) {
  // 1) infer size target once
  const sizeTarget = inferredSizeLabel(input);

  // 2) parse shot map once
  const shotMap = parseShotMap(input);

  const scored = bats
    .map((bat) => {
      // base score (your current scoring)
      let score = computeScore(input, bat, sizeTarget);

      // 3) wagon wheel adjustment (small, explainable nudge)
      score = applyShotMapAdjustment(score, bat, shotMap);

      // keep score within 0..100
      score = Math.round(Math.max(0, Math.min(100, score)));

      // 4) generate why based on FINAL score
      let why = explainPick(input, bat, score);

      // GUARANTEE array
      if (!Array.isArray(why)) {
        why = (typeof why === "string" && why.trim()) ? [why] : ["Match details unavailable."];
      }

      // Optional: add a human-readable note about the shot map effect
      // only if there were shots recorded
      if (Array.isArray(shotMap) && shotMap.length) {
        const f = computeShotFeatures(shotMap);
        const aerialPct = Math.round(f.aerialRatio * 100);
        why.unshift(`Wagon wheel used: ${aerialPct}% aerial intent (${shotMap.length} shots).`);
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
