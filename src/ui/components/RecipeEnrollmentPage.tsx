import { ChangeEvent, FC, useState, useCallback } from "react";
import { Form, Container } from "react-bootstrap";

const MainPage: FC = () => {
  const [jsonInput, setJsonInput] = useState("");

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
        console.log("Enrollment successful");
        alert("Enrollment successful");
        setJsonInput("");
      } else {
        console.log("Enrollment failed");
        alert("Enrollment failed");
      }
    } catch (error) {
      console.error(error);
      alert(error);
    }
  }, [jsonInput, setJsonInput]);

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
        <input
          onClick={handleEnrollClick}
          value="Enroll"
          type="submit"
          className="mt-2 py-3 px-4 fs-5 border-0 w-100 rounded text-white"
        />
      </Form>
    </Container>
  );
};

export default MainPage;
