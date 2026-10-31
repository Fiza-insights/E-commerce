const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const db = new Database(path.join(__dirname, "store.db"));
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// add long_description column to older databases
const productCols = db.prepare("PRAGMA table_info(products)").all().map(function (c) { return c.name; });
if (!productCols.includes("long_description")) {
  db.exec("ALTER TABLE products ADD COLUMN long_description TEXT");
}
module.exports = db;