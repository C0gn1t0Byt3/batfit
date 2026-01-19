//src/controllers/apiController.js
const BatMode1 = require("../models/BatModel");
const { recommendBats } = require("../services/fitService");

async function listBats(req, res, next) {
    try {
        const bats = await BatMode1.listAll();
        res.json( {bats} );
    } catch (err) {
        next(err);
    }
}

async function recommend (req, res, next) {
    try {
        const result = await recommendBats(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = { listBats, recommend };