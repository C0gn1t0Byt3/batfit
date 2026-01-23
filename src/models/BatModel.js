const { db } = require("../config/db");

function listAll (tenantId = 1) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM bats WHERE tenant_id = ? ORDER BY brand, model`, [tenantId], (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

function getById(id, tenantId = 1) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM bats WHERE id = ? AND tenant_id = ?`, [id, tenantId], (err, row) => (err ? reject(err) : resolve(row)));
    });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
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

// Admin list
async function adminList(tenantId, limit = 500) {
  return await all(
    `SELECT * FROM bats WHERE tenant_id = ? ORDER BY brand, model, size_label LIMIT ?`,
    [tenantId, limit]
  );
}

// Clear bats for tenant
async function clearTenant(tenantId) {
  await run(`DELETE FROM bats WHERE tenant_id = ?`, [tenantId]);
}

// Upsert batch (insert or update on unique key)
async function upsertMany(tenantId, bats) {
  let inserted = 0;
  let updated = 0;

  const sql = `
    INSERT INTO bats (
      tenant_id, brand, model, size_label, weight_g, pickup_rating,
      sweet_spot, profile, handle_shape, handle_length, bow, notes, image_url
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id, brand, model, size_label) DO UPDATE SET
      weight_g = excluded.weight_g,
      pickup_rating = excluded.pickup_rating,
      sweet_spot = excluded.sweet_spot,
      profile = excluded.profile,
      handle_shape = excluded.handle_shape,
      handle_length = excluded.handle_length,
      bow = excluded.bow,
      notes = excluded.notes,
      image_url = excluded.image_url
  `;

  for (const b of bats) {
    const r = await run(sql, [
      tenantId,
      b.brand,
      b.model,
      b.size_label || "",
      b.weight_g ?? null,
      b.pickup_rating ?? null,
      b.sweet_spot || "",
      b.profile || "",
      b.handle_shape || "",
      b.handle_length || "",
      b.bow || "",
      b.notes || "",
      b.image_url || null,
    ]);

    // SQLite "upsert" returns changes=1 for insert or update, but not which.
    // A simple heuristic: if lastID advanced => insert; otherwise treat as update.
    if (r.lastID && r.lastID > 0) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated, total: bats.length };
}

async function existingKeys(tenantId, keys) {
  // keys = [{brand, model, size_label}, ...]
  // Build a WHERE OR list (fine for <= 1000 rows)
  if (!keys.length) return new Set();

  const clauses = [];
  const params = [tenantId];

  for (const k of keys) {
    clauses.push(`(brand = ? AND model = ? AND size_label = ?)`);
    params.push(k.brand, k.model, k.size_label || "");
  }

  const rows = await all(
    `SELECT brand, model, size_label
     FROM bats
     WHERE tenant_id = ? AND (${clauses.join(" OR ")})`,
    params
  );

  const set = new Set();
  for (const r of rows) set.add(`${r.brand}||${r.model}||${r.size_label || ""}`);
  return set;
}

async function adminListForExport(tenantId) {
  return await all(
    `SELECT brand, model, size_label, weight_g, pickup_rating, sweet_spot, profile,
            handle_shape, handle_length, bow, notes, image_url
     FROM bats
     WHERE tenant_id = ?
     ORDER BY brand, model, size_label`,
    [tenantId]
  );
}

async function adminListFiltered(tenantId, { q = "", brand = "", profile = "", sweet_spot = "", limit = 1000 } = {}) {
  const where = ["tenant_id = ?"];
  const params = [tenantId];

  if (q && q.trim()) {
    where.push("(brand LIKE ? OR model LIKE ?)");
    const like = `%${q.trim()}%`;
    params.push(like, like);
  }
  if (brand) {
    where.push("brand = ?");
    params.push(brand);
  }
  if (profile) {
    where.push("profile = ?");
    params.push(profile);
  }
  if (sweet_spot) {
    where.push("sweet_spot = ?");
    params.push(sweet_spot);
  }

  params.push(limit);

  return await all(
    `SELECT * FROM bats
     WHERE ${where.join(" AND ")}
     ORDER BY brand, model, size_label
     LIMIT ?`,
    params
  );
}

async function adminFilterOptions(tenantId) {
  const brands = await all(`SELECT DISTINCT brand FROM bats WHERE tenant_id = ? ORDER BY brand`, [tenantId]);
  const profiles = await all(`SELECT DISTINCT profile FROM bats WHERE tenant_id = ? AND profile <> '' ORDER BY profile`, [tenantId]);
  const sweetSpots = await all(`SELECT DISTINCT sweet_spot FROM bats WHERE tenant_id = ? AND sweet_spot <> '' ORDER BY sweet_spot`, [tenantId]);

  return {
    brands: brands.map(r => r.brand),
    profiles: profiles.map(r => r.profile),
    sweetSpots: sweetSpots.map(r => r.sweet_spot),
  };
}

async function listBrands(tenantId) {
  return await all(
    `SELECT DISTINCT brand FROM bats WHERE tenant_id = ? AND brand IS NOT NULL AND brand <> '' ORDER BY brand`,
    [tenantId]
  );
}


module.exports = { listAll, getById, adminList, clearTenant, upsertMany, existingKeys, adminListForExport, adminListFiltered, adminFilterOptions, listBrands };