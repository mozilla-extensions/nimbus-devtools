import * as React from "react";
import { useState, useCallback, ChangeEvent } from "react";

const MainPage: React.FC = () => {
  const [jsonInput, setJsonInput] = useState("");

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setJsonInput(event.target.value);
    },
    [],
  );

  const handleEnrollClick = useCallback(async () => {
    const jsonData = jsonInput;
    try {
      const result = await browser.experiments.nimbus.enrollInExperiment(
        JSON.parse(jsonData) as object,
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
    <div className="main-content">
      <textarea
        value={jsonInput}
        onChange={handleInputChange}
        placeholder="Enter JSON here"
        className="json-input"
      />
      <button onClick={handleEnrollClick} className="enroll-button">
        Enroll
      </button>
    </div>
  );
};

export default MainPage;
