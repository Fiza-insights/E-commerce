const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "raw-photos");
const out = path.join(__dirname, "public", "images", "products");
fs.mkdirSync(out, { recursive: true });

(async function () {
  const files = fs.readdirSync(src).filter(function (f) { return /\.(jpe?g|png|webp)$/i.test(f); });
  if (files.length === 0) { console.log("raw-photos folder is empty."); return; }

  for (const f of files) {
    const name = path.parse(f).name.toLowerCase() + ".jpg";
    let quality = 82;
    let buf;
    do {
      buf = await sharp(path.join(src, f))
        .rotate()
        .resize({ width: 900, height: 900, fit: "cover" })
        .jpeg({ quality: quality, mozjpeg: true })
        .toBuffer();
      quality -= 8;
    } while (buf.length > 280 * 1024 && quality > 30);

    fs.writeFileSync(path.join(out, name), buf);
    console.log(name + "  " + Math.round(buf.length / 1024) + " KB");
  }
  console.log("Done.");
})();
