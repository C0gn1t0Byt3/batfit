// src/controllers/homeController.js
function home(req, res) {
  res.render("pages/home", {
    title: "Cricket Bat Fitter",
  });
}

function wiki(req, res) {
  res.render("pages/wiki", {
    title: "Developer Wiki",
  });
}

module.exports = { home, wiki };
