const db = require("./db");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Seeded random: har baar wohi data banta hai
let seedState = 12345;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function between(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
function daysAgo(d) {
  return new Date(Date.now() - d * 86400000).toISOString().slice(0, 19).replace("T", " ");
}

// Purana dummy data saaf (asli accounts nahi hatte)
db.exec("DELETE FROM reviews; DELETE FROM order_items; DELETE FROM orders; DELETE FROM products; DELETE FROM categories; DELETE FROM sqlite_sequence WHERE name IN ('products','categories','reviews','orders','order_items');");
db.prepare("DELETE FROM users WHERE email LIKE '%@example.com' OR email = 'admin@lustre.test'").run();

const notes = [
  "Delicate and light for everyday wear.",
  "A timeless piece for special occasions.",
  "Soft shine with a smooth, comfortable finish.",
  "Designed to layer beautifully with other pieces."
];

const catalog = [
  {
    name: "Necklaces", prefix: "necklace", base: 5500,
    text: "A gold-plated necklace with a delicate finish.",
    long: "Crafted from hypoallergenic brass with a lasting 18k gold plating, this necklace rests softly at the collarbone. The chain is light enough for all-day wear and closes with a secure lobster clasp. Pair it with a simple neckline and let the details shine.",
    items: ["Lumi Pendant Necklace", "Aurelia Layered Chain", "Pearl Drop Necklace", "Celeste Star Necklace", "Luna Moon Pendant", "Orion Bar Necklace", "Soleil Coin Necklace", "Vesper Choker", "Elara Heart Pendant", "Zara Initial Necklace", "Isla Charm Chain"]
  },
  {
    name: "Earrings", prefix: "earrings", base: 3500,
    text: "Gold-finish earrings with nickel-free posts.",
    long: "Made with nickel-free posts and a gentle gold finish, these earrings are designed for sensitive ears and all-day comfort. They are light, secure and easy to dress up or down, from office hours to evening plans.",
    items: ["Seren Huggie Hoops", "Celeste Stud Set", "Opal Drop Earrings", "Aria Leaf Studs", "Nova Ear Climbers", "Lyra Pearl Studs", "Maeve Twist Hoops", "Ivy Dangle Earrings", "Sol Statement Earrings", "Cleo Mini Hoops", "Wren Crystal Drops"]
  },
  {
    name: "Rings", prefix: "ring", base: 3000,
    text: "A polished gold-plated ring that stacks well.",
    long: "Finished in polished gold plating with a smooth inner band, this ring sits comfortably and stacks well with others. Please measure your finger size before ordering. Avoid water and perfume to keep the shine.",
    items: ["Vera Stacking Ring", "Halo Signet Ring", "Twist Eternity Band", "Dahlia Cocktail Ring", "Ember Knot Ring", "Petra Pearl Ring", "Sable Wide Band", "Juno Midi Ring", "Faye Solitaire Ring", "Rhea Adjustable Ring"]
  },
  {
    name: "Bracelets", prefix: "bracelet", base: 4500,
    text: "A graceful bracelet with an adjustable fit.",
    long: "A delicate bracelet with an adjustable fit, designed to sit gracefully on the wrist without catching on clothes. Gold plated over brass for a warm, lasting glow. Store it in the pouch provided to keep it tarnish free.",
    items: ["Vera Bangle Bracelet", "Linked Charm Bracelet", "Beaded Pearl Bracelet", "Cora Tennis Bracelet", "Mira Cuff Bracelet", "Thea Chain Bracelet", "Nia Evil Eye Bracelet", "Lena Pearl Cuff", "Sage Link Bracelet", "Opal Stack Bangles"]
  },
  {
    name: "Sets", prefix: "set", base: 9000,
    text: "A matching jewellery set, gift ready.",
    long: "A matching set made to be worn together or apart. Each piece is gold plated over brass with a soft, warm shine and arrives in a gift-ready box, perfect for weddings, birthdays and festive occasions.",
    items: ["Lustre Bridal Set", "Aurora Necklace Set", "Pearl Elegance Set", "Daily Glow Set", "Gold Duo Set", "Crystal Evening Set", "Heirloom Set", "Starlight Set", "Minimal Trio Set", "Festive Jhumka Set"]
  }
];

const addCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
const addProduct = db.prepare("INSERT INTO products (category_id, name, description, long_description, price, stock, image, images, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

let idx = 0;
catalog.forEach(function (c) {
  const catId = Number(addCategory.run(c.name).lastInsertRowid);
  c.items.forEach(function (name, i) {
    const price = c.base + ((i * 7) % 9) * 300;
    const stock = idx % 17 === 16 ? 0 : 4 + ((idx * 7) % 27);
    const files = [0, 1, 2].map(function (k) { return c.prefix + "-" + (((i + k) % 4) + 1) + ".jpg"; });
    addProduct.run(catId, name, c.text + " " + notes[i % notes.length], c.long, price, stock, files[0], files.join(","), i === 0 ? 1 : 0);
    idx++;
  });
});

// Reviews
const reviewers = ["Ayesha K.", "Sana M.", "Hira R.", "Zainab A.", "Maham S.", "Noor F.", "Laiba T.", "Areeba H.", "Mahnoor B.", "Iqra Z."];
const comments = [
  [5, "Absolutely beautiful, looks even better in person."],
  [5, "Lovely finish and arrived beautifully packed."],
  [4, "Very pretty and light to wear. Great value."],
  [5, "Got so many compliments on this. Will order again."],
  [4, "Elegant and comfortable, exactly as pictured."],
  [3, "Nice piece, though I wish it were a little bigger."],
  [5, "Perfect gift, she loved it."],
  [4, "Shine is lovely and delivery was quick."]
];
const addReview = db.prepare("INSERT INTO reviews (product_id, user_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)");
db.prepare("SELECT id FROM products").all().forEach(function (p) {
  const n = between(2, 5);
  for (let k = 0; k < n; k++) {
    const c = pick(comments);
    addReview.run(p.id, pick(reviewers), c[0], c[1], daysAgo(between(1, 60)));
  }
});

// Sample customers aur demo admin
const addUser = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)");
const customerHash = bcrypt.hashSync("Customer@123", 8);
const adminHash = bcrypt.hashSync("Admin@123", 8);
["Ayesha Khan", "Sana Malik", "Hira Raza", "Zainab Ali", "Maham Shah", "Noor Fatima", "Laiba Tariq", "Areeba Hassan"].forEach(function (name) {
  addUser.run(name, name.toLowerCase().replace(" ", ".") + "@example.com", customerHash, "customer");
});
addUser.run("Store Admin", "admin@lustre.test", adminHash, "admin");

// Sample orders
const customers = db.prepare("SELECT id FROM users WHERE email LIKE '%@example.com'").all();
const products = db.prepare("SELECT id, price, stock FROM products").all();
const statuses = ["pending", "confirmed", "shipped", "delivered", "delivered", "cancelled"];
const addresses = [
  "House 12, Street 4, Gulberg III, Lahore",
  "Flat 5B, Clifton Block 2, Karachi",
  "House 48, F-10/2, Islamabad",
  "Street 9, Model Town, Lahore",
  "House 7, Satellite Town, Rawalpindi",
  "Block C, Bahria Town, Lahore"
];
const addOrder = db.prepare("INSERT INTO orders (user_id, total, status, address, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)");
const addItem = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
const takeStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");

for (let o = 0; o < 20; o++) {
  const status = statuses[o % statuses.length];
  const lines = [];
  const used = {};
  const count = between(1, 3);
  for (let k = 0; k < count; k++) {
    const p = pick(products);
    if (used[p.id] || p.stock < 2) continue;
    used[p.id] = true;
    lines.push({ p: p, qty: between(1, 2) });
  }
  if (lines.length === 0) continue;

  const total = lines.reduce(function (sum, l) { return sum + l.p.price * l.qty; }, 0);
  const phone = "03" + between(0, 4) + between(0, 9) + between(1000000, 9999999);
  const orderId = Number(addOrder.run(pick(customers).id, total, status, pick(addresses), phone, daysAgo(between(0, 30))).lastInsertRowid);

  lines.forEach(function (l) {
    addItem.run(orderId, l.p.id, l.qty, l.p.price);
    if (status !== "cancelled") {
      takeStock.run(l.qty, l.p.id, l.qty);
      l.p.stock -= l.qty;
    }
  });
}

// CSV file (brief ke liye)
function csv(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
const rows = db.prepare("SELECT p.id, c.name AS category, p.name, p.price, p.stock, p.image, p.description FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id").all();
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, "data", "products.csv"),
  ["id,category,name,price,stock,image,description"].concat(rows.map(function (r) {
    return [r.id, r.category, r.name, r.price, r.stock, r.image, r.description].map(csv).join(",");
  })).join("\n")
);

const n = function (sql) { return db.prepare(sql).get().n; };
console.log("Done.");
console.log("Categories:", n("SELECT COUNT(*) AS n FROM categories"));
console.log("Products:  ", n("SELECT COUNT(*) AS n FROM products"));
console.log("Reviews:   ", n("SELECT COUNT(*) AS n FROM reviews"));
console.log("Users:     ", n("SELECT COUNT(*) AS n FROM users"));
console.log("Orders:    ", n("SELECT COUNT(*) AS n FROM orders"));
