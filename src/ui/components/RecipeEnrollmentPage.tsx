import { ChangeEvent, FC, useState, useCallback } from "react";
import { Form, Container, Button, Modal } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

type EnrollError = EnrollInExperimentResult["error"] & { slug: string };
type ExperimentWithSlug = { slug?: string };

const EnrollmentError: FC<{
  slug: string;
  enrollError: EnrollInExperimentResult["error"] | null;
}> = ({ slug, enrollError }) => {
  if (!enrollError) {
    return null;
  }
  const { activeEnrollment, slugExistsInStore } = enrollError;

  if (activeEnrollment && slugExistsInStore && slug == activeEnrollment) {
    return (
      <p>
        There is already an enrollment for the slug: <strong>{slug}</strong>.
        Would you like to proceed with force enrollment by unenrolling,
        deleting, and enrolling into the new configuration?
      </p>
    );
  }

  if (activeEnrollment) {
    return (
      <p>
        There is an active enrollment for the slug:{" "}
        <strong>{activeEnrollment}</strong>. Would you like to unenroll from the
        active enrollment and enroll into the new configuration?
      </p>
    );
  }

  if (slugExistsInStore) {
    return (
      <p>
        There is an inactive enrollment stored for the slug:{" "}
        <strong>{slug}</strong>. Would you like to delete the inactive
        enrollment and enroll into the new configuration?
      </p>
    );
  }

  return null;
};

const RecipeEnrollmentPage: FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [enrollError, setEnrollError] = useState<EnrollError | null>(null);
  const { addToast } = useToastsContext();

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setJsonInput(event.target.value);
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
