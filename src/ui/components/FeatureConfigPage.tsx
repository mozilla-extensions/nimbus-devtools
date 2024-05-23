import { ChangeEvent, FC, useState, useCallback } from "react";

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
  }, [jsonInput, setJsonInput, selectedFeatureId]);

  return (
    <div className="main-content">
      <div className="options">
        <div className="options__dropdown">
          <DropdownMenu onSelectFeatureConfigId={handleFeatureSelect} />
        </div>
        <div className="options__checkbox-background">
          <label className="options__checkbox-label">
            <input
              type="checkbox"
              checked={isRollout}
              onChange={handleCheckboxChange}
              className="options__checkbox"
            />
            isRollout
          </label>
        </div>
      </div>
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

export default FeatureConfigPage;
