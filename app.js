const express = require("express");
const path = require("path");
const db = require("./db");
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Session (cart aur login ke liye)
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-only-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// Har page ko cart ki ginti aur logged-in user bata do
app.use(function (req, res, next) {
  const cart = req.session.cart || {};
  res.locals.cartCount = Object.values(cart).reduce(function (a, b) { return a + b; }, 0);
  res.locals.currentUser = req.session.user || null;
  next();
});

// Sitaray: 4 -> ★★★★☆ (har EJS page mein stars() use ho sakta hai)
app.locals.stars = function (rating) {
  const r = Math.round(rating || 0);
  return "\u2605".repeat(r) + "\u2606".repeat(5 - r);
};

// Har product ki average rating aur reviews ki ginti
const RATING_SQL = "(SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id) AS avg_rating, (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count";

// Home page
app.get("/", function (req, res) {
  const featured = db.prepare("SELECT p.*, " + RATING_SQL + " FROM products p WHERE p.featured = 1 LIMIT 4").all();
  res.render("home", { featured: featured });
});

// Shop page (search + category + price filter)
app.get("/shop", function (req, res) {
  const q = (req.query.q || "").trim();
  const category = req.query.category || "";
  const min = parseInt(req.query.min) || 0;
  const max = parseInt(req.query.max) || 1000000;

  let sql = "SELECT p.*, c.name AS category_name, " + RATING_SQL + " FROM products p JOIN categories c ON c.id = p.category_id WHERE p.price BETWEEN ? AND ?";
  const params = [min, max];

  if (q) {
    sql += " AND (p.name LIKE ? OR p.description LIKE ?)";
    params.push("%" + q + "%", "%" + q + "%");
  }
  if (category) {
    sql += " AND p.category_id = ?";
    params.push(category);
  }
  sql += " ORDER BY p.id";

  const products = db.prepare(sql).all(...params);
  const categories = db.prepare("SELECT * FROM categories ORDER BY name").all();

  res.render("shop", {
    products: products,
    categories: categories,
    q: q,
    category: category,
    min: req.query.min || "",
    max: req.query.max || ""
  });
});

// Product detail page
app.get("/product/:id", function (req, res) {
  const product = db.prepare("SELECT p.*, c.name AS category_name, " + RATING_SQL + " FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?").get(req.params.id);
  if (!product) {
    return res.status(404).render("404");
  }
  const reviews = db.prepare("SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC").all(product.id);
  const related = db.prepare("SELECT p.*, " + RATING_SQL + " FROM products p WHERE p.category_id = ? AND p.id != ? LIMIT 3").all(product.category_id, product.id);
  res.render("product", { product: product, reviews: reviews, related: related });
});

app.use("/cart", require("./routes/cart"));
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/orders"));
app.use("/admin", require("./routes/admin"));

// 404 aur 500 (sab routes ke baad)
app.use(function (req, res) {
  res.status(404).render("404");
});
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).render("500");
});
app.listen(3000, function () {
  console.log("Server chal raha hai: http://localhost:3000");
});
