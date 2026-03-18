/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MessageKind } from "../background/messages";

(async function () {
  const match = new URLPattern({ pathname: "/nimbus/:slug/:view/" }).exec(
    document.location,
  );
  if (!match) {
    return;
  }

  const { view } = match.pathname.groups;
  if (!["summary", "update_branches"].includes(view)) {
    return;
  }

  const experimentMetadata = getExperimentMetadata();
  if (
    !experimentMetadata ||
    experimentMetadata?.application !== "firefox-desktop"
  ) {
    return;
  }

  const messaging = await getMessagingFeaturesAndTemplates();
  if (!messaging) {
    return;
  }

  const integration = new ExperimenterIntegration(
    experimentMetadata,
    messaging,
  );

  switch (view) {
    case "summary":
      return integration.handleSummaryPage();

    case "update_branches":
      return integration.handleUpdateBranchesPage();
  }
})();

function getExperimentMetadata() {
  const $metadata = document.getElementById(
    "nimbus-devtools-experiment-metadata",
  );
  if (!$metadata) {
    return;
  }

  try {
    return JSON.parse($metadata.textContent);
  } catch {
    return null;
  }
}

async function getMessagingFeaturesAndTemplates() {
  return browser.runtime.sendMessage({
    kind: MessageKind.GET_MESSAGING_FEATURES_AND_TEMPLATES,
  });
}

class ExperimenterIntegration {
  constructor(
    experimentMetadata,
    { templates: supportedTemplates, featureIds },
  ) {
    this.experimentMetadata = experimentMetadata;
    this.supportedTemplates = supportedTemplates;
    this.featureIds = featureIds;
  }

  /**
   * Update the Experimenter summary page.
   */
  handleSummaryPage() {
    document
      .querySelector("[data-nimbus-devtools-preview-url-pane]")
      ?.classList.add("d-none");

    document
      .querySelectorAll("[data-nimbus-devtools-opt-in-pane]")
      .forEach((pane) => {
        pane
          .querySelector("[data-nimbus-devtools-enroll-button]")
          .addEventListener("click", () => {
            const recipe = JSON.parse(
              document.querySelector(
                "[data-nimbus-devtools-recipe-json] textarea",
              ).value,
            );
            const branchSlug = pane.querySelector("[name='branch']")?.value;

            this.forceEnroll(recipe, branchSlug);
          });

        pane.classList.remove("d-none");
      });

    document
      .querySelectorAll("textarea[data-nimbus-devtools-feature-value]")
      .forEach((el) => {
        if (!this.featureIds.includes(el.dataset.featureId)) {
          return;
        }

        const container = el.closest(".readonly-json-collapsible");
        if (!container) {
          return;
        }

        const result = this.validateMessage(el.value);
        if (result.error) {
          container
            .querySelectorAll("[data-nimbus-devtools-cannot-preview-notice]")
            .forEach((notice) => {
              notice.title = `Cannot preview message: ${result.error}`;
              notice.classList.remove("d-none");
            });
        } else {
          container
            .querySelectorAll("[data-nimbus-devtools-preview-button]")
            .forEach((btn) => {
              btn.addEventListener("click", () =>
                this.previewMessage(el.value),
              );
              btn.classList.remove("d-none");
            });
        }
      });
  }

  /**
   * Update the Experimenter update branches page.
   */
  handleUpdateBranchesPage() {
    const insertControls = () => {
      document
        .querySelectorAll("[data-nimbus-devtools-feature-editor]")
        .forEach((editor) => {
          if (
            !Object.hasOwn(editor.dataset, "featureId") ||
            !this.featureIds.includes(editor.dataset.featureId)
          ) {
            return;
          }

          const input = editor.querySelector("input.value-editor");
          const btn = editor.querySelector(
            "[data-nimbus-devtools-try-preview-button]",
          );
          btn.addEventListener("click", () =>
            this.tryPreviewMessage(input.value),
          );
          btn.classList.remove("d-none");
        });
    };

    document.body.addEventListener("htmx:afterSwap", (event) => {
      if (
        ["branches-form", "content-with-sidebar"].includes(
          event.detail.target.id,
        )
      ) {
        insertControls();
      }
    });

    insertControls();
  }

  async forceEnroll(recipe, branchSlug) {
    try {
      await browser.runtime.sendMessage({
        kind: MessageKind.FORCE_ENROLL,
        recipe,
        branchSlug,
      });

      this.createAndShowToast("Enrolled", { classList: ["text-bg-success"] });
    } catch (error) {
      this.createAndShowToast(`Could not enroll: ${error}`, {
        classList: ["text-bg-danger"],
      });
    }
  }

  async tryPreviewMessage(message) {
    const result = this.validateMessage(message);
    if (result.error) {
      this.createAndShowToast(`Could not preview message: ${result.error}`, {
        classList: ["text-bg-danger"],
      });

      return;
    }

    return this.previewMessage(message);
  }

  async previewMessage(message) {
    return browser.runtime.sendMessage({
      kind: MessageKind.PREVIEW_MESSAGE,
      message,
    });
  }

  createAndShowToast(content, { classList = [] } = {}) {
    const el = document
      .importNode(document.getElementById("template-toast").content, true)
      .querySelector(".toast");
    console.log(el);

    el.querySelector(".toast-body").appendChild(new Text(content));

    if (classList) {
      for (const className of classList) {
        el.classList.add(className);
      }
    }

    const toastContainer = document.getElementById("toasts-container");

    el.addEventListener("hidden.bs.toast", () =>
      toastContainer.removeChild(el),
    );
    toastContainer.appendChild(el);

    new window.wrappedJSObject.bootstrap.Toast(el).show();
  }

  validateMessage(message) {
    let messageJson;
    try {
      messageJson = JSON.parse(message);
    } catch {
      return { error: "JSON parse error" };
    }

    if (typeof messageJson !== "object" || messageJson === null) {
      return { error: "Message is not a JSON object" };
    }

    if (typeof messageJson.template === "undefined") {
      return { error: "Message template is undefiend" };
    }

    if (!this.supportedTemplates.includes(messageJson.template)) {
      return { error: "Unsupported template" };
    }

    return { ok: true };
  }
}
