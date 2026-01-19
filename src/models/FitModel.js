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
      result_json TEXT NOT NULL
    )
  `);
}

async function create(tenantId, input, result) {
  const createdAt = new Date().toISOString();
  const inputJson = JSON.stringify(input);
  const resultJson = JSON.stringify(result);

  const r = await run(
    `INSERT INTO fits (tenant_id, created_at, input_json, result_json)
     VALUES (?, ?, ?, ?)`,
    [tenantId, createdAt, inputJson, resultJson]
  );

  return { id: r.lastID, created_at: createdAt };
}

async function getById(tenantId, id) {
  const row = await get(
    `SELECT * FROM fits WHERE tenant_id = ? AND id = ?`,
    [tenantId, id]
  );
  if (!row) return null;

  return {
    ...row,
    input: JSON.parse(row.input_json),
    result: JSON.parse(row.result_json),
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

  // lightweight summary extraction for list UI
  return rows.map(r => {
    let input = {};
    let result = {};
    try { input = JSON.parse(r.input_json); } catch {}
    try { result = JSON.parse(r.result_json); } catch {}

    const best = result?.top?.[0]?.bat;
    return {
      id: r.id,
      created_at: r.created_at,
      player_name: input.player_name || "",
      height_cm: input.height_cm || "",
      experience: input.experience || "",
      best_brand: best?.brand || "",
      best_model: best?.model || "",
      best_size: best?.size_label || "",
    };
  });
}

async function update(tenantId, id, input, result) {
  const inputJson = JSON.stringify(input);
  const resultJson = JSON.stringify(result);

  await run(
    `UPDATE fits SET input_json = ?, result_json = ? WHERE tenant_id = ? AND id = ?`,
    [inputJson, resultJson, tenantId, id]
  );

  return { id };
}


module.exports = { ensureTable, create, update, getById, listAll };
