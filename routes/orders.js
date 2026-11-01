const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware");
const router = express.Router();

// Session ke cart se asli items aur total (qeemat hamesha database se)
function cartItems(req) {
  const cart = req.session.cart || {};
  const items = [];
  let total = 0;
  Object.keys(cart).forEach(function (id) {
    const p = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!p || p.stock < 1) return;
    const qty = Math.min(cart[id], p.stock);
    const subtotal = p.price * qty;
    total += subtotal;
    items.push({ product: p, qty: qty, subtotal: subtotal });
  });
  return { items: items, total: total };
}

// Order banana: sab kuch ek saath ho, ya kuch bhi nahi (transaction)
const placeOrder = db.transaction(function (userId, items, total, address, phone) {
  const order = db.prepare("INSERT INTO orders (user_id, total, address, phone) VALUES (?, ?, ?, ?)").run(userId, total, address, phone);
  const orderId = Number(order.lastInsertRowid);

  items.forEach(function (it) {
    const upd = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?").run(it.qty, it.product.id, it.qty);
    if (upd.changes === 0) throw new Error("OUT_OF_STOCK");
    db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)").run(orderId, it.product.id, it.qty, it.product.price);
  });

  return orderId;
});

// Checkout page
router.get("/checkout", requireLogin, function (req, res) {
  const data = cartItems(req);
  if (data.items.length === 0) return res.redirect("/cart");
  res.render("checkout", { items: data.items, total: data.total, error: null, form: {} });
});

// Order lagana
router.post("/checkout", requireLogin, function (req, res) {
  const data = cartItems(req);
  if (data.items.length === 0) return res.redirect("/cart");

  const address = (req.body.address || "").trim();
  const phone = (req.body.phone || "").trim();
  const form = { address: address, phone: phone };

  let error = null;
  if (address.length < 10) error = "Please enter your full delivery address.";
  else if (!/^[0-9+\-\s]{10,15}$/.test(phone)) error = "Please enter a valid phone number.";

  if (error) {
    return res.status(400).render("checkout", { items: data.items, total: data.total, error: error, form: form });
  }

  try {
    const orderId = placeOrder(req.session.user.id, data.items, data.total, address, phone);
    req.session.cart = {};
    res.redirect("/order/" + orderId + "/confirmation");
  } catch (e) {
    res.status(400).render("checkout", {
      items: data.items,
      total: data.total,
      error: "Sorry, an item just went out of stock. Please review your cart.",
      form: form
    });
  }
});

// Order confirmation
router.get("/order/:id/confirmation", requireLogin, function (req, res) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).render("404");
  if (order.user_id !== req.session.user.id && req.session.user.role !== "admin") {
    return res.status(403).render("403");
  }
  const lines = db.prepare("SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?").all(order.id);
  res.render("order-confirmation", { order: order, lines: lines });
});

// My Orders (order history)
router.get("/orders", requireLogin, function (req, res) {
  const orders = db.prepare("SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC").all(req.session.user.id);
  res.render("orders", { orders: orders });
});

// Ek order ki tafseel
router.get("/order/:id", requireLogin, function (req, res) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).render("404");
  if (order.user_id !== req.session.user.id && req.session.user.role !== "admin") {
    return res.status(403).render("403");
  }
  const lines = db.prepare("SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?").all(order.id);
  res.render("order-detail", { order: order, lines: lines });
});

module.exports = router;
