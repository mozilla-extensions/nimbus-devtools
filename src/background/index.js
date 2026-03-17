/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MessageKind } from "./messages";

browser.browserAction.onClicked.addListener(() =>
  browser.tabs.create({
    url: "./ui/index.html",
  }),
);

browser.runtime.onMessage.addListener(
  function (message, _sender, sendResponse) {
    console.log(message);
    if (
      typeof message !== "object" ||
      message === null ||
      typeof message.kind !== "string"
    ) {
      console.error("nimbus-devtools: unexpected message", message);
      return;
    }

    switch (message.kind) {
      case MessageKind.GET_MESSAGING_FEATURES_AND_TEMPLATES:
        browser.experiments.messagingSystem
          .getMessagingFeaturesAndTemplates()
          .then((v) => {
            console.log("rv", v);
            sendResponse(v);
          });

        return true;

      case MessageKind.PREVIEW_MESSAGE:
        browser.experiments.messagingSystem.previewMessage(message.message);
        break;

      default:
        console.error("nimbus-devtools: unexpected message", message);
        break;
    }

    return undefined;
  },
);
