/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "nimbus" }]*/

const { ExperimentManager } = ChromeUtils.importESModule(
  "resource://nimbus/lib/ExperimentManager.sys.mjs",
);

var nimbus = class extends ExtensionAPI {
  getAPI() {
    return {
      experiments: {
        nimbus: {
          async enrollInExperiment(jsonData) {
            try {
              const result = await ExperimentManager.enroll(
                jsonData,
                "nimbus-devtools",
              );
              return result !== null;
            } catch (error) {
              console.error(error);
              throw error;
            }
          },
        },
      },
    };
  }
};
