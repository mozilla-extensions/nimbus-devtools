import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NimbusExperiment } from "@mozilla/nimbus-schemas";
import {
  Table,
  Button,
  Container,
  Form,
  Row,
  Col,
  Dropdown,
  Modal,
} from "react-bootstrap";

import { AddToastParams, useToastsContext } from "../hooks/useToasts";

type Status = "Live" | "Preview";
type DialogState =
  | {
      kind: "force-enroll";
      experiment: NimbusExperiment;
    }
  | {
      kind: "generate-test-ids";
      experiment: NimbusExperiment;
    };

enum Environment {
  PROD = "prod",
  STAGE = "stage",
}

const EXPERIMENTER_API = {
  [Environment.PROD]:
    "https://experimenter.services.mozilla.com/api/v6/experiments/",
  [Environment.STAGE]:
    "https://stage.experimenter.nonprod.webservices.mozgcp.net/api/v6/experiments/",
};

type DialogProps = {
  closeDialog: () => void;
  experiment: NimbusExperiment | null;
};

type ForceEnrollmentDialogProps = DialogProps & { environment: Environment };

const ForceEnrollmentDialog: FC<ForceEnrollmentDialogProps> = ({
  environment,
  closeDialog,
  experiment,
}) => {
  const { addToast } = useToastsContext();

  // If there is only a single branch, default to it.
  const [selectedBranch, setSelectedBranch] = useState<string>(
    experiment?.branches?.length === 1 ? experiment.branches[0].slug : "",
  );

  const branchOptions = useMemo(
    () =>
      experiment?.branches?.map((branch) => (
        <option value={branch.slug} key={branch.slug}>
          {branch.slug}
        </option>
      )),
    [experiment],
  );

  const onBranchSelected = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => setSelectedBranch(e.target.value),
    [],
  );

  const handleEnroll = useCallback(async () => {
    if (experiment && selectedBranch) {
      const toast = await tryEnroll(
        environment,
        experiment.slug,
        selectedBranch,
      );
      addToast(toast);
      closeDialog();
    }
  }, [environment, experiment, selectedBranch, addToast, closeDialog]);

  return (
    <Modal show={experiment !== null} onHide={closeDialog}>
      <Modal.Header closeButton>
        <Modal.Title>Force Enroll</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Select value={selectedBranch ?? ""} onChange={onBranchSelected}>
          <option value="">Select branch...</option>
          {branchOptions}
        </Form.Select>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleEnroll}
          disabled={selectedBranch === ""}
        >
          Enroll
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const GenerateTestIdsDialog: FC<DialogProps> = ({
  closeDialog,
  experiment,
}) => {
  const { addToast } = useToastsContext();

  const [testIds, setTestIds] = useState<Record<string, string> | null>(null);

  const handleCopyClicked = useCallback(
    async (slug: string) => {
      if (testIds?.[slug]) {
        await navigator.clipboard.writeText(testIds[slug]);

        addToast({
          message: "ID copied to clipboard.",
          variant: "success",
        });
      }
    },
    [testIds, addToast],
  );

  const handleCopyAllClicked = useCallback(async () => {
    if (testIds) {
      await navigator.clipboard.writeText(JSON.stringify(testIds));

      addToast({
        message: "IDs copied to clipboard.",
        variant: "success",
      });
    }
  }, [testIds, addToast]);

  useEffect(() => {
    if (experiment) {
      browser.experiments.nimbus.generateTestIds(experiment).then(
        (result) => setTestIds(result),
        () => {
          addToast({
            message: "Test ID generation failed",
            variant: "danger",
          });

          closeDialog();
        },
      );
    }
  }, [experiment, addToast, closeDialog]);

  const rows = useMemo(
    () =>
      experiment?.branches?.map((branch) => (
        <tr key={branch.slug}>
          <td>{branch.slug}</td>
          <td>
            <Button
              className="btn-sm"
              onClick={() => handleCopyClicked(branch.slug)}
              disabled={testIds === null}
            >
              Copy
            </Button>
          </td>
        </tr>
      )),
    [experiment, testIds, handleCopyClicked],
  );

  return (
    <Modal show={experiment !== null} onHide={closeDialog}>
      <Modal.Header closeButton>
        <Modal.Title>Test IDs</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <table className="table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Copy</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCopyAllClicked}
          disabled={testIds === null}
        >
          Copy All as JSON
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const ExperimentRow: FC<{
  experiment: NimbusExperiment;
  openForceEnrollDialog: (e: NimbusExperiment) => void;
  openGenerateTestIdsDialog: (e: NimbusExperiment) => void;
}> = ({ experiment, openForceEnrollDialog, openGenerateTestIdsDialog }) => {
  const handleForceEnrollClicked = useCallback(
    () => openForceEnrollDialog(experiment),
    [openForceEnrollDialog, experiment],
  );
  const handleGenerateTestIdsClicked = useCallback(
    () => openGenerateTestIdsDialog(experiment),
    [openGenerateTestIdsDialog, experiment],
  );

  return (
    <tr>
      <td className="align-middle ps-0 py-3 w-50">
        <strong>{experiment.userFacingName}</strong>:{" "}
        {experiment.userFacingDescription}
      </td>
      <td className="text-center align-middle px-2">{experiment.channel}</td>
      <td className="text-center align-middle px-2">
        {experiment.isEnrollmentPaused ? "Enrollment Paused" : "Enrolling"}
      </td>
      <td className="text-center align-middle px-2">
        <Dropdown>
          <Dropdown.Toggle>Actions</Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={handleForceEnrollClicked}>
              Force Enroll...
            </Dropdown.Item>
            <Dropdown.Item onClick={handleGenerateTestIdsClicked}>
              Generate Test IDs...
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
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
      const url = new URL(EXPERIMENTER_API[environment]);
      url.searchParams.append("status", status);
      if (forceRefresh) {
        url.searchParams.append("bust-cache", Date.now().toString());
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
    // This will raise a false positive about calling setState in effect, even
    // though the setState happens *after* an await statement.
    // See-also: https://github.com/facebook/react/issues/34905
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchExperiments();
  }, [fetchExperiments]);

  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const openForceEnrollmentDialog = useCallback(
    (experiment: NimbusExperiment) =>
      setDialogState({ kind: "force-enroll", experiment }),
    [],
  );
  const openGenerateTestIdsDialog = useCallback(
    (experiment: NimbusExperiment) =>
      setDialogState({ kind: "generate-test-ids", experiment }),
    [],
  );
  const closeDialog = useCallback(() => setDialogState(null), []);

  const experimentRows = useMemo(
    () =>
      experiments.map((experiment) => (
        <ExperimentRow
          key={experiment.slug}
          experiment={experiment}
          openForceEnrollDialog={openForceEnrollmentDialog}
          openGenerateTestIdsDialog={openGenerateTestIdsDialog}
        />
      )),
    [experiments, openGenerateTestIdsDialog, openForceEnrollmentDialog],
  );

  return (
    <>
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

      <ForceEnrollmentDialog
        closeDialog={closeDialog}
        environment={environment}
        experiment={
          dialogState?.kind === "force-enroll" ? dialogState.experiment : null
        }
      />
      <GenerateTestIdsDialog
        closeDialog={closeDialog}
        experiment={
          dialogState?.kind === "generate-test-ids"
            ? dialogState.experiment
            : null
        }
      />
    </>
  );
};

async function tryEnroll(
  environment: Environment,
  slug: string,
  branchSlug: string,
): Promise<AddToastParams> {
  const url = new URL(slug, EXPERIMENTER_API[environment]);
  url.searchParams.append("bust-cache", Date.now().toString());

  let experiment: object;
  try {
    experiment = await fetch(url).then((rsp) => rsp.json() as object);
  } catch (error) {
    return {
      message: `Could not fetch experiment: ${(error as Error).message ?? String(error)}`,
      variant: "danger",
    };
  }

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

export default ExperimentBrowserPage;
