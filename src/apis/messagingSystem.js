/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

Cu.importGlobalProperties(["URL"]);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  MESSAGING_EXPERIMENTS_DEFAULT_FEATURES:
    "resource:///modules/asrouter/MessagingExperimentConstants.sys.mjs",

  AboutMessagePreviewParent:
    "resource:///actors/AboutMessagePreviewParent.sys.mjs",
});

var messagingSystem = class extends ExtensionAPI {
  getAPI() {
    function getMessagePreviewURL(rawMessage) {
      const codeUnits = new Uint16Array(rawMessage.length);
      for (let i = 0; i < codeUnits.length; i++) {
        codeUnits[i] = rawMessage.charCodeAt(i);
      }

      const url = new URL("about:messagepreview");
      url.searchParams.append(
        "json",
        new Uint8Array(codeUnits.buffer).toBase64(),
      );
      return url.toString();
    }

    function openTabPrivileged(url) {
      const { gBrowser } = Services.wm.getMostRecentWindow("navigator:browser");
      gBrowser.selectedTab = gBrowser.addTab(url, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
    }

    return {
      experiments: {
        messagingSystem: {
          getMessagingFeaturesAndTemplates() {
            let templates;
            try {
              templates =
                lazy.AboutMessagePreviewParent.getSupportedTemplates();
            } catch {
              return null;
            }

            return {
              featureIds: lazy.MESSAGING_EXPERIMENTS_DEFAULT_FEATURES,
              templates,
            };
          },

          previewMessage(content) {
            Services.prefs.setBoolPref(
              "browser.newtabpage.activity-stream.asrouter.devtoolsEnabled",
              true,
            );
            openTabPrivileged(getMessagePreviewURL(content));
          },
        },
      },
    };
  }
};
