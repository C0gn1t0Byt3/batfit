// scripts/importBats.js
// Usage:
//   node scripts/importBats.js
//   node scripts/importBats.js --clear

const fs = require("fs");
const path = require("path");
const fastcsv = require("fast-csv");
const { db } = require("../src/config/db"); // <- adjust path if your config/db lives elsewhere

const TENANT_ID = 1;

// Must match your bats table column names
const INSERT_SQL = `
  INSERT INTO bats (
    tenant_id, brand, model, size_label, weight_g, pickup_rating, sweet_spot,
    profile, handle_shape, handle_length, bow, notes, image_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function prepareValue(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return s;
}

function toNumberOrNull(v) {
  const s = prepareValue(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function importBats({ clearFirst = false } = {}) {
  const csvPath = path.join(process.cwd(), "data", "bats.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }

  if (clearFirst) {
    await run(`DELETE FROM bats`);
    console.log(`Cleared existing bats`);
  }

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(fastcsv.parse({ headers: true, ignoreEmpty: true, trim: true }))
      .on("error", reject)
      .on("data", (row) => rows.push(row))
      .on("end", resolve);
  });

  if (!rows.length) {
    console.log("No rows found in CSV (check headers + content).");
    return;
  }

  // Do inserts in a transaction for speed + integrity
  await run("BEGIN TRANSACTION");

  let inserted = 0;
  try {
    for (const r of rows) {
      // Expected headers in CSV:
      // brand,model,size_label,weight_g,pickup_rating,sweet_spot,profile,handle_shape,handle_length,bow,notes,image_url
      const params = [
        TENANT_ID,
        prepareValue(r.brand),
        prepareValue(r.model),
        prepareValue(r.size_label),
        toNumberOrNull(r.weight_g),
        toNumberOrNull(r.pickup_rating),
        prepareValue(r.sweet_spot),
        prepareValue(r.profile),
        prepareValue(r.handle_shape),
        prepareValue(r.handle_length),
        prepareValue(r.bow),
        prepareValue(r.notes),
        prepareValue(r.image_url),
      ];

      // Basic minimum validation
      if (!params[1] || !params[2]) {
        // brand/model required
        console.warn("Skipping row (missing brand/model):", r);
        continue;
      }

      await run(INSERT_SQL, params);
      inserted++;
    }

    await run("COMMIT");
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }

  console.log(`Imported ${inserted} bats from data/bats.csv`);
}

// CLI entry
(async () => {
  const clearFirst = process.argv.includes("--clear");
  try {
    await importBats({ clearFirst });
    process.exit(0);
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  }
})();

module.exports = { importBats };
