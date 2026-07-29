/**
 * Mocks for the APIs exposed by this web extension.
 */
import { Jexl } from "mozjexl";

const jexl = new Jexl();

jexl.addBinaryOp("intersect", 40, (a: unknown, b: unknown) => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return undefined;
  }

  return (a as unknown[]).filter((item) => (b as unknown[]).includes(item));
});

jexl.addTransforms({ preferenceValue: () => null });

(globalThis as Record<string, unknown>).browser = {
  experiments: {
    nimbus: {
      evaluateJEXL: (expr: string, ctx: Record<string, unknown>) =>
        jexl.eval(expr, ctx),
    },
  },
};
