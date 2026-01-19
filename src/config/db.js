// src/config/db.js
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { env } = require("./env");

// Ensure DB directory exists
const dbFile = env.DB_PATH;
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Create/open DB
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error("DB open error:", err.message);
  else console.log(`SQLite DB ready: ${dbFile}`);
});

// Run schema + seed once
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
const seedPath = path.join(__dirname, "..", "db", "seed.sql");

function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf-8");
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

(async () => {
  try {
    await runSqlFile(schemaPath);
    await runSqlFile(seedPath);
  } catch (e) {
    console.error("DB init error:", e.message);
  }
})();

module.exports = { db };
