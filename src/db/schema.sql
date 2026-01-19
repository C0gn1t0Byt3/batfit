-- src/db/schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Start with a single tenant (future SaaS foundation)
INSERT OR IGNORE INTO tenants (id, name) VALUES (1, 'Default Tenant');

CREATE TABLE IF NOT EXISTS bats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size_label TEXT NOT NULL,          -- e.g., "SH", "Harrow", "6"
  weight_g INTEGER NOT NULL,         -- total mass
  pickup_rating INTEGER NOT NULL,    -- 1-10 subjective
  sweet_spot TEXT NOT NULL,          -- low/mid/high
  profile TEXT NOT NULL,             -- balanced/toe_heavy/etc
  handle_shape TEXT NOT NULL,        -- oval/round
  handle_length TEXT NOT NULL,       -- short/standard/long
  bow TEXT NOT NULL,                 -- low/mid/high
  notes TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS fits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- user inputs
  height_cm INTEGER NOT NULL,
  weight_kg INTEGER NOT NULL,
  hand_size_cm REAL,
  floor_to_wrist_cm REAL,

  shot_type TEXT NOT NULL,
  conditions TEXT NOT NULL,
  footwork TEXT NOT NULL,
  batter_style TEXT NOT NULL,
  max_distance_m INTEGER,
  experience TEXT NOT NULL,

  -- computed outputs as JSON strings for simplicity
  result_json TEXT NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bats_unique
ON bats (tenant_id, brand, model, size_label);
