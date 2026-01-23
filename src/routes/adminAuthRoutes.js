const express = require("express");
const router = express.Router();

router.get("/admin/login", (req, res) => {
  res.render("admin/login", { title: "Admin Login", error: null });
});

router.post("/admin/login", (req, res) => {
  const pw = (req.body.password || "").trim();
  if (pw && pw === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin/bats");
  }
  return res.status(401).render("admin/login", {
    title: "Admin Login",
    error: "Incorrect password"
  });
});

router.post("/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
