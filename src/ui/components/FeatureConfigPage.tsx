import { ChangeEvent, FC, useState, useCallback, useMemo } from "react";
import { Form, Container, Button, Row, Col, Modal } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";
import { sanitizeJsonInput } from "../utils/sanitization";
import DropdownMenu from "./DropdownMenu";
import EnrollmentError from "./EnrollmentError";

const FeatureConfigPage: FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [isRollout, setIsRollout] = useState(false);
  const [enrollError, setEnrollError] =
    useState<EnrollInExperimentResult["error"]>(null);
  const { addToast } = useToastsContext();

  const slug = useMemo(() => {
    return `nimbus-devtools-${selectedFeatureId}-${
      isRollout ? "rollout" : "experiment"
    }`;
  }, [selectedFeatureId, isRollout]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const rawValue = event.target.value;
      const sanitizedValue = sanitizeJsonInput(rawValue);
      setJsonInput(sanitizedValue);
    },
    [],
  );

  const handleFeatureSelect = useCallback((featureId: string) => {
    setSelectedFeatureId(featureId);
  }, []);

  const handleCheckboxChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setIsRollout(event.target.checked);
    },
    [],
  );

  const handleEnrollClick = useCallback(
    async (
      event?: React.MouseEvent<HTMLButtonElement>,
      forceEnroll = false,
    ) => {
      if (selectedFeatureId === "") {
        addToast({
          message: "Invalid Input: Select feature",
          variant: "danger",
        });
      } else if (jsonInput === "") {
        addToast({ message: "Invalid Input: Enter JSON", variant: "danger" });
      } else {
        try {
          const result =
            await browser.experiments.nimbus.enrollWithFeatureConfig(
              selectedFeatureId,
              JSON.parse(jsonInput) as object,
              isRollout,
              forceEnroll,
            );

          if (result.enrolled) {
            addToast({ message: "Enrollment successful", variant: "success" });
          } else if (result.error) {
            setEnrollError(result.error);
          }
        } catch (error) {
          addToast({
            message: `Error enrolling into experiment: ${
              (error as Error).message ?? String(error)
            }`,
            variant: "danger",
          });
        }
      }
    },
    [jsonInput, selectedFeatureId, isRollout, addToast],
  );

  const handleModalConfirm = useCallback(async () => {
    setEnrollError(null);
    await handleEnrollClick(null, true);
  }, [handleEnrollClick, setEnrollError]);

  const handleModalClose = useCallback(() => {
    setEnrollError(null);
  }, [setEnrollError]);

  return (
    <Container className="main-content p-2 overflow-hidden">
      <Form>
        <Row className="align-items-stretch">
          <Col md={9}>
            <DropdownMenu onSelectFeatureConfigId={handleFeatureSelect} />
          </Col>
          <Col md={3} className="ps-0">
            <Container className="checkbox-border d-flex rounded p-2 grey-border">
              <Form.Check
                type="checkbox"
                checked={isRollout}
                onChange={handleCheckboxChange}
                className="large-checkbox mx-3 my-0 justify-content-start font-monospace"
              />
              <Form.Label className="font-monospace fs-6">isRollout</Form.Label>
            </Container>
          </Col>
        </Row>
        <Form.Group>
          <Form.Control
            as="textarea"
            value={jsonInput}
            onChange={handleInputChange}
            placeholder="Enter JSON here"
            className="text-input medium-input rounded p-3 font-monospace fs-6 grey-border"
          />
        </Form.Group>
        <Button
          onClick={handleEnrollClick}
          className="mt-2 py-3 px-4 fs-5 border-0 w-100 rounded text-white dark-button"
        >
          Enroll
        </Button>
      </Form>

      <Modal show={!!enrollError} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Force Enrollment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EnrollmentError slug={slug} enrollError={enrollError} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleModalConfirm}>
            Force Enroll
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FeatureConfigPage;
