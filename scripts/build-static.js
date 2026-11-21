"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "dist");
const assetsDir = path.join(projectRoot, "assets");

const publicRootExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2"
]);
const publicRootNames = new Set(["robots.txt", "sitemap.xml"]);
const publicAssetExtensions = new Set([
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2"
]);
const excludedAssetDirectories = new Set(["backup-cursos"]);

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyPublicAssets(sourceDir, destinationDir, relativePath) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || entry.name === ".gitkeep") continue;

    const source = path.join(sourceDir, entry.name);
    const destination = path.join(destinationDir, entry.name);
    const nextRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      if (excludedAssetDirectories.has(nextRelativePath)) continue;
      copyPublicAssets(source, destination, nextRelativePath);
      continue;
    }

    if (entry.isFile() && publicAssetExtensions.has(path.extname(entry.name).toLowerCase())) {
      copyFile(source, destination);
    }
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const extension = path.extname(entry.name).toLowerCase();
  if (!publicRootExtensions.has(extension) && !publicRootNames.has(entry.name)) continue;
  copyFile(path.join(projectRoot, entry.name), path.join(outputDir, entry.name));
}

copyPublicAssets(assetsDir, path.join(outputDir, "assets"), "");

console.log("Sitio estático preparado en dist/.");
