/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import NimbusDevtoolsAPI from "./lib/api.js";

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

  const messaging = await NimbusDevtoolsAPI.getMessagingFeaturesAndTemplates();
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
      .forEach((textarea) => {
        const container = textarea.closest(".readonly-json-collapsible");
        if (!container) {
          return;
        }

        const result = this.parseMessages(textarea.value);

        if (result.error) {
          container
            .querySelectorAll("[data-nimbus-devtools-cannot-preview-notice]")
            .forEach((notice) => {
              notice.title = `Cannot preview message: ${result.error}`;
              notice.classList.remove("d-none");
            });
        } else if (this.experimentMetadata.isLocalized) {
          container
            .querySelectorAll("[data-nimbus-devtools-try-preview-dropdown]")
            .forEach((dropdown) => {
              this.updateTryPreviewDropdown(dropdown, result.messages);
              dropdown.classList.remove("d-none");
            });
        } else {
          container
            .querySelectorAll("[data-nimbus-devtools-preview-button]")
            .forEach((btn) => {
              btn.addEventListener("click", () =>
                NimbusDevtoolsAPI.previewMessage(
                  JSON.stringify(result.messages[0].content),
                ),
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

          if (this.experimentMetadata.isLocalized) {
            const dropdown = editor.querySelector(
              "[data-nimbus-devtools-try-preview-dropdown]",
            );
            dropdown.addEventListener("show.bs.dropdown", (e) => {
              const result = this.parseMessages(input.value);

              if (result.error) {
                e.preventDefault();
                this.createAndShowToast(
                  `Cannot preview message: ${result.error}`,
                  { classList: ["text-bg-danger"] },
                );
              } else {
                this.updateTryPreviewDropdown(dropdown, result.messages);
              }
            });
            dropdown.classList.remove("d-none");
          } else {
            const btn = editor.querySelector(
              "[data-nimbus-devtools-try-preview-button]",
            );
            btn.addEventListener("click", () =>
              this.tryPreviewMessage(input.value),
            );
            btn.classList.remove("d-none");
          }
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
      await NimbusDevtoolsAPI.forceEnroll(recipe, branchSlug);

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

    return NimbusDevtoolsAPI.previewMessage(message);
  }

  createAndShowToast(content, { classList = [] } = {}) {
    const el = document
      .importNode(document.getElementById("template-toast").content, true)
      .querySelector(".toast");

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

    if (typeof message === "object") {
      messageJson = message;
    } else {
      try {
        messageJson = JSON.parse(message);
      } catch {
        return { error: "JSON parse error" };
      }
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

  parseMessages(rawJson) {
    let content;
    try {
      content = JSON.parse(rawJson);
    } catch {
      return { error: "JSON parse error" };
    }

    if (
      typeof content !== "object" ||
      content === null ||
      Array.isArray(content)
    ) {
      return { error: "Not a JSON object" };
    }

    if (typeof content.template === "undefined") {
      return { error: "Message template is undefined" };
    }

    if (!this.supportedTemplates.includes(content.template)) {
      return { error: "Unsupported template" };
    }

    if (!this.experimentMetadata.isLocalized) {
      return {
        messages: [{ content }],
      };
    }

    let localizations;
    try {
      localizations = JSON.parse(this.experimentMetadata.localizations);
    } catch {
      return { error: "Could not parse localizations" };
    }

    return {
      messages: Object.keys(localizations).map((locale) => ({
        locale,
        localizations: localizations[locale],
        content,
      })),
    };
  }

  updateTryPreviewDropdown(dropdown, messages) {
    const fragment = document.createDocumentFragment();

    const preludeContent = document.createElement("span");
    preludeContent.className = "dropdown-item-text";
    preludeContent.textContent = "Preview locale:";

    const prelude = document.createElement("li");
    prelude.appendChild(preludeContent);

    fragment.append(prelude);

    for (const message of messages) {
      const previewLink = document.createElement("a");
      previewLink.className = "dropdown-item";
      previewLink.href = "#";
      previewLink.textContent = message.locale;
      previewLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.previewLocalizedMessage(message);
      });

      const entry = document.createElement("li");
      entry.appendChild(previewLink);

      fragment.appendChild(entry);
    }

    dropdown.querySelector(".dropdown-menu").replaceChildren(fragment);
  }

  async previewLocalizedMessage({ localizations, content }) {
    let localizedMessage;
    try {
      localizedMessage = await NimbusDevtoolsAPI.substituteLocalizations(
        content,
        localizations,
      );
    } catch (e) {
      console.error(e);
      this.createAndShowToast(`Could not preview message: ${e}`, {
        classList: ["text-bg-danger"],
      });
      return;
    }

    this.tryPreviewMessage(JSON.stringify(localizedMessage));
  }
}
