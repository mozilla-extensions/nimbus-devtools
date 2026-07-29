import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  setupFiles: ["./src/ui/tests/mocks/browser.ts"],
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
