import { FC, useCallback, useEffect, useState } from "react";
import { NimbusExperiment } from "@mozilla/nimbus-schemas";

const PROD_URL =
  "https://experimenter.services.mozilla.com/api/v6/experiments/";
const STAGE_URL =
  "https://stage.experimenter.nonprod.dataops.mozgcp.net/api/v6/experiments/";

type Status = "Live" | "Preview";

enum Environment {
  PROD = "prod",
  STAGE = "stage",
}

const ExperimentBrowserPage: FC = () => {
  const [environment, setEnvironment] = useState<Environment>(Environment.PROD);
  const [status, setStatus] = useState<Status>("Live");
  const [experiments, setExperiments] = useState<NimbusExperiment[]>([]);

  const fetchExperiments = useCallback(
    async (forceRefresh = false) => {
      let url = environment === Environment.PROD ? PROD_URL : STAGE_URL;
      url += `?status=${status}`;
      if (forceRefresh) {
        url += `&bust-cache=${Date.now()}`;
      }

      try {
        const fetchedExperiments = await fetch(url).then(
          (rsp) => rsp.json() as Promise<NimbusExperiment[]>,
        );
        setExperiments(fetchedExperiments);
      } catch (error) {
        console.error("Error fetching experiments:", error);
      }
    },
    [environment, status],
  );

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  return (
    <div className="experiment-viewer">
      <h1 className="experiment-viewer__title">{status} Experiments</h1>
      <div className="experiment-viewer__controls">
        <label className="experiment-viewer-controls__title">
          Environment:
          <select
            className="experiment-viewer-controls__dropdown"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
          >
            <option value="prod">Prod</option>
            <option value="stage">Stage</option>
          </select>
        </label>
        <label className="experiment-viewer-controls__title">
          Status:
          <select
            className="experiment-viewer-controls__dropdown"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="Live">Live</option>
            <option value="Preview">Preview</option>
          </select>
        </label>
        <button
          className="experiment-viewer-controls__button"
          onClick={() => fetchExperiments(true)}
        >
          Refresh
        </button>
      </div>
      <div className="experiment-viewer__list">
        <table>
          <thead>
            <tr>
              <th>Experiment</th>
              <th>Channel</th>
              <th>Version</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((experiment) => (
              <tr key={experiment.id}>
                <td>
                  {experiment.userFacingName}:{" "}
                  {experiment.userFacingDescription}
                </td>
                <td>{experiment.channel}</td>
                <td>{experiment.schemaVersion}</td>
                <td>
                  {experiment.isEnrollmentPaused
                    ? "Enrolling"
                    : "Enrollment Paused"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExperimentBrowserPage;
