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
    if (
      typeof message !== "object" ||
      message === null ||
      typeof message.kind !== "string"
    ) {
      console.error("nimbus-devtools: unexpected message", message);
      return;
    }

    switch (message.kind) {
      case MessageKind.FORCE_ENROLL:
        browser.experiments.nimbus
          .forceEnroll(message.recipe, message.branchSlug)
          .then(
            () => sendResponse({}),
            (error) => sendResponse({ error }),
          );

        return true;

      case MessageKind.GET_MESSAGING_FEATURES_AND_TEMPLATES:
        browser.experiments.messagingSystem
          .getMessagingFeaturesAndTemplates()
          .then((v) => sendResponse(v));

        return true;

      case MessageKind.PREVIEW_MESSAGE:
        browser.experiments.messagingSystem.previewMessage(message.message);
        break;

      case MessageKind.SUBSTITUTE_LOCALIZATIONS:
        console.log(message.values, message.localizations);
        browser.experiments.nimbus
          .substituteLocalizations(message.values, message.localizations)
          .then(
            (values) => sendResponse({ values }),
            (error) => sendResponse({ error }),
          );

        return true;

      default:
        console.error("nimbus-devtools: unexpected message", message);
        break;
    }

    return undefined;
  },
);
