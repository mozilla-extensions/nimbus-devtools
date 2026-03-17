/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Watcher from "watcher";

const BIN_DIR = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.resolve(BIN_DIR, "..");
const SRC_DIR = path.join(REPO_ROOT, "src");
const DIST_DIR = path.join(REPO_ROOT, "dist");

const MANIFEST_FILENAME = "manifest.json";
const MANIFEST_PATH = path.join(SRC_DIR, MANIFEST_FILENAME);
const DIST_MANIFEST_PATH = path.join(DIST_DIR, MANIFEST_FILENAME);

(function main() {
  if (process.argv.length === 3 && process.argv[2] == "--watch") {
    return watch();
  }

  return build();
})();

function watch() {
  let watcher;

  function makeWatcher() {
    const toWatch = Array.from(buildFileMap({ includeManifest: true }).keys());
    watcher = new Watcher(toWatch);
    watcher.on("all", () => build({ dev: true }));
  }

  makeWatcher();
}

function build({ dev = false } = {}) {
  for (const [srcFile, dstFile] of buildFileMap({ includeManifest: !dev })) {
    copyFileSync(srcFile, dstFile);
  }

  if (dev) {
    const content = fs.readFileSync(MANIFEST_PATH, { encoding: "utf-8" });
    const manifest = JSON.parse(content);

    for (const script of manifest.content_scripts) {
      script.matches.push("http://localhost/*");
    }

    fs.writeFileSync(DIST_MANIFEST_PATH, JSON.stringify(manifest));
  }
}

function getTargetPath(srcDir, destDir, fileName) {
  const relativePath = path.relative(srcDir, fileName);
  return path.resolve(destDir, relativePath);
}

function buildFileMap({ includeManifest = false } = {}) {
  const files = new Map(
    ["apis", "icons"].flatMap((subdirectory) => {
      const srcDir = path.join(SRC_DIR, subdirectory);
      const destDir = path.join(DIST_DIR, subdirectory);

      return fs
        .readdirSync(srcDir, {
          withFileTypes: true,
          recursive: true,
          encoding: "utf-8",
        })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => {
          const fileName = path.join(dirent.parentPath, dirent.name);
          return [fileName, getTargetPath(srcDir, destDir, fileName)];
        });
    }),
  );

  if (includeManifest) {
    files.set(MANIFEST_PATH, DIST_MANIFEST_PATH);
  }

  return files;
}

function copyFileSync(src, dest) {
  const parent = path.dirname(dest);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}
