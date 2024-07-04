import { ChangeEvent, FC, useState, useCallback } from "react";
import { Form, Container, Row, Col } from "react-bootstrap";

import DropdownMenu from "./DropdownMenu";

const FeatureConfigPage: FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [isRollout, setIsRollout] = useState(false);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setJsonInput(event.target.value);
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

  const handleEnrollClick = useCallback(async () => {
    if (selectedFeatureId === "") {
      console.log("Invalid Input: Select feature");
      alert("Invalid Input: Select feature");
    } else if (jsonInput === "") {
      console.log("Invalid Input: Enter JSON");
      alert("Invalid Input: Enter JSON");
    } else {
      try {
        const result = await browser.experiments.nimbus.enrollWithFeatureConfig(
          selectedFeatureId,
          JSON.parse(jsonInput) as object,
          isRollout,
        );

        if (result) {
          console.log("Enrollment successful");
          alert("Enrollment successful");
        } else {
          console.log("Enrollment failed");
          alert("Enrollment failed");
        }
      } catch (error) {
        console.error(error);
        alert(error);
      }
    }
  }, [jsonInput, selectedFeatureId, isRollout]);

  return (
    <Container className="main-content p-2">
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
        <input
          type="submit"
          value="Enroll"
          className="mt-2 py-3 px-4 fs-5 border-0 w-100 rounded text-white"
          onClick={handleEnrollClick}
        />
      </Form>
    </Container>
  );
};

export default FeatureConfigPage;
