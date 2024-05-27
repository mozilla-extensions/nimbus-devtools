/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

declare module "*.png" {
  const value: string;
  export default value;
}

declare namespace browser.experiments.nimbus {
  function enrollInExperiment(jsonData: object): Promise<boolean>;

  function enrollWithFeatureConfig(
    featureId: string,
    featureValue: object,
    isRollout: boolean,
  ): Promise<boolean>;

  function getFeatureConfigs(): Promise<string[]>;

  function getCurrentCollection(): Promise<string>;

  function setCollection(collectionId: string): Promise<void>;
}
