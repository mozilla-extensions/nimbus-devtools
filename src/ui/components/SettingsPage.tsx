import { ChangeEvent, FC, useEffect, useState, useCallback } from "react";
import { Form, Container, Button, Row, Col } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

const LIVE_COLLECTION = "nimbus-desktop-experiments";
const PREVIEW_COLLECTION = "nimbus-preview";

const SettingsPage: FC = () => {
  const [collectionId, setCollectionId] = useState("");
  const [customCollection, setCustomCollection] = useState("");
  const [forceSync, setForceSync] = useState(true);
  const { addToast } = useToastsContext();

  useEffect(() => {
    void (async () => {
      try {
        const currentCollection =
          await browser.experiments.nimbus.getCurrentCollection();
        setCollectionId(currentCollection);
        if (
          currentCollection !== LIVE_COLLECTION &&
          currentCollection !== PREVIEW_COLLECTION
        ) {
          setCollectionId("custom");
          setCustomCollection(currentCollection);
        }
      } catch (error) {
        addToast({
          message: `Error fetching current collection: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        });
      }
    })();
  }, [addToast]);

  const handleCollectionChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const newCollectionId = event.target.value;
      setCollectionId(newCollectionId);
      if (newCollectionId !== "custom") {
        try {
          await browser.experiments.nimbus.setCollection(newCollectionId);
        } catch (error) {
          addToast({
            message: `Error setting collection: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          });
        }
      } else {
        try {
          await browser.experiments.nimbus.setCollection(customCollection);
        } catch (error) {
          addToast({
            message: `Error setting custom collection: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          });
        }
      }
    },
    [customCollection, collectionId, setCollectionId, addToast],
  );

  const handleCustomChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const newCustomCollection = event.target.value;
      setCustomCollection(newCustomCollection);
      if (collectionId === "custom") {
        try {
          await browser.experiments.nimbus.setCollection(newCustomCollection);
        } catch (error) {
          addToast({
            message: `Error setting custom collection: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          });
        }
      }
    },
    [collectionId, customCollection, setCustomCollection, addToast],
  );

  const handleForceSyncChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setForceSync(event.target.value === "forceSync");
    },
    [],
  );

  const handleUpdateClick = useCallback(async () => {
    try {
      await browser.experiments.nimbus.updateRecipes(forceSync);
      addToast({ message: "Recipes updated successfully", variant: "success" });
    } catch (error) {
      addToast({
        message: `Error updating recipes: ${(error as Error).message ?? String(error)}`,
        variant: "danger",
      });
    }
  }, [forceSync, setForceSync, addToast]);

  return (
    <Container fluid className="main-content py-4 p-2 overflow-hidden">
      <h2 className="primary-fg fw-bold ps-3 fs-3">Settings</h2>
      <hr className="primary-divider ms-3 mb-2 me-2" />
      <Form>
        <Form.Group>
          <Form.Label
            as="legend"
            className="primary-fg fs-5 mt-2 ms-3 mb-3 fw-bold"
          >
            Choose experiment collection
          </Form.Label>
          <Container className="secondary-fg mb-3 ms-2 font-monospace">
            <Form.Check
              type="radio"
              label={`Live (${LIVE_COLLECTION})`}
              value={LIVE_COLLECTION}
              checked={collectionId === LIVE_COLLECTION}
              onChange={handleCollectionChange}
              name="collection"
              id="liveCollection"
              className="mb-3"
            />
            <Form.Check
              type="radio"
              label={`Preview (${PREVIEW_COLLECTION})`}
              value={PREVIEW_COLLECTION}
              checked={collectionId === PREVIEW_COLLECTION}
              onChange={handleCollectionChange}
              name="collection"
              id="previewCollection"
              className="mb-2"
            />
            <Container className="d-flex align-items-center ps-0">
              <Form.Check
                type="radio"
                label="Custom"
                value="custom"
                checked={
                  ![LIVE_COLLECTION, PREVIEW_COLLECTION].includes(collectionId)
                }
                onChange={handleCollectionChange}
                name="collection"
                id="customCollection"
                className="mb-2 me-3 mt-2"
              />
              <Row className="mt-2">
                <Col md={12}>
                  <Form.Control
                    type="text"
                    value={customCollection}
                    onChange={handleCustomChange}
                    disabled={
                      collectionId === LIVE_COLLECTION ||
                      collectionId === PREVIEW_COLLECTION
                    }
                    className="font-monospace fs-6"
                  />
                </Col>
              </Row>
            </Container>
          </Container>
        </Form.Group>
        <hr className="section-line ms-3 mb-2 me-2" />
        <Form.Group>
          <Form.Label
            as="legend"
            className="primary-fg fs-5 mt-2 ms-3 mb-3 fw-bold"
          >
            Re-load experiments
          </Form.Label>
          <Container className="secondary-fg mb-3 ms-2 font-monospace">
            <Form.Check
              type="radio"
              label="Update with Remote Settings Sync"
              value="forceSync"
              checked={forceSync}
              onChange={handleForceSyncChange}
              name="sync"
              id="forceSync"
              className="mb-3"
            />
            <Form.Check
              type="radio"
              label="Update without Remote Settings Sync"
              value="no-forceSync"
              checked={!forceSync}
              onChange={handleForceSyncChange}
              name="sync"
              id="noForceSync"
            />
          </Container>
        </Form.Group>
        <Button
          onClick={handleUpdateClick}
          className="option-button primary-fg px-4 py-1 ms-3 rounded fw-bold grey-border light-bg"
        >
          Update
        </Button>
        <hr className="section-line ms-3 mb-2 me-2" />
      </Form>
    </Container>
  );
};

export default SettingsPage;
