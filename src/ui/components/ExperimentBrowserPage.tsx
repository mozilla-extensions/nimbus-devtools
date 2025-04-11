import { FC, useCallback, useEffect, useMemo, useState } from "react";
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

import { AddToastParams, useToastsContext } from "../hooks/useToasts";

const PROD_URL =
  "https://experimenter.services.mozilla.com/api/v6/experiments/";
const STAGE_URL =
  "https://stage.experimenter.nonprod.webservices.mozgcp.net/api/v6/experiments/";

type Status = "Live" | "Preview";

enum Environment {
  PROD = "prod",
  STAGE = "stage",
}

const ExperimentRow: FC<{ experiment: NimbusExperiment }> = ({
  experiment,
}) => {
  const { addToast } = useToastsContext();
  const branchSlugs = useMemo(
    () => experiment.branches?.map((b) => b.slug),
    [experiment],
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  const branchSlugOptions = useMemo(
    () =>
      branchSlugs.map((slug) => (
        <option key={slug} value={slug}>
          {slug}
        </option>
      )),
    [branchSlugs],
  );

  const onSelectedBranchChanged = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedBranch(e.target.value);
    },
    [setSelectedBranch],
  );

  const handleGenerateTestIds = useCallback(async () => {
    const toast = await tryGenerateTestId(experiment, selectedBranch);
    addToast(toast);
  }, [experiment, selectedBranch, addToast]);

  const handleEnroll = useCallback(async () => {
    const toast = await tryEnroll(experiment, selectedBranch);
    addToast(toast);
  }, [experiment, selectedBranch, addToast]);

  return (
    <tr>
      <td className="align-middle ps-0 py-3 w-50">
        <strong>{experiment.userFacingName}</strong>:{" "}
        {experiment.userFacingDescription}
      </td>
      <td className="text-center align-middle px-2">{experiment.channel}</td>
      <td className="text-center align-middle px-2">
        {experiment.isEnrollmentPaused ? "Enrolling" : "Enrollment Paused"}
      </td>
      <td className="text-end align-middle wide-column">
        <Container className="d-flex align-items-center">
          <Form.Select
            value={selectedBranch}
            onChange={onSelectedBranchChanged}
            className="grey-border small-font rounded p-2 m-0 font-monospace"
          >
            <option value="">Select branch</option>
            {branchSlugOptions}
          </Form.Select>
          <Dropdown>
            <Dropdown.Toggle
              variant={!selectedBranch ? "secondary" : "primary"}
              className="option-button primary-fg mx-2 py-2 px-3 rounded small-font fw-bold grey-border light-bg"
              disabled={!selectedBranch}
            >
              Actions
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={handleEnroll}>Force Enroll</Dropdown.Item>
              <Dropdown.Item onClick={handleGenerateTestIds}>
                Generate Test IDs
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </td>
    </tr>
  );
};

const ExperimentBrowserPage: FC = () => {
  const [environment, setEnvironment] = useState<Environment>(Environment.PROD);
  const [status, setStatus] = useState<Status>("Live");
  const [experiments, setExperiments] = useState<NimbusExperiment[]>([]);
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

  const experimentRows = useMemo(
    () =>
      experiments.map((experiment) => (
        <ExperimentRow key={experiment.slug} experiment={experiment} />
      )),
    [experiments],
  );

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
            <th className="text-center primary-fg light-bg">Status</th>
            <th className="text-center primary-fg light-bg">Actions</th>
          </tr>
        </thead>
        <tbody>{experimentRows}</tbody>
      </Table>
    </Container>
  );
};

async function tryEnroll(
  experiment: NimbusExperiment,
  branchSlug: string,
): Promise<AddToastParams> {
  try {
    const enrolled = await browser.experiments.nimbus.forceEnroll(
      experiment,
      branchSlug,
    );
    if (enrolled) {
      return { message: "Enrollment successful", variant: "success" };
    } else {
      return { message: "Enrollment failed", variant: "danger" };
    }
  } catch (error) {
    return {
      message: `Error enrolling into experiment: ${(error as Error).message ?? String(error)}`,
      variant: "danger",
    };
  }
}

async function tryGenerateTestId(
  experiment: NimbusExperiment,
  branchSlug: string,
): Promise<AddToastParams> {
  try {
    const result = await browser.experiments.nimbus.generateTestIds(
      experiment,
      branchSlug,
    );
    if (result) {
      await navigator.clipboard.writeText(result);
      return {
        message: `Id copied to clipboard. Test Id: ${result}`,
        variant: "success",
        autohide: false,
      };
    } else {
      return { message: "Test Id generation failed", variant: "danger" };
    }
  } catch (error) {
    return {
      message: `Error generating test Id: ${(error as Error).message ?? String(error)}`,
      variant: "danger",
    };
  }
}

export default ExperimentBrowserPage;
