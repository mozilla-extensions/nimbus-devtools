import { ChangeEvent, FC, useState, useCallback } from "react";
import { Form, Container, Button, Modal } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";
import { sanitizeJsonInput } from "../utils/sanitization";
import EnrollmentError from "./EnrollmentError";

type EnrollError = EnrollInExperimentResult["error"] & { slug: string };
type ExperimentWithSlug = { slug?: string };

const RecipeEnrollmentPage: FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [enrollError, setEnrollError] = useState<EnrollError | null>(null);
  const { addToast } = useToastsContext();

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const rawValue = event.target.value;
      const sanitizedValue = sanitizeJsonInput(rawValue);
      setJsonInput(sanitizedValue);
    },
    [setJsonInput],
  );

  const handleEnrollClick = useCallback(
    async (
      event?: React.MouseEvent<HTMLButtonElement>,
      forceEnroll = false,
    ) => {
      if (!jsonInput) {
        addToast({ message: "Invalid Input: Enter JSON", variant: "danger" });
        return;
      }

      let parsedRecipe: ExperimentWithSlug;
      try {
        parsedRecipe = JSON.parse(jsonInput) as ExperimentWithSlug;
      } catch (error) {
        addToast({
          message: `Error enrolling into experiment: ${
            (error as Error).message ?? String(error)
          }`,
          variant: "danger",
        });
        return;
      }

      try {
        const result = await browser.experiments.nimbus.enrollInExperiment(
          parsedRecipe,
          forceEnroll,
        );

        if (result.enrolled) {
          addToast({ message: "Enrollment successful", variant: "success" });
          setJsonInput("");
        } else if (result.error) {
          setEnrollError({ slug: parsedRecipe.slug ?? "", ...result.error });
        }
      } catch (error) {
        addToast({
          message: `Error enrolling into experiment: ${
            (error as Error).message ?? String(error)
          }`,
          variant: "danger",
        });
      }
    },
    [jsonInput, setJsonInput, addToast, setEnrollError],
  );

  const handleModalConfirm = useCallback(async () => {
    setEnrollError(null);
    await handleEnrollClick(undefined, true);
  }, [handleEnrollClick, setEnrollError]);

  const handleModalClose = useCallback(() => {
    setEnrollError(null);
  }, [setEnrollError]);

  return (
    <Container className="main-content m-0 p-2">
      <Form>
        <Form.Group>
          <Form.Control
            as="textarea"
            value={jsonInput}
            onChange={handleInputChange}
            placeholder="Enter JSON here"
            className="text-input long-input rounded p-4 font-monospace fs-6 grey-border"
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
          <EnrollmentError slug={enrollError?.slug} enrollError={enrollError} />
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

export default RecipeEnrollmentPage;
