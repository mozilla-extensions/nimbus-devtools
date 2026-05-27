/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useToastsContext } from "./useToasts";

export type NimbusEnrollment = {
  slug: string;
  userFacingName: string;
  userFacingDescription: string;
  isRollout: boolean;
  featureIds: string[];
  active: boolean;
};

export type UseEnrollments = {
  enrollments: NimbusEnrollment[] | null;
  loadEnrollments: () => Promise<void>;
  unenroll: (slug: string) => Promise<void>;
  deleteEnrollment: (slug: string) => Promise<void>;
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
    loadEnrollments,
    unenroll,
    deleteEnrollment,
  };
}
