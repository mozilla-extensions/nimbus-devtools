import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DesktopNimbusExperiment } from "@mozilla/nimbus-schemas";
import {
  Table,
  Button,
  Container,
  Form,
  Row,
  Col,
  Dropdown,
  Modal,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import useEnrollments from "../hooks/useEnrollments";
import { useToastsContext } from "../hooks/useToasts";

type Status = "Live" | "Preview" | "Complete";
type DialogState =
  | {
      kind: "force-enroll";
      experiment: DesktopNimbusExperiment;
    }
  | {
      kind: "generate-test-ids";
      experiment: DesktopNimbusExperiment;
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
  experiment: DesktopNimbusExperiment;
};

type ForceEnrollmentDialogProps = DialogProps & {
  environment: Environment;
  forceEnroll: (recipe: object, branchSlug: string) => Promise<boolean>;
};

const ForceEnrollmentDialog: FC<ForceEnrollmentDialogProps> = ({
  environment,
  closeDialog,
  experiment,
  forceEnroll,
}) => {
  const { addToast } = useToastsContext();

  // If there is only a single branch, default to it.
  const [selectedBranch, setSelectedBranch] = useState<string>(
    experiment.branches.length === 1 ? experiment.branches[0].slug : "",
  );

  const branchOptions = useMemo(
    () =>
      experiment.branches.map((branch) => (
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
    if (selectedBranch) {
      let recipe: DesktopNimbusExperiment;
      try {
        recipe = await fetchExperiment(environment, experiment.slug);
      } catch (error) {
        addToast({
          message: `Could not fetch experiment: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
        return;
      }

      if (await forceEnroll(recipe, selectedBranch)) {
        closeDialog();
      }
    }
  }, [
    environment,
    experiment,
    selectedBranch,
    addToast,
    forceEnroll,
    closeDialog,
  ]);

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>Force Enroll</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Select value={selectedBranch} onChange={onBranchSelected}>
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
    </>
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
  }, [experiment, addToast, closeDialog]);

  const rows = useMemo(
    () =>
      experiment.branches?.map((branch) => (
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
    <>
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
    </>
  );
};

const ExperimentRow: FC<{
  experiment: DesktopNimbusExperiment;
  enrollment: NimbusEnrollment | null;
  openForceEnrollDialog: (e: DesktopNimbusExperiment) => void;
  openGenerateTestIdsDialog: (e: DesktopNimbusExperiment) => void;
  debugTargeting: (slug: string) => void;
}> = ({
  experiment,
  enrollment,
  openForceEnrollDialog,
  openGenerateTestIdsDialog,
  debugTargeting,
}) => {
  const handleForceEnrollClicked = useCallback(
    () => openForceEnrollDialog(experiment),
    [openForceEnrollDialog, experiment],
  );
  const handleGenerateTestIdsClicked = useCallback(
    () => openGenerateTestIdsDialog(experiment),
    [openGenerateTestIdsDialog, experiment],
  );
  const handleDebugTargetingClicked = useCallback(
    () => debugTargeting(experiment.slug),
    [debugTargeting, experiment],
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
            {!enrollment && (
              <Dropdown.Item onClick={handleForceEnrollClicked}>
                Force Enroll...
              </Dropdown.Item>
            )}
            <Dropdown.Item onClick={handleGenerateTestIdsClicked}>
              Generate Test IDs...
            </Dropdown.Item>
            <Dropdown.Item onClick={handleDebugTargetingClicked}>
              Debug Targeting
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </td>
    </tr>
  );
};

const ExperimentBrowserPage: FC = () => {
  const { addToast } = useToastsContext();
  const navigate = useNavigate();

  const [environment, setEnvironment] = useState<Environment>(Environment.PROD);
  const [status, setStatus] = useState<Status>("Live");
  const [experiments, setExperiments] = useState<
    DesktopNimbusExperiment[] | null
  >(null);
  const { enrollments, forceEnroll } = useEnrollments();

  const fetchExperiments = useCallback(
    async (forceRefresh = false) => {
      setExperiments(null);

      const url = new URL(EXPERIMENTER_API[environment]);
      url.searchParams.append("status", status);
      if (forceRefresh) {
        url.searchParams.append("bust-cache", Date.now().toString());
      }

      try {
        const fetchedExperiments = await fetch(url).then(
          (rsp) => rsp.json() as Promise<DesktopNimbusExperiment[]>,
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
    (experiment: DesktopNimbusExperiment) =>
      setDialogState({ kind: "force-enroll", experiment }),
    [],
  );
  const openGenerateTestIdsDialog = useCallback(
    (experiment: DesktopNimbusExperiment) =>
      setDialogState({ kind: "generate-test-ids", experiment }),
    [],
  );
  const closeDialog = useCallback(() => setDialogState(null), []);

  const debugTargeting = useCallback(
    (experimentSlug: string) => {
      fetchExperiment(environment, experimentSlug).then(
        (experiment) =>
          navigate("/jexl-debugger", {
            state: { jexlExpression: experiment.targeting },
          }),
        (error) =>
          addToast({
            message: `Could not fetch experiment: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          }),
      );
    },
    [environment, navigate, addToast],
  );

  const experimentRows = useMemo(
    () =>
      experiments?.map((experiment) => (
        <ExperimentRow
          key={experiment.slug}
          experiment={experiment}
          openForceEnrollDialog={openForceEnrollmentDialog}
          openGenerateTestIdsDialog={openGenerateTestIdsDialog}
          debugTargeting={debugTargeting}
          enrollment={
            enrollments?.find(
              (enrollment) => enrollment.slug === experiment.slug,
            ) ?? null
          }
        />
      )),
    [
      experiments,
      enrollments,
      openGenerateTestIdsDialog,
      openForceEnrollmentDialog,
      debugTargeting,
    ],
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatus(e.target.value as Status);
      setExperiments(null);
    },
    [],
  );

  return (
    <>
      <Container style={{ minHeight: "100%" }} className="d-flex flex-column">
        <h1 className="primary-fg my-3 fw-bold fs-3">{status} Experiments</h1>
        <Row className="mb-3 text-center">
          <Col md={4} className="d-flex align-items-center">
            <Form.Label className="primary-fg fs-6 fw-bold me-2">
              Environment:
            </Form.Label>
            <Form.Select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
              disabled={experiments === null}
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
              onChange={handleStatusChange}
              disabled={experiments === null}
              className="grey-border rounded align-items-center"
            >
              <option value="Live">Live</option>
              <option value="Preview">Preview</option>
              <option value="Complete">Complete</option>
            </Form.Select>
          </Col>
          <Col md={3} className="d-flex align-items-start">
            <Button
              onClick={() => fetchExperiments(true)}
              disabled={experiments === null}
              className="option-button primary-fg mx-2 py-2 px-3 rounded small-font fw-bold grey-border light-bg"
            >
              Refresh
            </Button>
          </Col>
        </Row>
        {experiments === null ? (
          <Spinner className="m-auto" />
        ) : (
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
        )}
      </Container>

      <Modal show={dialogState !== null} onHide={closeDialog}>
        {dialogState?.kind === "force-enroll" && (
          <ForceEnrollmentDialog
            closeDialog={closeDialog}
            environment={environment}
            experiment={dialogState.experiment}
            forceEnroll={forceEnroll}
          />
        )}
        {dialogState?.kind === "generate-test-ids" && (
          <GenerateTestIdsDialog
            closeDialog={closeDialog}
            experiment={dialogState.experiment}
          />
        )}
      </Modal>
    </>
  );
};

async function fetchExperiment(
  environment: Environment,
  slug: string,
): Promise<DesktopNimbusExperiment> {
  const url = new URL(`${slug}/`, EXPERIMENTER_API[environment]);
  url.searchParams.append("bust-cache", Date.now().toString());

  return fetch(url).then((rsp) =>
    rsp.json(),
  ) as Promise<DesktopNimbusExperiment>;
}

export default ExperimentBrowserPage;
