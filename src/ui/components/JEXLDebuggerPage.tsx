import {
  ChangeEvent,
  FC,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import { evaluateJexl } from "../jexlParser";

const JEXLDebuggerPage: FC = () => {
  const [clientContext, setClientContext] = useState({});
  const [jexlExpression, setJexlExpression] = useState("");
  const [output, setOutput] = useState("");

  const fetchClientContext = useCallback(async () => {
    try {
      const context = await browser.experiments.nimbus.getClientContext();
      setClientContext(context);
    } catch (error) {
      console.error("Error fetching client context:", error);
    }
  }, []);

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
      console.error(error);
      setOutput("Error evaluating expression");
    }
  }, [jexlExpression, clientContext]);

  const memoizedClientContextEntries = useMemo(
    () => Object.entries(clientContext),
    [clientContext],
  );

  return (
    <div className="main-content">
      <div className="jexl-debugger">
        <div className="jexl-debugger__section">
          <h2 className="jexl-debugger__section-title">
            JEXL Filter Expression
          </h2>
          <textarea
            value={jexlExpression}
            onChange={handleExpressionChange}
            placeholder="Enter JEXL expression here"
            className="jexl-debugger__expression-input"
          />
          <button
            onClick={handleEvaluateClick}
            className="jexl-debugger__evaluate-button"
          >
            Evaluate
          </button>
        </div>
        <div className="jexl-debugger__section">
          <h2 className="jexl-debugger__section-title">Output</h2>
          <pre>{output}</pre>
        </div>
        <div className="jexl-debugger__section">
          <h2 className="jexl-debugger__section-title">Client Context</h2>
          <button
            onClick={fetchClientContext}
            className="jexl-debugger__section-button"
          >
            Refresh Context
          </button>
          {memoizedClientContextEntries.map(([key, value]) => (
            <div key={key} className="jexl-debugger__client-context-item">
              <p className="jexl-debugger__client-context-title">{key}</p>
              {typeof value === "number" ||
              typeof value === "string" ||
              typeof value === "boolean" ? (
                <input
                  type="text"
                  className="jexl-debugger__client-context-value-input"
                  readOnly
                  value={String(value)}
                />
              ) : (
                <textarea
                  className="jexl-debugger__client-context-value-text-area"
                  readOnly
                  value={JSON.stringify(value, null, 2)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JEXLDebuggerPage;
