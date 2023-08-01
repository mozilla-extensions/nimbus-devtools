/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createRoot } from "react-dom/client";

document.addEventListener("DOMContentLoaded", () => {
  const version = browser.runtime.getManifest().version;

  document.querySelectorAll("#app")
    .forEach(el => {
      const root = createRoot(el);
      root.render(<span className="text-3xl">nimbus-devtools add-on version {version}</span>);
    });
});
