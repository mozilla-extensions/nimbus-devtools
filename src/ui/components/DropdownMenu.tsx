import { ChangeEvent, FC, useEffect, useState, useCallback } from "react";

type DropdownMenuProps = {
  onSelectFeatureConfigId: (featureId: string) => void;
};

const DropdownMenu: FC<DropdownMenuProps> = ({ onSelectFeatureConfigId }) => {
  const [featureConfigs, setFeatureConfigs] = useState([]);

  useEffect(() => {
    void (async () => {
      try {
        const configs = await browser.experiments.nimbus.getFeatureConfigs();
        setFeatureConfigs(configs);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    onSelectFeatureConfigId(event.target.value);
  }, []);

  return (
    <div>
      <select className="dropdown-button" onChange={handleChange}>
        <option key={0} value="">
          Select Feature
        </option>
        {featureConfigs.map((featureId: string, index) => (
          <option key={index + 1} value={featureId}>
            {featureId}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropdownMenu;
