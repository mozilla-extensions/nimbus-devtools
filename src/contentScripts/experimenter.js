/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import NimbusDevtoolsAPI from "./lib/api.js";

const TEMPLATE_MULTI = "multi";

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
      .querySelectorAll("[data-nimbus-devtools-opt-in-pane]")
      .forEach((pane) => {
        const devtoolsRequiredSection = pane.querySelector(
          "[data-nimbus-devtools-required]",
        );
        const branchSelector = pane.querySelector(
          "[data-nimbus-devtools-force-enroll-branch-selector]",
        );

        if (!devtoolsRequiredSection || !branchSelector) {
          return;
        }

        devtoolsRequiredSection
          .querySelector("[data-nimbus-devtools-enroll-button]")
          ?.addEventListener("click", () => {
            const recipe = JSON.parse(
              document.querySelector(
                "[data-nimbus-devtools-recipe-json] textarea",
              ).value,
            );
            this.forceEnroll(recipe, branchSelector.value);
          });

        devtoolsRequiredSection.classList.remove("d-none");
      });

    document
      .querySelectorAll("textarea[data-nimbus-devtools-feature-value]")
      .forEach((textarea) => {
        const container = textarea.closest(".readonly-json-collapsible");
        if (!container) {
          return;
        }

        const result = this.parseMessages(
          textarea.value,
          this.experimentMetadata.isLocalized
            ? this.experimentMetadata.localizations
            : undefined,
        );

        if (result.error) {
          container
            .querySelectorAll("[data-nimbus-devtools-cannot-preview-notice]")
            .forEach((notice) => {
              notice.title = `Cannot preview message: ${result.error}`;
              notice.classList.remove("d-none");
            });
        } else {
          container
            .querySelectorAll("[data-nimbus-devtools-try-preview-dropdown]")
            .forEach((dropdown) => {
              if (result.messageGroups) {
                this.updateTryPreviewDropdown(
                  dropdown,
                  result.messageGroups,
                  this.experimentMetadata.isLocalized,
                );
                dropdown.classList.remove("d-none");
              }
            });
        }
      });

    document
      .querySelectorAll("textarea[data-nimbus-devtools-targeting-expression]")
      .forEach((textarea) => {
        const container = textarea.closest(".readonly-json-collapsible");
        if (!container) {
          return;
        }

        container
          .querySelectorAll("[data-nimbus-devtools-debug-jexl-button]")
          .forEach((button) => {
            button.addEventListener("click", () =>
              NimbusDevtoolsAPI.debugJexl(textarea.value),
            );
            button.classList.remove("d-none");
          });
      });
  }

  /**
   * Update the Experimenter update branches page.
   */
  handleUpdateBranchesPage() {
    const insertControls = () => {
      const l10nInput = document.getElementById("id_localizations");
      const isLocalized = !!l10nInput;

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

          const dropdown = editor.querySelector(
            "[data-nimbus-devtools-try-preview-dropdown]",
          );
          dropdown.addEventListener("show.bs.dropdown", (e) => {
            const result = this.parseMessages(
              input.value,
              isLocalized ? l10nInput.value : undefined,
            );

            if (result.errors?.length) {
              if (!result.messageGroups.length) {
                e.preventDefault();
              }

              for (const error of result.errors) {
                this.createAndShowToast(`Cannot preview message: ${error}`, {
                  classList: ["text-bg-danger"],
                });
              }
            }

            if (result.messageGroups) {
              this.updateTryPreviewDropdown(
                dropdown,
                result.messageGroups,
                isLocalized,
              );
            }
          });
          dropdown.classList.remove("d-none");
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

  parseMessages(rawJson, rawLocalizations) {
    let content;
    try {
      content = JSON.parse(rawJson);
    } catch {
      return { errors: ["JSON parse error"] };
    }

    let localizations = undefined;
    if (typeof rawLocalizations !== "undefined") {
      try {
        localizations = JSON.parse(rawLocalizations);
      } catch {
        return { errors: ["Could not parse localizations"] };
      }

      if (typeof localizations !== "object" || localizations === null) {
        return { errors: ["Invalid localizations"] };
      }
    }

    return this.extractMessageGroups(content, localizations);
  }

  extractMessageGroups(content, localizations) {
    if (
      typeof content !== "object" ||
      content === null ||
      Array.isArray(content)
    ) {
      return { errors: ["Not a JSON object"] };
    }

    if (typeof content.template === "undefined") {
      return { errors: ["Message template is undefined"] };
    }

    if (
      !this.supportedTemplates.includes(content.template) &&
      content.template !== TEMPLATE_MULTI
    ) {
      return { errors: ["Unsupported template"] };
    }

    if (content.template === TEMPLATE_MULTI) {
      if (Array.isArray(content.messages) && content.messages.length) {
        const errors = [];
        const messageGroups = [];

        for (const message of content.messages) {
          const result = this.extractMessageGroups(message, localizations);

          if (result.errors) {
            errors.push(...result.errors);
          }

          if (result.messageGroups) {
            messageGroups.push(...result.messageGroups);
          }
        }

        const rv = {};

        if (errors.length) {
          rv.errors = errors;
        }
        if (messageGroups.length) {
          rv.messageGroups = messageGroups;
        }

        return rv;
      } else {
        return { errors: ["Empty multi-message"] };
      }
    }

    if (typeof content.id !== "string" || content.id.length === 0) {
      return { errors: ["Empty message ID"] };
    }

    if (typeof localizations === "undefined") {
      return {
        messageGroups: [{ groupId: content.id, messages: [{ content }] }],
      };
    }

    return {
      messageGroups: [
        {
          groupId: content.id,
          messages: Object.keys(localizations).map((locale) => ({
            content,
            locale,
            localizations: localizations[locale],
          })),
        },
      ],
    };
  }

  updateTryPreviewDropdown(dropdown, messageGroups, isLocalized) {
    if (messageGroups.length === 0) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const [i, { groupId, messages }] of messageGroups.entries()) {
      if (isLocalized && i > 0) {
        const divider = document.createElement("hr");
        divider.className = "dropdown-divider";

        const entry = document.createElement("li");
        entry.appendChild(divider);

        fragment.appendChild(divider);
      }

      const preludeMessageId = document.createElement("span");
      preludeMessageId.className = "font-monospace";
      preludeMessageId.textContent = groupId;

      if (messages.length === 1) {
        const previewLink = this.createPreviewLink(
          messages[0],
          null,
          isLocalized,
        );

        previewLink.appendChild(new Text("Preview "));
        previewLink.appendChild(preludeMessageId);

        const entry = document.createElement("li");
        entry.appendChild(previewLink);

        fragment.appendChild(entry);
      } else {
        const prelude = document.createElement("span");
        prelude.className = "dropdown-item-text";

        prelude.appendChild(new Text("Preview "));
        prelude.appendChild(preludeMessageId);
        prelude.appendChild(new Text(" in locale:"));

        const entry = document.createElement("li");
        entry.appendChild(prelude);

        fragment.appendChild(entry);

        for (const message of messages) {
          const previewLink = this.createPreviewLink(
            message,
            message.locale,
            isLocalized,
          );

          const entry = document.createElement("li");
          entry.appendChild(previewLink);

          fragment.appendChild(entry);
        }
      }
    }

    dropdown.querySelector(".dropdown-menu").replaceChildren(fragment);
  }

  createPreviewLink(message, textContent, isLocalized) {
    const previewLink = document.createElement("a");

    previewLink.className = "dropdown-item";
    previewLink.href = "#";
    previewLink.textContent = textContent;
    previewLink.addEventListener("click", (e) => {
      e.preventDefault();

      if (isLocalized) {
        this.previewLocalizedMessage(message);
      } else {
        this.tryPreviewMessage(JSON.stringify(message.content));
      }
    });

    return previewLink;
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
