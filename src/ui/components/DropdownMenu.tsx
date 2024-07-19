import { ChangeEvent, FC, useEffect, useState, useCallback } from "react";
import { Form } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

type DropdownMenuProps = {
  onSelectFeatureConfigId: (featureId: string) => void;
};

const DropdownMenu: FC<DropdownMenuProps> = ({ onSelectFeatureConfigId }) => {
  const [featureConfigs, setFeatureConfigs] = useState([]);
  const { addToast } = useToastsContext();

  useEffect(() => {
    void (async () => {
      try {
        const configs = await browser.experiments.nimbus.getFeatureConfigs();
        setFeatureConfigs(configs);
      } catch (error) {
        addToast({
          message: `Error fetching feature configurations: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    })();
  }, [addToast]);

  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    onSelectFeatureConfigId(event.target.value);
  }, []);

  return (
    <Form.Group controlId="featureConfigSelect">
      <Form.Select
        onChange={handleChange}
        className="grey-border rounded mb-2 p-2 ps-3 fs-6 font-monospace"
      >
        <option key={0} value="">
          Select Feature
        </option>
        {featureConfigs.map((featureId: string, index: number) => (
          <option key={index + 1} value={featureId}>
            {featureId}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

export default DropdownMenu;
