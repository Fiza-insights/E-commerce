const db = require("./db");
const email = (process.argv[2] || "").trim().toLowerCase();
const r = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
console.log(r.changes ? "Done: " + email + " is now admin" : "No user found with that email");
