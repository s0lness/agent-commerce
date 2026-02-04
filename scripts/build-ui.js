const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "ui");
const outDir = path.join(__dirname, "..", "dist", "ui");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(srcDir)) {
  console.error("UI source directory not found:", srcDir);
  process.exit(1);
}

copyDir(srcDir, outDir);
console.log(`UI assets copied to ${outDir}`);
