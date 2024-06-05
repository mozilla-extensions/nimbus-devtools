/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "nimbus" }]*/

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ASRouterTargeting: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  ClientEnvironment: "resource://normandy/lib/ClientEnvironment.sys.mjs",
  ClientEnvironmentBase:
    "resource://gre/modules/components-utils/ClientEnvironment.sys.mjs",
  TelemetryEnvironment: "resource://gre/modules/TelemetryEnvironment.sys.mjs",
});

const { ExperimentManager } = ChromeUtils.importESModule(
  "resource://nimbus/lib/ExperimentManager.sys.mjs",
);
const { ExperimentAPI, NimbusFeatures } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs",
);
const { TargetingContext } = ChromeUtils.importESModule(
  "resource://messaging-system/targeting/Targeting.sys.mjs",
);
const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs",
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

          async getCurrentCollection() {
            try {
              return Services.prefs.getStringPref(
                "messaging-system.rsexperimentloader.collection_id",
              );
            } catch (error) {
              console.error(error);
              throw error;
            }
          },

          async setCollection(collectionId) {
            try {
              Services.prefs.setStringPref(
                "messaging-system.rsexperimentloader.collection_id",
                collectionId,
              );
            } catch (error) {
              console.error(error);
              throw error;
            }
          },

          async evaluateJEXL(expression, context = {}) {
            try {
              const targetingContext = await new TargetingContext(context, {});

              const result = await targetingContext.evalWithDefault(expression);

              return result;
            } catch (error) {
              console.error("Error evaluating expression:", error);
              throw error;
            }
          },

          async getClientContext() {
            // We need this because Dates come from different JavaScript compartments,
            // and thus have different Date constructors.
            // This method works because Date method calls need a [[DateValue]] internal
            // slot, and only Date objects will have that slot.
            function isDate(object) {
              try {
                Date.prototype.getDate.call(object);
                return true;
              } catch (error) {
                return false;
              }
            }

            async function resolve(object) {
              if (typeof object === "object" && object !== null) {
                if (Array.isArray(object)) {
                  return Promise.all(
                    object.map(async (item) => resolve(await item)),
                  );
                }

                if (isDate(object)) {
                  return object;
                }

                const target = {};
                const promises = Object.entries(object).map(
                  async ([key, value]) => {
                    try {
                      let resolvedValue = await resolve(await value);
                      return [key, resolvedValue];
                    } catch (error) {
                      console.warn(`Error resolving ${key}: `, error);
                      throw error;
                    }
                  },
                );
                for (const { status, value } of await Promise.allSettled(
                  promises,
                )) {
                  if (status === "fulfilled") {
                    const [key, resolvedValue] = value;
                    target[key] = resolvedValue;
                  }
                }
                return target;
              }

              return object;
            }

            const environment = await resolve(
              lazy.ASRouterTargeting.Environment,
            );
            const localContext = await resolve(
              ExperimentManager.createTargetingContext(),
            );

            const targetingParameters = {
              ...environment,
              ...localContext,
              // This code is based on the implementation from:
              // https://searchfox.org/mozilla-central/source/toolkit/components/messaging-system/targeting/Targeting.sys.mjs#31-64
              // We are unable to use it directly because it is not exported.
              locale: lazy.ASRouterTargeting.Environment.locale,
              localeLanguageCode:
                lazy.ASRouterTargeting.Environment.localeLanguageCode,
              region: lazy.ASRouterTargeting.Environment.region,
              userId: lazy.ClientEnvironment.userId,
              version: AppConstants.MOZ_APP_VERSION_DISPLAY,
              channel:
                lazy.TelemetryEnvironment.currentEnvironment.settings.update
                  .channel,
              platform: AppConstants.platform,
              os: lazy.ClientEnvironmentBase.os,
            };

            return targetingParameters;
          },
        },
      },
    };
  }
};
