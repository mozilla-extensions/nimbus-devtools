/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs",
);

ChromeUtils.defineESModuleGetters(this, {
  ASRouterTargeting: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  ClientEnvironmentBase:
    "resource://gre/modules/components-utils/ClientEnvironment.sys.mjs",
  FilterExpressions:
    "resource://gre/modules/components-utils/FilterExpressions.sys.mjs",
  TelemetryEnvironment: "resource://gre/modules/TelemetryEnvironment.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "_ExperimentAPI", () => {
  try {
    return ChromeUtils.importESModule(
      "moz-src:///toolkit/components/nimbus/ExperimentAPI.sys.mjs",
    );
  } catch {
    return ChromeUtils.importESModule(
      "resource://nimbus/ExperimentAPI.sys.mjs",
    );
  }
});

ChromeUtils.defineLazyGetter(this, "TargetingContextRecorder", () => {
  try {
    return ChromeUtils.importESModule(
      "moz-src:///toolkit/components/nimbus/lib/TargetingContextRecorder.sys.mjs",
    );
  } catch {
    return ChromeUtils.importESModule(
      "resource://nimbus/lib/TargetingContextRecorder.sys.mjs",
    );
  }
});

ChromeUtils.defineLazyGetter(
  this,
  "ExperimentAPI",
  () => _ExperimentAPI.ExperimentAPI,
);
ChromeUtils.defineLazyGetter(
  this,
  "NimbusFeatures",
  () => _ExperimentAPI.NimbusFeatures,
);
ChromeUtils.defineLazyGetter(
  this,
  "ExperimentFeature",
  () => _ExperimentAPI._ExperimentFeature,
);

ChromeUtils.defineLazyGetter(
  this,
  "ExperimentManager",
  () => ExperimentAPI.manager,
);
ChromeUtils.defineLazyGetter(
  this,
  "RemoteSettingsExperimentLoader",
  () => ExperimentAPI._rsLoader,
);

