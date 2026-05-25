import { FC } from "react";

const EnrollmentError: FC<{
  slug: string;
  enrollError: EnrollInExperimentResult["error"] | null;
}> = ({ slug, enrollError }) => {
  if (!enrollError) {
    return null;
  }
  const { activeEnrollments, slugExistsInStore } = enrollError;

  return (
    <>
      {activeEnrollments && (
        <>
          <p>
            There are one or more active enrollments that are in conflict with
            this new enrollment. Force enrolling will unenroll from these
            enrollments:
          </p>
          <ul>
            {activeEnrollments.map((slug) => (
              <li key={slug}>
                <code>{slug}</code>
              </li>
            ))}
          </ul>
        </>
      )}

      {slugExistsInStore && (
        <p>
          An enrollment with the slug <code>{slug}</code> already exists in the
          enrollment store. Force enrolling will <strong>delete</strong> this
          enrollment from the store.
        </p>
      )}
    </>
  );
};

export default EnrollmentError;
