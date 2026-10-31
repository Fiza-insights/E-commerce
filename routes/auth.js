const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function goBack(req, res) {
  const dest = req.session.returnTo || "/";
  delete req.session.returnTo;
  res.redirect(dest);
}

// Register
router.get("/register", function (req, res) {
  if (req.session.user) return res.redirect("/");
  res.render("register", { error: null, form: {} });
});

router.post("/register", function (req, res) {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const confirm = req.body.confirm || "";
  const form = { name: name, email: email };

  let error = null;
  if (name.length < 2) error = "Please enter your full name.";
  else if (!emailPattern.test(email)) error = "Please enter a valid email address.";
  else if (password.length < 6) error = "Password must be at least 6 characters.";
  else if (password !== confirm) error = "Passwords do not match.";
  else if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) error = "An account with this email already exists.";

  if (error) return res.status(400).render("register", { error: error, form: form });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hash);
  req.session.user = { id: Number(result.lastInsertRowid), name: name, email: email, role: "customer" };
  goBack(req, res);
});

// Login
router.get("/login", function (req, res) {
  if (req.session.user) return res.redirect("/");
  res.render("login", { error: null, form: {} });
});

router.post("/login", function (req, res) {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render("login", { error: "Invalid email or password.", form: { email: email } });
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  goBack(req, res);
});

// Logout
router.post("/logout", function (req, res) {
  delete req.session.user;
  res.redirect("/");
});

module.exports = router;
