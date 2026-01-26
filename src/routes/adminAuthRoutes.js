const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

router.get("/admin/login", (req, res) => {
  res.render("admin/login", { title: "Admin Login", error: null });
});

router.post("/admin/login", async (req, res) => {
  try {
    const pw = (req.body.password || "").trim();
    const hash = process.env.ADMIN_PASSWORD_HASH;

    if (!pw || !hash) {
      return res.status(401).render("admin/login", {
        title: "Admin Login",
        error: "Incorrect password"
      });
    }

    const passwordMatch = await bcrypt.compare(pw, hash);

    if (passwordMatch) {
      req.session.isAdmin = true;
      return res.redirect("/admin/bats");
    }

    return res.status(401).render("admin/login", {
      title: "Admin Login",
      error: "Incorrect password"
    });

  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).render("admin/login", {
      title: "Admin Login",
      error: "Server error. Please try again."
    });
  }
});

router.post("/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
