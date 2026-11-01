const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware");
const router = express.Router();

// Is file ke har route par pehra: sirf admin andar aa sakta hai
router.use(requireAdmin);

router.get("/", function (req, res) {
  const count = function (sql) { return db.prepare(sql).get().n; };

  const stats = {
    products: count("SELECT COUNT(*) AS n FROM products"),
    orders: count("SELECT COUNT(*) AS n FROM orders"),
    pending: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"),
    customers: count("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'"),
    revenue: count("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled'")
  };

  const lowStock = db.prepare("SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock, name").all();
  const recent = db.prepare("SELECT o.*, u.name AS customer FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 5").all();

  res.render("admin/dashboard", { stats: stats, lowStock: lowStock, recent: recent });
});

// ===== Products management =====
function readProduct(body) {
  return {
    name: (body.name || "").trim(),
    category_id: parseInt(body.category_id),
    price: parseInt(body.price),
    stock: parseInt(body.stock),
    image: (body.image || "").trim(),
    description: (body.description || "").trim(),
    long_description: (body.long_description || "").trim(),
    featured: body.featured ? 1 : 0
  };
}

function validateProduct(p) {
  if (p.name.length < 2) return "Please enter a product name.";
  if (!db.prepare("SELECT id FROM categories WHERE id = ?").get(p.category_id)) return "Please choose a category.";
  if (!(p.price >= 1)) return "Price must be a positive number.";
  if (!(p.stock >= 0)) return "Stock must be zero or more.";
  if (p.image && !/^[\w\-.]+\.(jpg|jpeg|png|webp)$/i.test(p.image)) return "Image must be a file name like necklace-1.jpg";
  return null;
}

function allCategories() {
  return db.prepare("SELECT * FROM categories ORDER BY name").all();
}

// List
router.get("/products", function (req, res) {
  const products = db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC").all();
  res.render("admin/products", { products: products, msg: req.query.msg || "" });
});

// Add form
router.get("/products/new", function (req, res) {
  res.render("admin/product-form", { product: { featured: 0, stock: 0 }, categories: allCategories(), error: null, isNew: true });
});

router.post("/products", function (req, res) {
  const p = readProduct(req.body);
  const error = validateProduct(p);
  if (error) {
    return res.status(400).render("admin/product-form", { product: p, categories: allCategories(), error: error, isNew: true });
  }
  db.prepare("INSERT INTO products (category_id, name, description, long_description, price, stock, image, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(p.category_id, p.name, p.description, p.long_description, p.price, p.stock, p.image, p.featured);
  res.redirect("/admin/products?msg=" + encodeURIComponent("Product added."));
});

// Edit form
router.get("/products/:id/edit", function (req, res) {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).render("404");
  res.render("admin/product-form", { product: product, categories: allCategories(), error: null, isNew: false });
});

router.post("/products/:id", function (req, res) {
  const id = parseInt(req.params.id);
  if (!db.prepare("SELECT id FROM products WHERE id = ?").get(id)) return res.status(404).render("404");
  const p = readProduct(req.body);
  p.id = id;
  const error = validateProduct(p);
  if (error) {
    return res.status(400).render("admin/product-form", { product: p, categories: allCategories(), error: error, isNew: false });
  }
  db.prepare("UPDATE products SET category_id = ?, name = ?, description = ?, long_description = ?, price = ?, stock = ?, image = ?, featured = ? WHERE id = ?")
    .run(p.category_id, p.name, p.description, p.long_description, p.price, p.stock, p.image, p.featured, id);
  res.redirect("/admin/products?msg=" + encodeURIComponent("Product updated."));
});

// Quick stock update
router.post("/products/:id/stock", function (req, res) {
  const stock = parseInt(req.body.stock);
  if (stock >= 0) {
    db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(stock, parseInt(req.params.id));
  }
  res.redirect("/admin/products?msg=" + encodeURIComponent("Stock updated."));
});

// Delete (agar kisi order mein hai to nahi hata sakte)
router.post("/products/:id/delete", function (req, res) {
  const id = parseInt(req.params.id);
  const used = db.prepare("SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?").get(id).n;
  if (used > 0) {
    return res.redirect("/admin/products?msg=" + encodeURIComponent("This product is in existing orders, so it cannot be deleted. Set its stock to 0 instead."));
  }
  db.prepare("DELETE FROM reviews WHERE product_id = ?").run(id);
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  res.redirect("/admin/products?msg=" + encodeURIComponent("Product deleted."));
});

// ===== Orders management =====
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

// Cancel karne par stock wapas
const cancelOrder = db.transaction(function (orderId) {
  const items = db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").all(orderId);
  items.forEach(function (i) {
    db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(i.quantity, i.product_id);
  });
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(orderId);
});

router.get("/orders", function (req, res) {
  const status = req.query.status || "";
  let sql = "SELECT o.*, u.name AS customer FROM orders o JOIN users u ON u.id = o.user_id";
  const params = [];
  if (STATUSES.includes(status)) {
    sql += " WHERE o.status = ?";
    params.push(status);
  }
  sql += " ORDER BY o.id DESC";
  const orders = db.prepare(sql).all(...params);
  res.render("admin/orders", { orders: orders, status: status, statuses: STATUSES });
});

router.get("/orders/:id", function (req, res) {
  const order = db.prepare("SELECT o.*, u.name AS customer, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?").get(req.params.id);
  if (!order) return res.status(404).render("404");
  const lines = db.prepare("SELECT oi.*, p.name FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?").all(order.id);
  res.render("admin/order-detail", { order: order, lines: lines, statuses: STATUSES, msg: req.query.msg || "" });
});

router.post("/orders/:id/status", function (req, res) {
  const id = parseInt(req.params.id);
  const next = req.body.status;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) return res.status(404).render("404");

  const back = "/admin/orders/" + id + "?msg=";
  if (!STATUSES.includes(next)) return res.redirect(back + encodeURIComponent("Invalid status."));
  if (order.status === "cancelled") return res.redirect(back + encodeURIComponent("Cancelled orders cannot be changed."));

  if (next === "cancelled") {
    cancelOrder(id);
    return res.redirect(back + encodeURIComponent("Order cancelled and stock restored."));
  }
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(next, id);
  res.redirect(back + encodeURIComponent("Status updated to " + next + "."));
});

module.exports = router;
