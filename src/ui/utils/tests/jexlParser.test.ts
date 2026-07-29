import { describe, expect, test } from "@jest/globals";

import {
  debugJexl,
  evaluateExpression,
  getExpression,
  parseJexl,
  quoteString,
} from "../jexlParser";

test("quoteString", () => {
  expect(quoteString("hello")).toEqual(`"hello"`);
  expect(quoteString("hello 'world'")).toEqual(`"hello 'world'"`);
  expect(quoteString('hello "world"')).toEqual(`'hello "world"'`);
  expect(quoteString(`"'`)).toEqual(`"\\"'"`);
  expect(quoteString(`'"`)).toEqual(`'\\'"'`);
  expect(quoteString(`'" \\' "'`)).toEqual(`"'\\" \\' \\"'"`);
  expect(quoteString(`"'"`)).toEqual(`'"\\'"'`);
});

test("evaluateExpression", async () => {
  expect(await evaluateExpression("true", {})).toEqual(true);
  expect(await evaluateExpression("false", {})).toEqual(false);
  expect(await evaluateExpression("x", { x: 123 })).toEqual(123);
  expect(await evaluateExpression("x && y", { x: true, y: false })).toEqual(
    false,
  );
  expect(await evaluateExpression("x || y", { x: true, y: false })).toEqual(
    true,
  );
});

describe("debugJexl", () => {
  function computeValue(expr: string, ctx: Record<string, unknown> = {}) {
    return debugJexl(expr, ctx).then((result) => result.value);
  }

  function collectFalseExprs(expr: string, ctx: Record<string, unknown> = {}) {
    return debugJexl(expr, ctx).then((result) => result.falseExprs);
  }

  function collectPrefs(expr: string, ctx: Record<string, unknown> = {}) {
    return debugJexl(expr, ctx).then((result) => result.prefs);
  }

  function collectAttrs(expr: string, ctx: Record<string, unknown> = {}) {
    return debugJexl(expr, ctx).then((result) => result.attrs);
  }

  test("supports undefined", async () => {
    expect(await computeValue("undefined")).toEqual("undefined");
  });

  test("formats objects", async () => {
    expect(await computeValue("{ x: 123, y: 456 }")).toEqual(
      `{\n  "x": 123,\n  "y": 456\n}`,
    );
  });

  test("quotes strings", async () => {
    expect(await computeValue(`"hello, world"`)).toEqual(`"hello, world"`);
    expect(await computeValue(`"hello, 'world'"`)).toEqual(`"hello, 'world'"`);
    expect(await computeValue(`'hello, "world"'`)).toEqual(`'hello, "world"'`);
  });

  test("collects false exprs", async () => {
    expect(await collectFalseExprs("false")).toEqual(["false"]);
    expect(await collectFalseExprs("false && false")).toEqual([
      "false",
      "false",
    ]);
    expect(await collectFalseExprs("false && !true")).toEqual([
      "false",
      "!(true)",
    ]);
    expect(await collectFalseExprs("x", { x: false })).toEqual(["x"]);
    // TODO(#253): x == 0 should not be collected
    expect(
      await collectFalseExprs("false && xs[.x == 0]", {
        xs: [{ x: 0, v: false }],
      }),
    ).toEqual(["false", "x == 0"]);
    // TODO(#256): `xs[.x == 0].v` should be collected.
    expect(
      await collectFalseExprs("false && xs[.x == 0].v", {
        xs: [{ x: 0, v: false }],
      }),
    ).toEqual(["false"]);
  });

  test("collects prefs", async () => {
    expect(await collectPrefs("true")).toEqual(new Set());
    expect(await collectPrefs("'nimbus.debug'|preferenceValue")).toEqual(
      new Set(["nimbus.debug"]),
    );
    expect(
      await collectPrefs("x|preferenceValue", { x: "nimbus.debug" }),
    ).toEqual(new Set());
  });

  test("collects attrs", async () => {
    expect(
      await collectAttrs("d.e intersect f.g", {
        d: { e: [1, 2, 3] },
        f: { g: [2, 3, 4] },
      }),
    ).toEqual(new Set(["d", "f"]));
    // TODO(#251): This should be { x, y, d, f }
    expect(
      await collectAttrs("x && y.z && ((d.e intersect f.g).length > 0)", {
        x: true,
        y: { z: false },
        d: { e: [1, 2, 3] },
        f: { g: [2, 3, 4] },
      }),
    ).toEqual(new Set(["x", "y"]));
    // TODO(#252): This should not contain foo.
    expect(
      await collectAttrs("xs[.foo == 1]", { xs: [{ foo: 1 }, { foo: 2 }] }),
    ).toEqual(new Set(["xs", "foo"]));
  });
});

describe("getExpression", () => {
  function roundTripExpression(expr: string) {
    const ast = parseJexl(expr);
    return getExpression(ast);
  }

  test("binary/logical expressions", () => {
    expect(roundTripExpression("a intersect b")).toEqual("a intersect b");
    expect(roundTripExpression("a + b")).toEqual("a + b");
    expect(roundTripExpression("a && b")).toEqual("a && b");
    expect(roundTripExpression("(a == b) && true")).toEqual("(a == b) && true");
    expect(roundTripExpression("[1, 2] intersect [2, 3]")).toEqual(
      "[1, 2] intersect [2, 3]",
    );
    expect(roundTripExpression("a + b + c + d")).toEqual("((a + b) + c) + d");
    expect(roundTripExpression("a + b + (c + d)")).toEqual("(a + b) + (c + d)");
  });

  test("unary expressions", () => {
    expect(roundTripExpression("!x")).toEqual("!(x)");
  });

  test("transforms", () => {
    expect(roundTripExpression("foo|bar")).toEqual("foo|bar");
    expect(roundTripExpression("foo|bar(baz, qux)")).toEqual(
      "foo|bar(baz, qux)",
    );
  });

  test("filter expressions", () => {
    expect(roundTripExpression("xs[0]")).toEqual("xs[0]");
    // TODO(#254): This should round-trip.
    expect(roundTripExpression("xs[.x == 1]")).toEqual("xs[x == 1]");
  });

  test("literals", () => {
    expect(roundTripExpression("123")).toEqual("123");
    expect(roundTripExpression("'hello'")).toEqual(`"hello"`);
    expect(roundTripExpression(`"hello 'world'"`)).toEqual(`"hello 'world'"`);
    expect(roundTripExpression(`'hello \\'world\\' "123"'`)).toEqual(
      `'hello \\'world\\' "123"'`,
    );
  });

  test("identifiers", () => {
    expect(roundTripExpression("x")).toEqual("x");
    expect(roundTripExpression("x.y")).toEqual("x.y");
    expect(roundTripExpression("x.y.z")).toEqual("x.y.z");
    // TODO(#255): This should round-trip.
    expect(roundTripExpression("(a intersect b).length")).toEqual(
      "a intersect b.length",
    );
  });

  test("array literals", () => {
    expect(roundTripExpression("[]")).toEqual("[]");
    expect(roundTripExpression("[1, 2, 3]")).toEqual("[1, 2, 3]");
  });

  test("object literals", () => {
    expect(roundTripExpression("{}")).toEqual("{  }");
    expect(roundTripExpression("{ a: 1 }")).toEqual("{ a: 1 }");
    expect(roundTripExpression("{ a: { b: 1 } }")).toEqual("{ a: { b: 1 } }");
  });
});
