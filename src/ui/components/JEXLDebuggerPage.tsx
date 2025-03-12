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
import { debounce } from "../utils/functional";

type ContextValue = object | string | boolean | number | Date;
type FieldType = "object" | "string" | "boolean" | "number" | "Date";
type FormDataValue = string | boolean;

type OnChangeFn = {
  (key: string, value: boolean, fieldType: "boolean"): void;
  (key: string, value: string, fieldType: Exclude<FieldType, "boolean">): void;
};

type ContextFieldProps<TValue extends FormDataValue> = {
  fieldType: TValue extends boolean ? "boolean" : Exclude<FieldType, "boolean">;
  onChange: OnChangeFn;
  contextKey: string;
  value: TValue;
};

const getFieldType = (value: ContextValue): FieldType => {
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      if (value instanceof Date) {
        return "Date";
      } else {
        return "object";
      }
  }
};

function ContextField<TValue extends FormDataValue>({
  fieldType,
  onChange,
  contextKey,
  value,
}: ContextFieldProps<TValue>) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (fieldType === "boolean") {
        onChange(contextKey, (e.target as HTMLInputElement).checked, fieldType);
      } else {
        onChange(contextKey, e.target.value, fieldType);
      }
    },
    [onChange, contextKey, fieldType],
  );

  switch (fieldType) {
    case "number":
      return (
        <Form.Control
          type="number"
          value={value as string}
          onChange={handleChange}
          className="p-3 w-50 grey-border short-text"
        />
      );

    case "string":
      return (
        <Form.Control
          type="text"
          value={value as string}
          onChange={handleChange}
          className="p-3 w-50 grey-border short-text"
        />
      );

    case "boolean":
      return (
        <Form.Check
          type="checkbox"
          checked={value as boolean}
          onChange={handleChange}
          className="p-3 w-50 ms-4 ps-5 mb-2 large-checkbox short-text"
        />
      );

    case "Date":
      return (
        <Form.Control
          type="datetime-local"
          step="1"
          value={value as string}
          onChange={handleChange}
          className="p-3 w-50 grey-border short-text"
        />
      );

    case "object":
      return (
        <Form.Control
          as="textarea"
          value={value as string}
          onChange={handleChange}
          className="p-3 w-50 grey-border long-text"
          placeholder="null"
        />
      );

    default:
      return null;
  }
}

const JEXLDebuggerPage: FC = () => {
  const [originalContext, setOriginalContext] = useState<
    Record<string, ContextValue>
  >({});
  const [modifiedContext, setModifiedContext] = useState<
    Record<string, ContextValue>
  >({});
  const [formData, setFormData] = useState<Record<string, FormDataValue>>({});
  const [jexlExpression, setJexlExpression] = useState("");
  const [output, setOutput] = useState("");
  const { addToast } = useToastsContext();

  const fetchClientContext = useCallback(async () => {
    try {
      const context =
        (await browser.experiments.nimbus.getClientContext()) as Record<
          string,
          ContextValue
        >;
      setOriginalContext(context);
      setModifiedContext({});
      setFormData(
        Object.fromEntries(
          Object.entries(context).map(([key, value]) => {
            let formValue: FormDataValue;
            const fieldType = getFieldType(value);

            switch (fieldType) {
              case "string":
                formValue = value as string;
                break;
              case "boolean":
                formValue = value as boolean;
                break;
              case "number":
                formValue = (value as number).toString();
                break;
              case "Date":
                formValue = (value as Date).toISOString().slice(0, 19);
                break;
              case "object":
                formValue = JSON.stringify(value, null, 2);
                break;
            }
            return [key, formValue];
          }),
        ),
      );
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
        const result = await evaluateJexl(jexlExpression, {
          ...originalContext,
          ...modifiedContext,
        });
        setOutput(result);
      }
    } catch (error) {
      setOutput("Error evaluating expression");
      addToast({
        message: `Error evaluating expression: ${(error as Error).message ?? String(error)}`,
        variant: "danger",
      });
    }
  }, [jexlExpression, modifiedContext, originalContext, addToast]);

  const parseAndSetContext = useMemo(() => {
    return debounce((key: string, value: string, isNumber: boolean) => {
      if (isNumber) {
        const numVal = parseInt(value);
        if (!isNaN(numVal)) {
          setModifiedContext((prevContext) => ({
            ...prevContext,
            [key]: numVal,
          }));
        } else {
          addToast({
            message: "Error changing context: Value entered must be a number",
            variant: "danger",
          });
        }
      } else {
        try {
          const parsedValue = JSON.parse(value) as ContextValue;
          setModifiedContext((prevContext) => ({
            ...prevContext,
            [key]: parsedValue,
          }));
        } catch (error) {
          addToast({
            message: `Error changing context: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          });
        }
      }
    }, 1000);
  }, [addToast, setModifiedContext]);

  const handleContextChange = useCallback<OnChangeFn>(
    (key: string, value: FormDataValue, fieldType: FieldType) => {
      switch (fieldType) {
        case "object":
          parseAndSetContext(key, String(value), false);
          break;

        case "number":
          parseAndSetContext(key, String(value), true);
          break;

        case "boolean":
          setModifiedContext((prevContext) => ({
            ...prevContext,
            [key]: value,
          }));
          break;

        case "Date":
          setModifiedContext((prevContext) => ({
            ...prevContext,
            [key]: new Date(value as string),
          }));
          break;

        case "string":
          setModifiedContext((prevContext) => ({
            ...prevContext,
            [key]: value,
          }));
          break;
      }
      setFormData((prevContext) => ({
        ...prevContext,
        [key]: value,
      }));
    },
    [setModifiedContext, setFormData, parseAndSetContext],
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
            Reset Context
          </Button>
          {Object.entries(originalContext).map(([key]) => (
            <Row key={key} className="mb-4 d-flex align-items-center">
              <Col xs={3} className="secondary-fg fw-bold">
                {key}
              </Col>
              <Col xs={9}>
                <ContextField
                  contextKey={key}
                  value={formData[key]}
                  onChange={handleContextChange}
                  fieldType={getFieldType(originalContext[key])}
                />
              </Col>
            </Row>
          ))}
        </Col>
      </Row>
    </Container>
  );
};

export default JEXLDebuggerPage;
