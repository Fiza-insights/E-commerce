const db = require("./db");

db.exec("DELETE FROM reviews; DELETE FROM order_items; DELETE FROM orders; DELETE FROM products; DELETE FROM categories; DELETE FROM sqlite_sequence WHERE name IN ('products','categories');");

const categories = ["Necklaces", "Earrings", "Rings", "Bracelets"];
const addCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
categories.forEach((c) => addCategory.run(c));

// [category, name, description, price (PKR), stock, image, featured]
const products = [
  ["Necklaces", "Lumi Pendant Necklace", "Delicate gold-plated chain with a teardrop crystal pendant.", 6500, 15, "necklace-1.jpg", 1],
  ["Necklaces", "Aurelia Layered Chain", "Two-layer gold chain, light enough for everyday wear.", 8200, 10, "necklace-2.jpg", 0],
  ["Necklaces", "Pearl Drop Necklace", "Freshwater-style pearl on a fine gold chain.", 7400, 8, "necklace-3.jpg", 0],
  ["Earrings", "Seren Huggie Hoops", "Small textured hoops that sit close to the ear.", 4500, 25, "earrings-1.jpg", 1],
  ["Earrings", "Celeste Stud Set", "Set of three minimalist studs in gold finish.", 3800, 30, "earrings-2.jpg", 0],
  ["Earrings", "Opal Drop Earrings", "Soft milky stones hanging from a slim gold hook.", 5600, 12, "earrings-3.jpg", 0],
  ["Rings", "Vera Stacking Ring", "Thin band with a single sparkling stone.", 3200, 20, "ring-1.jpg", 1],
  ["Rings", "Halo Signet Ring", "Polished gold signet ring with a smooth face.", 5900, 9, "ring-2.jpg", 0],
  ["Rings", "Twist Eternity Band", "Twisted band set with tiny clear crystals.", 6800, 14, "ring-3.jpg", 0],
  ["Bracelets", "Vera Bangle Bracelet", "Slim open bangle with a small crystal accent.", 5200, 18, "bracelet-1.jpg", 1],
  ["Bracelets", "Linked Charm Bracelet", "Gold chain bracelet with three tiny charms.", 6100, 11, "bracelet-2.jpg", 0],
  ["Bracelets", "Beaded Pearl Bracelet", "Stretch bracelet with small pearl-style beads.", 4200, 22, "bracelet-3.jpg", 0]
];

const findCategory = db.prepare("SELECT id FROM categories WHERE name = ?");
const addProduct = db.prepare("INSERT INTO products (category_id, name, description, price, stock, image, featured) VALUES (?, ?, ?, ?, ?, ?, ?)");

products.forEach((p) => {
  const cat = findCategory.get(p[0]);
  addProduct.run(cat.id, p[1], p[2], p[3], p[4], p[5], p[6]);
});

const longText = {
  Necklaces: "Crafted from hypoallergenic brass with a lasting 18k gold plating, this necklace rests softly at the collarbone. The chain is light enough for all-day wear and closes with a secure lobster clasp. Pair it with a simple neckline and let the details shine.",
  Earrings: "Made with nickel-free posts and a gentle gold finish, these earrings are designed for sensitive ears and all-day comfort. They are light, secure and easy to dress up or down, from office hours to evening plans.",
  Rings: "Finished in polished gold plating with a smooth inner band, this ring sits comfortably and stacks well with others. Please measure your finger size before ordering. Avoid water and perfume to keep the shine.",
  Bracelets: "A delicate bracelet with an adjustable fit, designed to sit gracefully on the wrist without catching on clothes. Gold plated over brass for a warm, lasting glow. Store it in the pouch provided to keep it tarnish free."
};
const setLong = db.prepare("UPDATE products SET long_description = ? WHERE category_id = (SELECT id FROM categories WHERE name = ?)");
Object.keys(longText).forEach(function (name) { setLong.run(longText[name], name); });

const reviewers = ["Ayesha K.", "Sana M.", "Hira R.", "Zainab A.", "Maham S.", "Noor F.", "Laiba T.", "Areeba H."];
const comments = [
  [5, "Absolutely beautiful, looks even better in person."],
  [5, "Lovely finish and arrived beautifully packed."],
  [4, "Very pretty and light to wear. Great value."],
  [5, "Got so many compliments on this. Will order again."],
  [4, "Elegant and comfortable, exactly as pictured."],
  [3, "Nice piece, though I wish it were a little bigger."]
];
const addReview = db.prepare("INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)");
db.prepare("SELECT id FROM products").all().forEach(function (p, i) {
  for (let k = 0; k < 3; k++) {
    const c = comments[(i + k * 2) % comments.length];
    addReview.run(p.id, reviewers[(i + k * 3) % reviewers.length], c[0], c[1]);
  }
});
const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
console.log("Done. Products in database: " + count);
