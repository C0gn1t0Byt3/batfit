// src/models/FitModels.js
const { db } = require("../config/db");


function create(tenantId, input, result) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO fits (
        tenant_id,
        height_cm, weight_kg, hand_size_cm, floor_to_wrist_cm,
        shot_type, conditions, footwork, batter_style,
        max_distance_m, experience,
        result_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      tenantId,
      input.height_cm ?? null,
      input.weight_kg ?? null,
      input.hand_size_cm ?? null,
      input.floor_to_wrist_cm ?? null,
      input.shot_type ?? null,
      input.conditions ?? null,
      input.footwork ?? null,
      input.batter_style ?? null,
      input.max_distance_m ?? null,
      input.experience ?? null,
      JSON.stringify(result),
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function getById(id, tenantId = 1) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM fits WHERE id = ? AND tenant_id = ?`,
      [id, tenantId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function update(id, tenantId, input, result) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE fits SET
        height_cm = ?, weight_kg = ?, hand_size_cm = ?, floor_to_wrist_cm = ?,
        shot_type = ?, conditions = ?, footwork = ?, batter_style = ?,
        max_distance_m = ?, experience = ?,
        result_json = ?
      WHERE id = ? AND tenant_id = ?
    `;

    const params = [
      input.height_cm ?? null,
      input.weight_kg ?? null,
      input.hand_size_cm ?? null,
      input.floor_to_wrist_cm ?? null,
      input.shot_type ?? null,
      input.conditions ?? null,
      input.footwork ?? null,
      input.batter_style ?? null,
      input.max_distance_m ?? null,
      input.experience ?? null,
      JSON.stringify(result),
      id,
      tenantId,
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id });
    });
  });
}

module.exports = { create, getById, update };

