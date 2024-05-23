/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "nimbus" }]*/

const { ExperimentManager } = ChromeUtils.importESModule(
  "resource://nimbus/lib/ExperimentManager.sys.mjs",
);
const { ExperimentAPI, NimbusFeatures } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs",
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

          async enrollWithFeatureConfig(featureId, featureValue, isRollout) {
            try {
              const recipe = JSON.parse(`{
                "bucketConfig": {
                  "count": 1000,
                  "namespace": "devtools-test",
                  "randomizationUnit": "normandy_id",
                  "start": 0,
                  "total": 1000
                },
                "branches": [
                  {
                    "features": [
                      {
                        "featureId": "${featureId}",
                        "value": ${JSON.stringify(featureValue)}
                      }
                    ],
                    "ratio": 1,
                    "slug": "control"
                  }
                ],
                "isRollout": ${isRollout},
                "featureIds": [
                  "${featureId}"
                ],
                "slug": "nimbus-devtools-${featureId}-enrollment",
                "userFacingName": "Nimbus Devtools ${featureId} Enrollment",
                "userFacingDescription": "Testing the feature with feature ID: ${featureId}."
              }`);

              const result = await ExperimentManager.enroll(
                recipe,
                "nimbus-devtools",
              );
              return result !== null;
            } catch (error) {
              console.error(error);
              throw error;
            }
          },

          async getFeatureConfigs() {
            try {
              await ExperimentAPI.ready();
              return Object.keys(NimbusFeatures);
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
