// src/services/recommendation/explain.js

function explainPick(input, bat, score) {
  const lines = [];

  // Header
  lines.push(`Match score: ${score}/100`);

  // --- Derived targets (must mirror your scoring logic) ---
  const sizeTarget = inferredSizeLabel(input);

  const desiredSweet = inferDesiredSweetSpot(input);
  const pickupTarget = input.conditions === "synthetic" ? 8.5 : 7.5;

  const strengthScore = calcStrengthScore(input.experience, input.batter_style, input.max_distance_m);
  const targetWeight = strengthScore >= 7 ? 1210 : strengthScore <= 3 ? 1160 : 1180;

  // --- 1) Size ---
  if (bat.size_label === sizeTarget) {
    lines.push(`✅ Size fit: Bat size "${bat.size_label}" matches your height-based recommendation (${sizeTarget}).`);
  } else {
    lines.push(`❌ Size mismatch: Recommended size is ${sizeTarget}, but this bat is "${bat.size_label}". (This is usually the first thing to correct.)`);
  }

  // --- 2) Pick-up (dominant factor) ---
  const pickup = Number(bat.pickup_rating || 0);
  const pickupDelta = Math.abs(pickup - pickupTarget);

  if (pickupDelta <= 0.7) {
    lines.push(
      `✅ Pick-up: Rated ${pickup}/10 which is very close to the target feel for ${labelConditions(input.conditions)} wickets (~${pickupTarget}).`
    );
  } else if (pickupDelta <= 1.5) {
    lines.push(
      `⚠️ Pick-up: Rated ${pickup}/10; workable, but not perfectly aligned with the target feel for ${labelConditions(input.conditions)} wickets (~${pickupTarget}).`
    );
  } else {
    lines.push(
      `❌ Pick-up: Rated ${pickup}/10; likely to feel ${pickup > pickupTarget ? "a bit heavier/slower" : "a bit too light"} compared to the target for ${labelConditions(input.conditions)} wickets (~${pickupTarget}).`
    );
  }

  // Add a practical check (always valuable)
  lines.push(`🧪 In-person check: Do 5–10 shadow swings + a 30-second hold. If your hands/forearms burn fast, go lighter or better-balanced.`);

  // --- 3) Sweet spot vs footwork/shot type ---
  const sweet = (bat.sweet_spot || "").toLowerCase();
  if (sweetSpotMatches(desiredSweet, sweet)) {
    lines.push(
      `✅ Sweet spot: "${bat.sweet_spot}" aligns with your ${labelFootwork(input.footwork)} / ${labelShotType(input.shot_type)} preference (target: ${desiredSweet}).`
    );
  } else {
    lines.push(
      `⚠️ Sweet spot: "${bat.sweet_spot}" is not the closest match for your ${labelFootwork(input.footwork)} / ${labelShotType(input.shot_type)} preference (target: ${desiredSweet}).`
    );
  }

  // --- 4) Profile (balanced vs toe heavy) ---
  const profile = (bat.profile || "").toLowerCase();
  const wantsPower = input.batter_style === "power" || input.shot_type === "aerial";
  if (wantsPower) {
    if (profile === "toe_heavy") {
      lines.push(`✅ Profile: Toe-heavy profile suits power/aerial intent by loading more mass into the hitting zone.`);
    } else if (profile === "balanced") {
      lines.push(`⚠️ Profile: Balanced profile is safe and versatile, but you may prefer a more power-focused (toe-heavy) profile if you’re a bigger hitter.`);
    } else {
      lines.push(`ℹ️ Profile: "${bat.profile}" — consider whether it feels stable through the shot when you swing at full intent.`);
    }
  } else {
    if (profile === "balanced") {
      lines.push(`✅ Profile: Balanced profile supports timing/control and consistent ground strokes.`);
    } else if (profile === "toe_heavy") {
      lines.push(`⚠️ Profile: Toe-heavy can feel slower to start—great if you like power, less ideal if you rely on quick hands and timing.`);
    } else {
      lines.push(`ℹ️ Profile: "${bat.profile}" — test how quickly you can get the bat through the line for your usual strokes.`);
    }
  }

  // --- 5) Weight band (secondary to pick-up) ---
  const w = Number(bat.weight_g || 0);
  const wDiff = Math.abs(w - targetWeight);

  if (wDiff <= 25) {
    lines.push(`✅ Weight: ${w}g sits well in your suggested range (target ~${targetWeight}g based on style/experience).`);
  } else if (wDiff <= 60) {
    lines.push(`⚠️ Weight: ${w}g is slightly away from the target (~${targetWeight}g). Pick-up matters more, but be mindful over long innings.`);
  } else {
    lines.push(`❌ Weight: ${w}g is quite far from the target (~${targetWeight}g). If you fatigue quickly, you’ll lose timing before power matters.`);
  }

  // --- 6) Handle shape + hand size ---
  const handle = (bat.handle_shape || "").toLowerCase();
  const hs = input.hand_size_cm ? Number(input.hand_size_cm) : null;

  const handlePref = inferHandlePreference(input);
  if (handlePref === "either") {
    lines.push(`ℹ️ Handle: ${bat.handle_shape}. Based on your style this is fine either way—choose what feels secure and comfortable.`);
  } else if (handle === handlePref) {
    lines.push(`✅ Handle: ${bat.handle_shape} matches your style preference (${handlePref}).`);
  } else {
    lines.push(`⚠️ Handle: ${bat.handle_shape} differs from your typical style preference (${handlePref}). Not a deal-breaker—comfort and control win.`);
  }

  if (hs != null) {
    lines.push(`🖐️ Hand size note: With hand size ${hs}cm, you may prefer a ${hs >= 20 ? "slightly thicker grip" : "standard/thinner grip"} for comfort and control.`);
  } else {
    lines.push(`🖐️ Hand size note: Add hand size later to refine grip/handle comfort (small detail, but helps long sessions).`);
  }

  // --- 7) Bat-specific detail ---
  if (bat.notes) lines.push(`📌 Notes: ${bat.notes}`);
  lines.push(`Specs: ${bat.size_label} | ${bat.weight_g}g | Pick-up ${bat.pickup_rating}/10 | Sweet spot ${bat.sweet_spot} | Profile ${bat.profile} | Handle ${bat.handle_shape}/${bat.handle_length}`);

  return lines;
}

