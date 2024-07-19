import {
  ChangeEvent,
  FC,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";
import { evaluateJexl } from "../jexlParser";

const JEXLDebuggerPage: FC = () => {
  const [clientContext, setClientContext] = useState({});
  const [jexlExpression, setJexlExpression] = useState("");
  const [output, setOutput] = useState("");
  const { addToast } = useToastsContext();

  const fetchClientContext = useCallback(async () => {
    try {
      const context = await browser.experiments.nimbus.getClientContext();
      setClientContext(context);
    } catch (error) {
      addToast({
        message: `Error fetching client context: ${(error as Error).message ?? String(error)}`,
        variant: "danger",
      });
    }
  }, [addToast]);

  useEffect(() => {
    void fetchClientContext();
  }, []);

  const handleExpressionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setJexlExpression(event.target.value);
    },
    [],
  );

  const handleEvaluateClick = useCallback(async () => {
    try {
      if (jexlExpression === "") {
        setOutput("Error evaluating expression");
      } else {
        const result = await evaluateJexl(jexlExpression, clientContext);
        setOutput(result);
      }
    } catch (error) {
      setOutput("Error evaluating expression");
      addToast({
        message: `Error evaluating expression: ${(error as Error).message ?? String(error)}`,
        variant: "danger",
      });
    }
  }, [jexlExpression, clientContext, addToast]);

  const memoizedClientContextEntries = useMemo(
    () => Object.entries(clientContext),
    [clientContext],
  );

  return (
    <Container className="main-content">
      <Row className="justify-content-start pb-2 px-2 pt-3">
        <Col>
          <h2 className="primary-fg fs-4 mb-3">JEXL Filter Expression</h2>
          <Form.Control
            as="textarea"
            value={jexlExpression}
            onChange={handleExpressionChange}
            placeholder="Enter JEXL expression here"
            className="text-input rounded p-3 font-monospace fs-6 grey-border"
            rows={8}
          />
          <Button
            onClick={handleEvaluateClick}
            className="mt-2 py-2 px-4 fs-6 border-0 w-100 rounded text-white dark-button"
          >
            Evaluate
          </Button>
        </Col>
      </Row>
      <hr className="section-line mx-2 mb-2 mt-1" />
      <Row className="justify-content-start p-2">
        <Col>
          <h2 className="primary-fg fs-4 mb-3">Output</h2>
          <pre className="fs-6 mb-3">{output}</pre>
        </Col>
      </Row>
      <hr className="section-line mx-2 mb-2 mt-0" />
      <Row className="justify-content-start pb-2 px-2 pt-1">
        <Col>
          <h2 className="primary-fg fs-4 mb-3">Client Context</h2>
          <Button
            onClick={fetchClientContext}
            className="option-button primary-fg py-2 px-3 rounded small-font fw-bold mb-3 grey-border light-bg"
          >
            Refresh Context
          </Button>
          {memoizedClientContextEntries.map(([key, value]) => (
            <Row key={key} className="mb-4 d-flex align-items-center">
              <Col xs={3} className="secondary-fg fw-bold">
                {key}
              </Col>
              <Col xs={9}>
                {["number", "string", "boolean"].includes(typeof value) ? (
                  <Form.Control
                    type="text"
                    readOnly
                    value={String(value)}
                    className="p-3 w-50 grey-border short-text"
                  />
                ) : (
                  <Form.Control
                    as="textarea"
                    readOnly
                    value={JSON.stringify(value, null, 2)}
                    className="p-3 w-50 grey-border long-text"
                  />
                )}
              </Col>
            </Row>
          ))}
        </Col>
      </Row>
    </Container>
  );
};

export default JEXLDebuggerPage;
