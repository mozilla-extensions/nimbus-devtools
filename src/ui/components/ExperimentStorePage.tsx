import { FC, useCallback, useEffect, useState } from "react";

interface NimbusEnrollment {
  slug: string;
  userFacingName: string;
  userFacingDescription: string;
  isRollout: boolean;
  featureIds: string[];
  active: boolean;
}

const ExperimentStorePage: FC = () => {
  const [experiments, setExperiments] = useState<NimbusEnrollment[]>([]);

  const fetchExperiments = useCallback(async () => {
    try {
      const experimentStore =
        await browser.experiments.nimbus.getExperimentStore();
      setExperiments(experimentStore as NimbusEnrollment[]);
    } catch (error) {
      console.error("Error fetching experiments:", error);
    }
  }, [experiments]);

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  const unenrollExperiment = useCallback(
    async (slug: string) => {
      try {
        await browser.experiments.nimbus.unenroll(slug);
        alert("Unenrollment successful");
        await fetchExperiments();
      } catch (error) {
        console.error(`Error unenrolling from experiment ${slug}:`, error);
      }
    },
    [fetchExperiments],
  );

  const deleteExperiment = useCallback(
    async (slug: string) => {
      try {
        await browser.experiments.nimbus.deleteInactiveEnrollment(slug);
        alert("Deletion successful");
        await fetchExperiments();
      } catch (error) {
        console.error(`Error deleting experiment ${slug}:`, error);
      }
    },
    [fetchExperiments],
  );

  return (
    <div className="experiment-viewer">
      <h1 className="experiment-viewer__title">Experiment Store</h1>
      <div className="experiment-viewer__list">
        <table>
          <thead>
            <tr>
              <th>Experiment</th>
              <th>featureIds</th>
              <th>isRollout</th>
              <th>Status</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            {experiments?.map((experiment: NimbusEnrollment, index: number) => (
              <tr key={index}>
                <td>
                  <strong>{experiment.slug}</strong> <br />
                  <br />
                  {experiment.userFacingName}:{" "}
                  {experiment.userFacingDescription}
                </td>
                <td>{experiment.featureIds.join(", ")}</td>
                <td>{experiment.isRollout ? "Yes" : "No"}</td>
                <td>{experiment.active ? "Active" : "Inactive"}</td>
                <td>
                  {experiment.active ? (
                    <button
                      className="experiment-viewer-list__button"
                      onClick={() => unenrollExperiment(experiment.slug)}
                    >
                      Unenroll
                    </button>
                  ) : (
                    <button
                      className="experiment-viewer-list__button"
                      onClick={() => deleteExperiment(experiment.slug)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExperimentStorePage;
