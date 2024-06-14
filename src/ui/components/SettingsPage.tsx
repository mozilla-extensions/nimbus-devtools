import { ChangeEvent, FC, useEffect, useState, useCallback } from "react";

const LIVE_COLLECTION = "nimbus-desktop-experiments";
const PREVIEW_COLLECTION = "nimbus-preview";

const SettingsPage: FC = () => {
  const [collectionId, setCollectionId] = useState("");
  const [customCollection, setCustomCollection] = useState("");
  const [forceSync, setForceSync] = useState(true);

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
        console.error(error);
      }
    })();
  }, []);

  const handleCollectionChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const newCollectionId = event.target.value;
      setCollectionId(newCollectionId);
      if (newCollectionId !== "custom") {
        try {
          await browser.experiments.nimbus.setCollection(newCollectionId);
        } catch (error) {
          console.error(error);
        }
      } else {
        try {
          await browser.experiments.nimbus.setCollection(customCollection);
        } catch (error) {
          console.error(error);
        }
      }
    },
    [customCollection, collectionId, setCollectionId],
  );

  const handleCustomChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const newCustomCollection = event.target.value;
      setCustomCollection(newCustomCollection);
      if (collectionId === "custom") {
        try {
          await browser.experiments.nimbus.setCollection(newCustomCollection);
        } catch (error) {
          console.error(error);
        }
      }
    },
    [collectionId, customCollection, setCustomCollection],
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
    } catch (error) {
      console.error(error);
    }
  }, [forceSync, setForceSync]);

  return (
    <div className="main-content">
      <div className="settings">
        <p className="settings__title">Settings</p>
        <hr className="settings__underline" />
        <p className="settings__radio-group-title">
          Choose experiment collection
        </p>
        <div className="settings__radio-group">
          <label className="settings__radio-label">
            <input
              className="settings__radio"
              type="radio"
              value={LIVE_COLLECTION}
              checked={collectionId === LIVE_COLLECTION}
              onChange={handleCollectionChange}
            />
            Live ({LIVE_COLLECTION})
          </label>
          <label className="settings__radio-label">
            <input
              className="settings__radio"
              type="radio"
              value={PREVIEW_COLLECTION}
              checked={collectionId === PREVIEW_COLLECTION}
              onChange={handleCollectionChange}
            />
            Preview ({PREVIEW_COLLECTION})
          </label>
          <label className="settings__radio-label">
            <input
              className="settings__radio"
              type="radio"
              value="custom"
              checked={
                collectionId !== LIVE_COLLECTION &&
                collectionId !== PREVIEW_COLLECTION
              }
              onChange={handleCollectionChange}
            />
            Custom
            <input
              type="text"
              value={customCollection}
              onChange={handleCustomChange}
              disabled={
                collectionId === LIVE_COLLECTION ||
                collectionId === PREVIEW_COLLECTION
              }
            />
          </label>
        </div>
        <hr className="settings__radio-group-line" />
        <p className="settings__radio-group-title">Re-load experiments</p>
        <div className="settings__radio-group">
          <label className="settings__radio-label">
            <input
              className="settings__radio"
              type="radio"
              value="forceSync"
              checked={forceSync === true}
              onChange={handleForceSyncChange}
            />
            Update with Remote Settings Sync
          </label>
          <label className="settings__radio-label">
            <input
              className="settings__radio"
              type="radio"
              value="no-forceSync"
              checked={forceSync === false}
              onChange={handleForceSyncChange}
            />
            Update without Remote Settings Sync
          </label>
        </div>
        <button className="settings__update-button" onClick={handleUpdateClick}>
          Update
        </button>
        <hr className="settings__radio-group-line" />
      </div>
    </div>
  );
};

export default SettingsPage;
