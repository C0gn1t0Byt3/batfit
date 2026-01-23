// src/models/FitModel.js
const { db } = require("../config/db");

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Create table if missing (call this on app boot ideally)
async function ensureTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS fits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      input_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      shot_map_json TEXT NOT NULL DEFAULT '[]'
    )
  `);

  // If table existed already without the column, add it safely
  // (SQLite: try/catch because ADD COLUMN will fail if already exists)
  try {
    await run(`ALTER TABLE fits ADD COLUMN shot_map_json TEXT NOT NULL DEFAULT '[]'`);
  } catch (e) {
    // ignore "duplicate column name" etc.
  }
}

function normalizeShotMapJson(input) {
  // input.shot_map_json may be:
  // - stringified JSON
  // - array
  // - undefined
  if (!input) return "[]";

  const raw = input.shot_map_json;
  if (!raw) return "[]";

  if (Array.isArray(raw)) return JSON.stringify(raw);

  if (typeof raw === "string" && raw.trim()) return raw;

  return "[]";
}

async function create(tenantId, input, result) {
  const createdAt = new Date().toISOString();
  const inputJson = JSON.stringify(input || {});
  const resultJson = JSON.stringify(result || {});
  const shotMapJson = normalizeShotMapJson(input);

  const r = await run(
    `INSERT INTO fits (tenant_id, created_at, input_json, result_json, shot_map_json)
     VALUES (?, ?, ?, ?, ?)`,
    [tenantId, createdAt, inputJson, resultJson, shotMapJson]
  );

  return { id: r.lastID, created_at: createdAt };
}

async function getById(tenantId, id) {
  const row = await get(
    `SELECT * FROM fits WHERE tenant_id = ? AND id = ?`,
    [tenantId, id]
  );
  if (!row) return null;

  let input = {};
  let result = {};
  try { input = JSON.parse(row.input_json || "{}"); } catch (e) { input = {}; }
  try { result = JSON.parse(row.result_json || "{}"); } catch (e) { result = {}; }

  return {
    ...row,
    input,
    result,
    shot_map_json: row.shot_map_json || "[]"
  };
}

async function listAll(tenantId, limit = 50) {
  const rows = await all(
    `SELECT id, created_at, input_json, result_json
     FROM fits
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    [tenantId, limit]
  );

  return rows.map((r) => {
    let input = {};
    let result = {};
    try { input = JSON.parse(r.input_json || "{}"); } catch (e) { input = {}; }
    try { result = JSON.parse(r.result_json || "{}"); } catch (e) { result = {}; }

    const best = (result && result.top && result.top[0] && result.top[0].bat) ? result.top[0].bat : null;

    return {
      id: r.id,
      created_at: r.created_at,
      player_name: input.player_name || "",
      height_cm: input.height_cm || "",
      experience: input.experience || "",
      best_brand: best ? (best.brand || "") : "",
      best_model: best ? (best.model || "") : "",
      best_size: best ? (best.size_label || "") : ""
    };
  });
}

async function update(tenantId, id, input, result) {
  const inputJson = JSON.stringify(input || {});
  const resultJson = JSON.stringify(result || {});
  const shotMapJson = normalizeShotMapJson(input);

  await run(
    `UPDATE fits
     SET input_json = ?, result_json = ?, shot_map_json = ?
     WHERE tenant_id = ? AND id = ?`,
    [inputJson, resultJson, shotMapJson, tenantId, id]
  );

  return { id };
}

async function updateShotMap(tenantId, id, shotMap) {
  const shotMapJson = (typeof shotMap === "string")
    ? (shotMap.trim() ? shotMap : "[]")
    : JSON.stringify(Array.isArray(shotMap) ? shotMap : []);

  await run(
    `UPDATE fits SET shot_map_json = ? WHERE tenant_id = ? AND id = ?`,
    [shotMapJson, tenantId, id]
  );

  return { id };
}

module.exports = { ensureTable, create, update, getById, listAll, updateShotMap };
