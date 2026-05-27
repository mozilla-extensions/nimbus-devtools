/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DesktopNimbusExperiment } from "@mozilla/nimbus-schemas";
import { useCallback, useEffect, useRef, useState } from "react";

import { useToastsContext } from "./useToasts";

export type NimbusEnrollment = {
  slug: string;
  userFacingName: string;
  userFacingDescription: string;
  isRollout: boolean;
  featureIds: string[];
  branch: { slug: string };
  source: string;
} & (
  | {
      active: true;
    }
  | {
      active: false;
      unenrollReason: string;
    }
) &
  (
    | { isFirefoxLabsOptIn: false | undefined }
    | {
        isFirefoxLabsOptIn: true;
        firefoxLabsTitle: string;
        firefoxLabsDescription: string;
        firefoxLabsDescriptionLinks: Record<string, string> | null;
        firefoxLabsGroup: string;
        requiresRestart: boolean;
      }
  );

export type UseEnrollments = {
  enrollments: NimbusEnrollment[] | null;
  forceEnroll: (recipe: object, branchSlug: string) => Promise<boolean>;
  loadEnrollments: () => Promise<void>;
  unenroll: (slug: string) => Promise<void>;
  deleteEnrollment: (slug: string) => Promise<void>;
  injectInactiveEnrollment: (
    experiment: DesktopNimbusExperiment,
    branchSlug: string,
    reason: string,
  ) => Promise<void>;
};

export default function useEnrollments(): UseEnrollments {
  const mounted = useRef<boolean>(false);
  const { addToast } = useToastsContext();
  const [enrollments, setEnrollments] = useState<NimbusEnrollment[] | null>(
    null,
  );
  const loadEnrollments = useCallback(
    () =>
      browser.experiments.nimbus.getExperimentStore().then(
        (currentEnrollments) => setEnrollments(currentEnrollments),
        (error) =>
          addToast({
            message: `Error fetching experiments: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          }),
      ),
    [addToast],
  );

  const forceEnroll = useCallback(
    async (recipe: object, branchSlug: string) => {
      try {
        const enrolled = await browser.experiments.nimbus.forceEnroll(
          recipe,
          branchSlug,
        );

        if (enrolled) {
          addToast({ message: "Enrollment successful", variant: "success" });
          await loadEnrollments();
        } else {
          addToast({ message: "Enrollment failed", variant: "danger" });
        }

        return enrolled;
      } catch (error) {
        addToast({
          message: `Error enrolling into experiment: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }

      return false;
    },
    [addToast, loadEnrollments],
  );

  const unenroll = useCallback(
    async (slug: string) => {
      try {
        await browser.experiments.nimbus.unenroll(slug);
        addToast({ message: "Unenrollment successful", variant: "success" });
        await loadEnrollments();
      } catch (error) {
        addToast({
          message: `Error unenrolling from experiment: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    },
    [addToast, loadEnrollments],
  );

  const injectInactiveEnrollment = useCallback(
    async (
      experiment: DesktopNimbusExperiment,
      branchSlug: string,
      reason: string,
    ) => {
      try {
        await browser.experiments.nimbus.injectInactiveEnrollment(
          experiment,
          branchSlug,
          reason,
        );
        addToast({ message: "Enrollment injected", variant: "success" });
        await loadEnrollments();
      } catch (error) {
        console.error(error);
        addToast({
          message: `Error injecting past enrollment: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    },
    [addToast, loadEnrollments],
  );

  const deleteEnrollment = useCallback(
    async (slug: string) => {
      try {
        await browser.experiments.nimbus.deleteInactiveEnrollment(slug);
        addToast({ message: "Deletion successful", variant: "success" });
        await loadEnrollments();
      } catch (error) {
        addToast({
          message: `Error deleting experiment: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    },
    [addToast, loadEnrollments],
  );

  useEffect(() => {
    if (!mounted.current) {
      void loadEnrollments();
    }

    mounted.current = true;
  }, [loadEnrollments]);

  return {
    enrollments,
    forceEnroll,
    loadEnrollments,
    unenroll,
    deleteEnrollment,
    injectInactiveEnrollment,
  };
}
