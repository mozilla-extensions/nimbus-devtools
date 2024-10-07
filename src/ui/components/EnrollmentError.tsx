import { FC } from "react";

const EnrollmentError: FC<{
  slug: string;
  enrollError: EnrollInExperimentResult["error"] | null;
}> = ({ slug, enrollError }) => {
  if (!enrollError) {
    return null;
  }
  const { activeEnrollment, slugExistsInStore } = enrollError;

  if (activeEnrollment && slugExistsInStore && slug == activeEnrollment) {
    return (
      <p>
        There is already an enrollment for the slug: <strong>{slug}</strong>.
        Would you like to proceed with force enrollment by unenrolling,
        deleting, and enrolling into the new configuration?
      </p>
    );
  } else if (
    activeEnrollment &&
    slugExistsInStore &&
    slug !== activeEnrollment
  ) {
    return (
      <p>
        There is already an active enrollment for the feature with a different
        slug. Would you like to proceed with force enrollment by unenrolling,
        deleting, and enrolling into the new configuration?
      </p>
    );
  }

  if (activeEnrollment) {
    return (
      <p>
        There is an active enrollment for the slug:{" "}
        <strong>{activeEnrollment}</strong>. Would you like to unenroll from the
        active enrollment and enroll into the new configuration?
      </p>
    );
  }

  if (slugExistsInStore) {
    return (
      <p>
        There is an inactive enrollment stored for the slug:{" "}
        <strong>{slug}</strong>. Would you like to delete the inactive
        enrollment and enroll into the new configuration?
      </p>
    );
  }

  return null;
};

export default EnrollmentError;
