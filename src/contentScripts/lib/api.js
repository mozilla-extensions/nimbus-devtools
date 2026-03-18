/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MessageKind } from "../../background/messages";

export default {
  async getMessagingFeaturesAndTemplates() {
    return browser.runtime.sendMessage({
      kind: MessageKind.GET_MESSAGING_FEATURES_AND_TEMPLATES,
    });
  },

  async forceEnroll(recipe, branchSlug) {
    await browser.runtime.sendMessage({
      kind: MessageKind.FORCE_ENROLL,
      recipe,
      branchSlug,
    });
  },

  async previewMessage(message) {
    return browser.runtime.sendMessage({
      kind: MessageKind.PREVIEW_MESSAGE,
      message,
    });
  },
};
