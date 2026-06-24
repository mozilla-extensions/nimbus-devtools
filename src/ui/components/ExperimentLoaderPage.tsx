import { ChangeEvent, FC, useEffect, useState, useCallback } from "react";
import { Form, Container, Button, Alert } from "react-bootstrap";

import { useToastsContext } from "../hooks/useToasts";

const LIVE_COLLECTION = "nimbus-desktop-experiments";
const PREVIEW_COLLECTION = "nimbus-preview";

const ExperimentLoaderPage: FC = () => {
  const { addToast } = useToastsContext();
  const [collectionState, setCollectionState] =
    useState<CurrentCollection | null>(null);

  const isInvalidCollection = collectionState
    ? ![LIVE_COLLECTION, PREVIEW_COLLECTION].includes(
        collectionState.prefValue,
      ) ||
      ![LIVE_COLLECTION, PREVIEW_COLLECTION].includes(
        collectionState.cachedValue,
      )
    : false;

  const restartRequired =
    !!collectionState &&
    !isInvalidCollection &&
    collectionState.cachedValue !== collectionState.prefValue;

  const disabled = !collectionState || isInvalidCollection;

  useEffect(() => {
    void browser.experiments.nimbus.getCurrentCollection().then(
      (collectionState) => setCollectionState(collectionState),
      (error) =>
        addToast({
          message: `Error fetching current collection: ${(error as Error).message ?? String(error)}`,
          variant: "danger",
        }),
    );
  }, [addToast]);

  const handleCollectionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newCollectionId = event.target.checked
        ? PREVIEW_COLLECTION
        : LIVE_COLLECTION;
      void browser.experiments.nimbus.setCollection(newCollectionId).then(
        () =>
          setCollectionState((currentCollectionState) =>
            currentCollectionState
              ? { ...currentCollectionState, prefValue: newCollectionId }
              : null,
          ),
        (error) => {
          addToast({
            message: `Error setting collection: ${(error as Error).message ?? String(error)}`,
            variant: "danger",
          });
        },
      );
    },
    [addToast],
  );

  const handleUpdateClick = useCallback(async () => {
    try {
      await browser.experiments.nimbus.updateRecipes();
      addToast({ message: "Recipes updated successfully", variant: "success" });
    } catch (error) {
      addToast({
        message: `Error updating recipes: ${(error as Error).message ?? String(error)}`,
        variant: "danger",
      });
    }
  }, [addToast]);

  return (
    <Container
      fluid
      className="main-content py-4 p-2 ms-3 me-2 overflow-hidden"
    >
      <h2 className="primary-fg fw-bold fs-3">Experiment Loader</h2>
      <hr className="primary-divider mb-2 " />
      {isInvalidCollection && (
        <Alert variant="warning">
          <Alert.Heading>
            The specified collection ID is not supported by Nimbus.
          </Alert.Heading>
          <p className="mb-0">
            You should reset the{" "}
            <code>messaging-system.rsexperimentloader.collection_id</code> pref
            via <code>about:config</code> and restart your browser or Nimbus may
            not work correctly.
          </p>
        </Alert>
      )}
      {restartRequired && (
        <Alert variant="info">
          <Alert.Heading>Restart Required</Alert.Heading>
          <p className="mb-0">
            The default Nimbus collection has changed. This will not take effect
            without a browser restart.
          </p>
        </Alert>
      )}
      <Form.Group>
        <Form.Label as="legend" className="primary-fg fs-5 mt-2 mb-3 fw-bold">
          Update Experiments
        </Form.Label>
        <p>This will force Nimbus to re-evaluate all available experiments.</p>
        <Button
          onClick={handleUpdateClick}
          className="option-button primary-fg px-4 py-1 rounded fw-bold grey-border light-bg"
          disabled={disabled}
        >
          Update
        </Button>
      </Form.Group>
      <hr className="section-line ms-3 mb-2 me-2" />
      <Form.Group>
        <Form.Label as="legend" className="primary-fg fs-5 mt-2 mb-3 fw-bold">
          Experiment Collection
        </Form.Label>
        <p>
          You can change the Remote Settings collection that Nimbus will use as
          its default experiment collection. Changing the collection requires a
          browser restart.
        </p>
        <p>
          The collection used for secure experiments{" "}
          <strong>cannot be changed</strong>. To test secure experiments, create
          a new profile using the Remote Settings staging instance.
        </p>
        <Form.Check
          type="checkbox"
          name="collection"
          id="collection"
          className="mb-3"
        >
          <Form.Check.Input
            onChange={handleCollectionChange}
            checked={collectionState?.prefValue === PREVIEW_COLLECTION}
            type="checkbox"
            disabled={disabled}
          />
          <Form.Check.Label>Use the preview collection</Form.Check.Label>
        </Form.Check>
      </Form.Group>
    </Container>
  );
};

export default ExperimentLoaderPage;
