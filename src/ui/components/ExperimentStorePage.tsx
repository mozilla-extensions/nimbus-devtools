import { FC, useCallback, useEffect, useState } from "react";
import { Table, Button, Container } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

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
  const { addToast } = useToastsContext();

  const fetchExperiments = useCallback(async () => {
    try {
      const experimentStore =
        await browser.experiments.nimbus.getExperimentStore();
      setExperiments(experimentStore as NimbusEnrollment[]);
    } catch (error) {
      addToast(
        `Error fetching experiments: ${(error as Error).message ?? String(error)}`,
        "danger",
      );
    }
  }, [experiments, addToast]);

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  const unenrollExperiment = useCallback(
    async (slug: string) => {
      try {
        await browser.experiments.nimbus.unenroll(slug);
        addToast("Unenrollment successful", "success");
        await fetchExperiments();
      } catch (error) {
        addToast(
          `Error unenrolling from experiment: ${(error as Error).message ?? String(error)}`,
          "danger",
        );
      }
    },
    [fetchExperiments, addToast],
  );

  const deleteExperiment = useCallback(
    async (slug: string) => {
      try {
        await browser.experiments.nimbus.deleteInactiveEnrollment(slug);
        addToast("Deletion successful", "success");
        await fetchExperiments();
      } catch (error) {
        addToast(
          `Error deleting experiment: ${(error as Error).message ?? String(error)}`,
          "danger",
        );
      }
    },
    [fetchExperiments, addToast],
  );

  return (
    <Container>
      <h1 className="my-3 fw-bold fs-3 primary-fg">Experiment Store</h1>
      <Table hover>
        <thead>
          <tr>
            <th className="text-center primary-fg light-bg">Experiment</th>
            <th className="text-center primary-fg light-bg">featureIds</th>
            <th className="text-center primary-fg light-bg">isRollout</th>
            <th className="text-center primary-fg light-bg">Status</th>
            <th className="text-center primary-fg light-bg">Options</th>
          </tr>
        </thead>
        <tbody>
          {experiments?.map((experiment: NimbusEnrollment, index: number) => (
            <tr key={index}>
              <td className="align-middle ps-0 py-3">
                <strong>{experiment.slug}</strong> <br /> <br />
                {experiment.userFacingName}: {experiment.userFacingDescription}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.featureIds.join(", ")}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.isRollout ? "Yes" : "No"}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.active ? "Active" : "Inactive"}
              </td>
              <td className="text-center align-middle px-4">
                {experiment.active ? (
                  <Button
                    onClick={() => unenrollExperiment(experiment.slug)}
                    className="option-button primary-fg px-2 py-1 rounded grey-border light-bg"
                  >
                    Unenroll
                  </Button>
                ) : (
                  <Button
                    onClick={() => deleteExperiment(experiment.slug)}
                    className="option-button primary-fg px-2 py-1 rounded grey-border light-bg"
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default ExperimentStorePage;
