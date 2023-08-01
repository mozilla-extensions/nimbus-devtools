/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Watcher from "watcher";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(DIRNAME, "..", "src");
const DIST_DIR = path.resolve(DIRNAME, "..", "dist");
const MANIFEST = "manifest.json";
const MANIFEST_PATH = path.join(SRC_DIR, MANIFEST);

/**
 * Parse manifest.json and return the list of files required by the extension.
 */
function parseManifest({ absolute = false } = {}) {
  const files = [MANIFEST];

  const contents = fs.readFileSync(MANIFEST_PATH, {
    encoding: "utf-8",
  });
  const manifest = JSON.parse(contents);

  files.push(...(manifest.background?.scripts ?? []));

  for (const api of Object.values(manifest.experiment_apis ?? {})) {
    if (api.parent) {
      files.push(api.parent.script);
    }

    if (api.child) {
      files.push(api.parent.child);
    }
  }

  if (absolute) {
    return files.map((f) => path.join(SRC_DIR, f));
  }

  return files;
}

function copyFiles(files) {
  for (const file of files) {
    const srcFile = path.join(SRC_DIR, file);
    const distFile = path.join(DIST_DIR, file);

    const dir = path.dirname(distFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(srcFile, distFile);
  }
}

function watch() {
  let watcher;

  function makeWatcher() {
    const files = parseManifest({ absolute: true });

    watcher = new Watcher(files);
    watcher.on("all", (event, targetPath) => {
      if (event === "change" && targetPath === MANIFEST_PATH) {
        watcher.close();
        makeWatcher();
      }

      copyFiles(parseManifest());
    });
  }

  makeWatcher();
}

if (process.argv.length === 3 && process.argv[2] == "--watch") {
  watch();
} else {
  const files = parseManifest();
  copyFiles(files);
}
