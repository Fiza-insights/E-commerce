const express = require("express");
const db = require("../db");
const router = express.Router();

function getCart(req) {
  if (!req.session.cart) req.session.cart = {};
  return req.session.cart;
}

// Cart dekhna
router.get("/", function (req, res) {
  const cart = getCart(req);
  const items = [];
  let total = 0;

  Object.keys(cart).forEach(function (id) {
    const p = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!p) { delete cart[id]; return; }
    const qty = Math.min(cart[id], p.stock);
    if (qty < 1) { delete cart[id]; return; }
    cart[id] = qty;
    const subtotal = p.price * qty;
    total += subtotal;
    items.push({ product: p, qty: qty, subtotal: subtotal });
  });

  res.render("cart", { items: items, total: total });
});

// Cart mein dalna
router.post("/add", function (req, res) {
  const id = parseInt(req.body.product_id);
  const qty = Math.max(parseInt(req.body.quantity) || 1, 1);
  const product = db.prepare("SELECT id, stock FROM products WHERE id = ?").get(id);
  if (!product || product.stock < 1) return res.redirect("/shop");

  const cart = getCart(req);
  cart[id] = Math.min((cart[id] || 0) + qty, product.stock);
  res.redirect("/cart");
});

// Quantity badalna (0 likhne par hat jata hai)
router.post("/update", function (req, res) {
  const id = parseInt(req.body.product_id);
  const qty = parseInt(req.body.quantity) || 0;
  const product = db.prepare("SELECT stock FROM products WHERE id = ?").get(id);
  const cart = getCart(req);

  if (!product || qty < 1) {
    delete cart[id];
  } else {
    cart[id] = Math.min(qty, product.stock);
  }
  res.redirect("/cart");
});

// Hatana
router.post("/remove", function (req, res) {
  delete getCart(req)[parseInt(req.body.product_id)];
  res.redirect("/cart");
});

module.exports = router;
