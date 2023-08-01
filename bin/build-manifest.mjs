/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(DIRNAME, "..", "src");
const DIST_DIR = path.resolve(DIRNAME, "..", "dist");
const MANIFEST = "manifest.json";

/**
 * Parse manifest.json and return the list of files required by the extension.
 */
function parseManifest() {
  const files = [MANIFEST];

  const contents = fs.readFileSync(path.join(SRC_DIR, MANIFEST), {
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

const files = parseManifest();
copyFiles(files);
