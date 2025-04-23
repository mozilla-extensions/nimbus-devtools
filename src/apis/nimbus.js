/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ASRouterTargeting: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  ClientEnvironment: "resource://normandy/lib/ClientEnvironment.sys.mjs",
  ClientEnvironmentBase:
    "resource://gre/modules/components-utils/ClientEnvironment.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  FilterExpressions:
    "resource://gre/modules/components-utils/FilterExpressions.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
  TelemetryEnvironment: "resource://gre/modules/TelemetryEnvironment.sys.mjs",
});

ChromeUtils.defineLazyGetter(
  lazy,
  "ExperimentManager",
  () => lazy.ExperimentAPI._manager,
);
ChromeUtils.defineLazyGetter(
  lazy,
  "RemoteSettingsExperimentLoader",
  () => lazy.ExperimentAPI._rsLoader,
);

var nimbus = class extends ExtensionAPI {
  getAPI() {
    const { ExtensionError } = ExtensionUtils;
    return {
      experiments: {
        nimbus: {
          async enrollInExperiment(jsonData, forceEnroll) {
            try {
              const { slug, isRollout = false } = jsonData;

              const slugExistsInStore = lazy.ExperimentManager.store
                .getAll()
                .some((experiment) => experiment.slug === slug);
              const activeEnrollment =
                lazy.ExperimentManager.store
                  .getAll()
                  .find(
                    (experiment) =>
                      experiment.slug === slug &&
                      experiment.isRollout === isRollout &&
                      experiment.active,
                  )?.slug ?? null;
              if (slugExistsInStore || activeEnrollment) {
                if (!forceEnroll) {
                  return {
                    enrolled: false,
                    error: { slugExistsInStore, activeEnrollment },
                  };
                }

                if (activeEnrollment) {
                  this.unenroll(activeEnrollment);
                }
                if (slugExistsInStore) {
                  this.deleteInactiveEnrollment(jsonData.slug);
                }
              }

              const result = await lazy.ExperimentManager.enroll(
                jsonData,
                "nimbus-devtools",
              );
              return { enrolled: result !== null, error: null };
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
            let userFacingName = `Nimbus Devtools ${featureId} Enrollment`;

            if (isRollout) {
              userFacingName += " (rollout)";
            }

            const slug = `nimbus-devtools-${featureId}-${isRollout ? "rollout" : "experiment"}`;
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
              slug,
              userFacingName,
              userFacingDescription: `Testing the feature with feature ID: ${featureId}.`,
            };

            try {
              const slugExistsInStore = lazy.ExperimentManager.store
                .getAll()
                .some((experiment) => experiment.slug === recipe.slug);
              const activeEnrollment =
                lazy.ExperimentManager.store
                  .getAll()
                  .find(
                    (experiment) =>
                      experiment.featureIds.includes(featureId) &&
                      experiment.isRollout === isRollout &&
                      experiment.active,
                  )?.slug ?? null;

              if (slugExistsInStore || activeEnrollment) {
                if (!forceEnroll) {
                  return {
                    enrolled: false,
                    error: { slugExistsInStore, activeEnrollment },
                  };
                }

                if (activeEnrollment) {
                  this.unenroll(activeEnrollment);
                }
                if (slugExistsInStore) {
                  this.deleteInactiveEnrollment(slug);
                }
              }
              const result = await lazy.ExperimentManager.enroll(
                recipe,
                "nimbus-devtools",
              );
              return { enrolled: result !== null, error: null };
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async getFeatureConfigs() {
            try {
              await lazy.ExperimentAPI.ready();
              return Object.keys(lazy.NimbusFeatures).sort();
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async getCurrentCollection() {
            try {
              return Services.prefs.getStringPref(
                "messaging-system.rsexperimentloader.collection_id",
              );
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
              return await lazy.FilterExpressions.eval(expression, context);
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

            const environment = await resolve(
              lazy.ASRouterTargeting.Environment,
            );
            const localContext = await resolve(
              lazy.ExperimentManager.createTargetingContext(),
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
              version: lazy.AppConstants.MOZ_APP_VERSION_DISPLAY,
              channel:
                lazy.TelemetryEnvironment.currentEnvironment.settings.update
                  .channel,
              platform: lazy.AppConstants.platform,
              os: lazy.ClientEnvironmentBase.os,
            };

            return targetingParameters;
          },

          async updateRecipes(forceSync) {
            try {
              await lazy.RemoteSettingsExperimentLoader.updateRecipes(
                "devtools",
                {
                  forceSync,
                },
              );
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async forceEnroll(recipe, branchSlug) {
            try {
              const branch = recipe?.branches?.find(
                (br) => br.slug === branchSlug,
              );
              const result = await lazy.ExperimentManager.forceEnroll(
                recipe,
                branch,
              );
              return result !== null;
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async getExperimentStore() {
            try {
              return await lazy.ExperimentManager.store.getAll();
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async unenroll(slug) {
            try {
              return await lazy.ExperimentManager.unenroll(
                slug,
                "nimbus-devtools",
              );
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async deleteInactiveEnrollment(slug) {
            try {
              return await lazy.ExperimentManager.store._deleteForTests(slug);
            } catch (error) {
              console.error(error);
              throw new ExtensionError(String(error));
            }
          },

          async generateTestIds(recipe, branchSlug) {
            try {
              const result =
                await lazy.ExperimentManager.generateTestIds(recipe);
              return result[branchSlug];
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
