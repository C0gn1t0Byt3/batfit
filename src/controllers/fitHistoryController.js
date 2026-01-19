// src/controllers/fitHistoryController.js
const FitModel = require("../models/FitModel");

async function list(req, res) {
  try {
    const tenantId = 1;
    const fits = await FitModel.listAll(tenantId, 100);

    return res.render("fits/list", {
      title: "Saved Fits",
      fits,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error loading saved fits");
  }
}

async function view(req, res) {
  try {
    const tenantId = 1;
    const id = Number(req.params.id);

    const fit = await FitModel.getById(tenantId, id);
    if (!fit) return res.status(404).send("Fit not found");

    return res.render("fit/results", {
      title: `Fit #${fit.id}`,
      result: { ...fit.result, savedFitId: fit.id },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error loading fit");
  }
}

module.exports = { list, view };
