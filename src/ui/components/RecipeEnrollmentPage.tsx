import { ChangeEvent, FC, useState, useCallback } from "react";
import { Form, Container, Button } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

const RecipeEnrollmentPage: FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const { addToast } = useToastsContext();

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setJsonInput(event.target.value);
    },
    [],
  );

  const handleEnrollClick = useCallback(async () => {
    try {
      const result = await browser.experiments.nimbus.enrollInExperiment(
        JSON.parse(jsonInput) as object,
      );

      if (result) {
        addToast("Enrollment successful", "success");
        setJsonInput("");
      } else {
        addToast("Enrollment failed", "danger");
      }
    } catch (error) {
      addToast(
        `Error enrolling into experiment: ${(error as Error).message ?? String(error)}`,
        "danger",
      );
    }
  }, [jsonInput, setJsonInput, addToast]);

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
    </Container>
  );
};

export default RecipeEnrollmentPage;
