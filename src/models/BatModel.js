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

module.exports = { listAll, getById };