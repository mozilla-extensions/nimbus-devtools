import { FC, useCallback, useEffect, useState } from "react";
import { NimbusExperiment } from "@mozilla/nimbus-schemas";
import {
  Table,
  Button,
  Container,
  Form,
  Row,
  Col,
  Dropdown,
} from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

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
  const [selectedBranches, setSelectedBranches] = useState<{
    [key: string]: string;
  }>({});
  const { addToast } = useToastsContext();

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
        addToast({
          message: `Error fetching experiments: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    },
    [environment, status, addToast],
  );

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  const handleEnroll = async (experimentId: string, branchSlug: string) => {
    if (branchSlug) {
      const recipe = experiments.find((exp) => exp.id === experimentId);
      try {
        const result = await browser.experiments.nimbus.forceEnroll(
          recipe,
          branchSlug,
        );
        if (result) {
          addToast({ message: "Enrollment successful", variant: "success" });
        } else {
          addToast({ message: "Enrollment failed", variant: "danger" });
        }
      } catch (error) {
        addToast({
          message: `Error enrolling into experiment: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    } else {
      addToast({
        message: "Select a branch before enrolling",
        variant: "danger",
      });
    }
  };

  const handleGenerateTestIds = async (
    experimentId: string,
    branchSlug: string,
  ) => {
    if (branchSlug) {
      const recipe = experiments.find((exp) => exp.id === experimentId);
      try {
        const result = await browser.experiments.nimbus.generateTestIds(
          recipe,
          branchSlug,
        );
        if (result) {
          await navigator.clipboard.writeText(result);
          addToast({
            message: `Id successfully generated and copied to clipboard. Test Id: ${result}`,
            variant: "success",
            autohide: false,
          });
        } else {
          addToast({ message: "Test Id generation failed", variant: "danger" });
        }
      } catch (error) {
        addToast({
          message: `Error generating test Id: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    } else {
      addToast({
        message: "Select a branch before generating test Id",
        variant: "danger",
      });
    }
  };

  const handleBranchChange = (experimentId: string, branchSlug: string) => {
    setSelectedBranches((prevSelectedBranches) => ({
      ...prevSelectedBranches,
      [experimentId]: branchSlug,
    }));
  };

  return (
    <Container>
      <h1 className="primary-fg my-3 fw-bold fs-3">{status} Experiments</h1>
      <Row className="mb-3 text-center">
        <Col md={4} className="d-flex align-items-center">
          <Form.Label className="primary-fg fs-6 fw-bold me-2">
            Environment:
          </Form.Label>
          <Form.Select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            className="grey-border rounded align-items-center"
          >
            <option value="prod">Production</option>
            <option value="stage">Stage</option>
          </Form.Select>
        </Col>
        <Col md={3} className="d-flex align-items-center">
          <Form.Label className="primary-fg fs-6 fw-bold me-2">
            Status:
          </Form.Label>
          <Form.Select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="grey-border rounded align-items-center"
          >
            <option value="Live">Live</option>
            <option value="Preview">Preview</option>
          </Form.Select>
        </Col>
        <Col md={3} className="d-flex align-items-start">
          <Button
            onClick={() => fetchExperiments(true)}
            className="option-button primary-fg mx-2 py-2 px-3 rounded small-font fw-bold grey-border light-bg"
          >
            Refresh
          </Button>
        </Col>
      </Row>
      <Table hover>
        <thead>
          <tr>
            <th className="text-center primary-fg light-bg">Experiment</th>
            <th className="text-center primary-fg light-bg">Channel</th>
            <th className="text-center primary-fg light-bg">Version</th>
            <th className="text-center primary-fg light-bg">Status</th>
            <th className="text-center primary-fg light-bg">Actions</th>
          </tr>
        </thead>
        <tbody>
          {experiments.map((experiment) => (
            <tr key={experiment.id}>
              <td className="align-middle ps-0 py-3 w-50">
                <strong>{experiment.userFacingName}</strong>:{" "}
                {experiment.userFacingDescription}
              </td>
              <td className="text-center align-middle px-2">
                {experiment.channel}
              </td>
              <td className="text-center align-middle px-2">
                {experiment.schemaVersion}
              </td>
              <td className="text-center align-middle px-2">
                {experiment.isEnrollmentPaused
                  ? "Enrolling"
                  : "Enrollment Paused"}
              </td>
              <td className="text-end align-middle wide-column">
                <Container className="d-flex align-items-center">
                  <Form.Select
                    value={selectedBranches[experiment.id]}
                    onChange={(e) =>
                      handleBranchChange(experiment.id, e.target.value)
                    }
                    className="grey-border small-font rounded p-2 m-0 font-monospace"
                  >
                    <option value="">Select branch</option>
                    {experiment.branches?.map((branch) => (
                      <option key={branch.slug} value={branch.slug}>
                        {branch.slug}
                      </option>
                    ))}
                  </Form.Select>
                  {status === "Live" ? (
                    <Dropdown>
                      <Dropdown.Toggle className="option-button primary-fg py-2 my-1 mx-2 rounded small-font fw-bold grey-border light-bg">
                        Actions
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item
                          onClick={() =>
                            handleEnroll(
                              experiment.id,
                              selectedBranches[experiment.id],
                            )
                          }
                        >
                          Force Enroll
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() =>
                            handleGenerateTestIds(
                              experiment.id,
                              selectedBranches[experiment.id],
                            )
                          }
                        >
                          Generate Test IDs
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  ) : (
                    <Button
                      className="option-button primary-fg py-0 my-1 mx-1 rounded small-font fw-bold grey-border light-bg"
                      onClick={() =>
                        handleEnroll(
                          experiment.id,
                          selectedBranches[experiment.id],
                        )
                      }
                    >
                      Force Enroll
                    </Button>
                  )}
                </Container>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default ExperimentBrowserPage;