/* -------------------------
   Helper functions
-------------------------- */

function inferredSizeLabel(input) {
  const h = Number(input.height_cm);
  if (!Number.isFinite(h)) return "SH";
  if (h <= 135) return "6";
  if (h <= 160) return "Harrow";
  return "SH";
}

function inferDesiredSweetSpot(input) {
  const footwork = input.footwork;
  const shotType = input.shot_type;

  if (footwork === "front_foot" || shotType === "ground") return "low/mid";
  if (footwork === "back_foot" || shotType === "aerial") return "mid/high";
  return "mid";
}

function sweetSpotMatches(desired, actual) {
  if (!actual) return false;
  if (desired === "mid") return actual === "mid";
  if (desired === "low/mid") return actual === "low" || actual === "mid";
  if (desired === "mid/high") return actual === "mid" || actual === "high";
  return false;
}

function calcStrengthScore(experience, batterStyle, maxDistanceM) {
  let score = 5;

  if (experience === "beginner") score -= 2;
  if (experience === "advanced") score += 2;

  if (batterStyle === "power") score += 2;
  if (batterStyle === "defensive") score -= 1;

  const d = maxDistanceM != null ? Number(maxDistanceM) : null;
  if (typeof d === "number" && Number.isFinite(d)) {
    if (d >= 70) score += 2;
    else if (d <= 35) score -= 2;
  }

  return Math.max(1, Math.min(10, score));
}

function inferHandlePreference(input) {
  // conservative rules:
  // shot_maker -> round
  // power/front foot -> oval
  // else either
  if (input.batter_style === "shot_maker") return "round";
  if (input.batter_style === "power" || input.footwork === "front_foot") return "oval";
  return "either";
}

function labelConditions(v) {
  if (v === "synthetic") return "synthetic/astro";
  if (v === "turf") return "turf";
  return v || "unknown";
}

function labelFootwork(v) {
  if (v === "front_foot") return "front-foot";
  if (v === "back_foot") return "back-foot";
  if (v === "mixed") return "mixed-footwork";
  return v || "unknown";
}

function labelShotType(v) {
  if (v === "ground") return "ground-stroke";
  if (v === "aerial") return "aerial/power";
  if (v === "mixed") return "mixed intent";
  return v || "unknown";
}

module.exports = { explainPick };