var nimbus = class extends ExtensionAPI {
  getAPI() {
    const { ExtensionError } = ExtensionUtils;
    return {
      experiments: {
        nimbus: {
          async enrollInExperiment(recipe, forceEnroll) {
            try {
              const { slug } = recipe;

              const slugExistsInStore = ExperimentManager.store
                .getAll()
                .some((experiment) => experiment.slug === slug);

              const canEnroll = ExperimentManager.canEnroll(recipe);
              if (!canEnroll.ok) {
                switch (canEnroll.reason) {
                  case "enrollment-paused":
                    // Allow enrollment in paused recipes.
                    break;

                  case "does-not-exist":
                    throw new Error(
                      `Feature ${canEnroll.featureId} does not exist`,
                    );

                  case "enrolled-in-feature":
                    if (!forceEnroll) {
                      return {
                        enrolled: false,
                        error: {
                          activeEnrollments: Array.from(
                            canEnroll.conflictingEnrollments,
                          ),
                          slugExistsInStore,
                        },
                      };
                    }

                    for (const conflictingSlug of canEnroll.conflictingEnrollments) {
                      this.unenroll(conflictingSlug);
                    }
                    break;

                  default:
                    console.error(
                      `Cannot enroll: unexpected reason ${canEnroll.reason}`,
                      canEnroll,
                    );
                    throw new Error(
                      `Cannot enroll: unexpected reason ${canEnroll.reason}`,
                    );
                }
              }

              if (slugExistsInStore) {
                if (!forceEnroll) {
                  return {
                    enrolled: false,
                    error: { slugExistsInStore },
                  };
                }

                this.deleteInactiveEnrollment(recipe.slug);
              }

              const enrollment = await ExperimentManager.enroll(
                recipe,
                "nimbus-devtools",
              );
              return { enrolled: enrollment !== null, error: null };
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async enrollWithFeatureConfig(
            featureId,
            featureValue,
            isRollout,
            forceEnroll,
          ) {
            const uuid = Services.uuid.generateUUID().toString().slice(1, -1);
            const recipe = {
              bucketConfig: {
                namespace: "devtools-test",
                randomizationUnit: "normandy_id",
                start: 0,
                total: 1000,
                count: 1000,
              },
              branches: [
                {
                  features: [
                    {
                      featureId,
                      value: featureValue,
                    },
                  ],
                  ratio: 1,
                  slug: "control",
                },
              ],
              isRollout,
              featureIds: [featureId],
              slug: `nimbus-devtools-${featureId}-${isRollout ? "rollout" : "experiment"}-${uuid}`,
              userFacingName: `nimbus-devtools ${featureId} ${isRollout ? "Rollout" : "Experiment"} (${uuid})`,
              userFacingDescription: `Testing the feature with feature ID: ${featureId}.`,
            };

            return this.enrollInExperiment(recipe, forceEnroll);
          },

          async getFeatureConfigs() {
            try {
              await ExperimentAPI.ready();
              return Object.keys(NimbusFeatures).sort();
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async getCurrentCollection() {
            try {
              return {
                prefValue: Services.prefs.getStringPref(
                  "messaging-system.rsexperimentloader.collection_id",
                ),
                cachedValue:
                  RemoteSettingsExperimentLoader.remoteSettingsClients
                    .experiments.collectionName,
              };
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async injectInactiveEnrollment(recipe, branchSlug, reason) {
            try {
              const existingEnrollment = ExperimentManager.store
                .getAll()
                .find((experiment) => experiment.slug === recipe.slug);

              if (existingEnrollment) {
                throw new Error("Enrollment already exists");
              }

              const { enrollment } = ExperimentManager.createEnrollment(
                recipe,
                branchSlug,
                "rs-loader",
                { active: false, reason },
              );
              ExperimentManager.store.addEnrollment(enrollment, recipe);
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
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
              throw new ExtensionError(String(error));
            }
          },

          async evaluateJEXL(expression, context = {}) {
            try {
              return await FilterExpressions.eval(expression, context);
            } catch (error) {
              console.error("Error evaluating expression:", error);
              throw new ExtensionError(String(error));
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
              } catch {
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
                      throw new ExtensionError(String(error));
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

            const environment = await resolve(ASRouterTargeting.Environment);
            const localContext = await resolve(
              ExperimentManager.createTargetingContext(),
            );

            const values = {
              ...environment,
              ...localContext,
              // This code is based on the implementation from:
              // https://searchfox.org/mozilla-central/source/toolkit/components/messaging-system/targeting/Targeting.sys.mjs#31-64
              // We are unable to use it directly because it is not exported.
              version: AppConstants.MOZ_APP_VERSION_DISPLAY,
              channel:
                TelemetryEnvironment.currentEnvironment.settings.update.channel,
              platform: AppConstants.platform,
              os: ClientEnvironmentBase.os,
            };

            return {
              attrs: Object.keys(TargetingContextRecorder.ATTRIBUTE_TRANSFORMS),
              prefs: Object.keys(TargetingContextRecorder.PREFS),
              values,
            };
          },

          async updateRecipes() {
            try {
              await RemoteSettingsExperimentLoader.updateRecipes("devtools");
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async forceEnroll(recipe, branchSlug) {
            try {
              const result = await ExperimentManager.forceEnroll(
                recipe,
                branchSlug,
              );
              return result !== null;
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async getExperimentStore() {
            try {
              return await ExperimentManager.store.getAll();
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          unenroll(slug) {
            try {
              return ExperimentManager.unenroll(slug, {
                reason: "nimbus-devtools",
              });
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async deleteInactiveEnrollment(slug) {
            try {
              return await ExperimentManager.store._deleteForTests(slug);
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async generateTestIds(recipe) {
            try {
              return await ExperimentManager.generateTestIds(recipe);
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async substituteLocalizations(values, localizations) {
            try {
              const missingIds = new Set();
              const localizedValues =
                ExperimentFeature._substituteLocalizations(
                  values,
                  localizations,
                  missingIds,
                );

              if (missingIds.size) {
                throw new ExtensionError(
                  "Could not substitute values: incomplete localizations",
                );
              }

              return localizedValues;
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },
        },
      },
    };
  }
};
