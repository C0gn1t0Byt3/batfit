// scripts/resetFits.js
const { db } = require("../src/config/db");

db.serialize(() => {
  db.run("DROP TABLE IF EXISTS fits", [], (err) => {
    if (err) {
      console.error("Drop failed:", err);
      process.exit(1);
    }
    console.log("✅ Dropped fits table");

    db.run(`
      CREATE TABLE IF NOT EXISTS fits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        input_json TEXT NOT NULL,
        result_json TEXT NOT NULL
      )
    `, [], (err2) => {
      if (err2) {
        console.error("Create failed:", err2);
        process.exit(1);
      }
      console.log("✅ Created fits table with input_json/result_json");
      db.close();
    });
  });
});
