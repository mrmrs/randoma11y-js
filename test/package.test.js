import assert from "node:assert/strict";
import Color from "colorjs.io";

import {
  applyCssVariables,
  contrast,
  meetsThreshold,
  randoma11y,
  resolveCssVariablesOption,
} from "../src/index.js";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("contrast stays numerically aligned with colorjs.io", () => {
  const pairs = [
    ["#000000", "#ffffff"],
    ["#336699", "#f4efd6"],
    ["rgb(10 20 30)", "hsl(20 90% 50%)"],
    ["#abc", "#123456"],
    ["white", "black"],
  ];

  for (const algorithm of [
    "APCA",
    "WCAG21",
    "Michelson",
    "Weber",
    "Lstar",
    "deltaPhi",
  ]) {
    for (const [background, foreground] of pairs) {
      assert.equal(
        contrast(background, foreground, algorithm),
        Color.contrast(background, foreground, algorithm)
      );
    }
  }
});

test("locked-color fallback stays finite and meets low-budget WCAG thresholds", () => {
  const result = randoma11y({
    color: "#336699",
    role: "background",
    algorithm: "WCAG21",
    threshold: 4.5,
    maxIterations: 2,
  });

  assert.equal(Number.isFinite(result.contrast), true);
  assert.equal(result.iterations <= 2, true);
  assert.equal(result.algorithm, "WCAG21");
  assert.equal(result.threshold, 4.5);
  assert.equal(typeof result.meetsThreshold, "boolean");
  assert.equal(meetsThreshold(result.contrast, "WCAG21", 4.5), true);
  assert.equal(result.meetsThreshold, true);
});

test("small iteration budgets never return infinite contrast", () => {
  for (let i = 0; i < 25; i++) {
    const result = randoma11y({ maxIterations: 10 });
    assert.equal(Number.isFinite(result.contrast), true);
    assert.equal(result.iterations <= 10, true);
    assert.equal(result.algorithm, "APCA");
    assert.equal(result.threshold, 75);
    assert.equal(typeof result.meetsThreshold, "boolean");
  }
});

test("invalid public options fail fast", () => {
  assert.throws(
    () => randoma11y({ threshold: Number.NaN }),
    /threshold must be a finite number/
  );
  assert.throws(
    () => randoma11y({ maxIterations: 0 }),
    /maxIterations must be a positive safe integer/
  );
  assert.throws(
    () => randoma11y({ cssVariables: "yes" }),
    /cssVariables must be true, false, null, or an options object/
  );
  assert.throws(
    () => randoma11y({ cssVariables: { target: {} } }),
    /cssVariables\.target must be null or an object with style\.setProperty/
  );
});

test("css variable helpers support DOM-like targets and normalize names", () => {
  const applied = [];
  const target = {
    style: {
      setProperty(name, value) {
        applied.push([name, value]);
      },
    },
  };

  const resolved = resolveCssVariablesOption({
    target,
    names: ["bg", "--fg"],
  });

  assert.deepEqual(resolved, {
    target,
    color1: "--bg",
    color2: "--fg",
  });

  assert.equal(
    applyCssVariables(target, resolved.color1, resolved.color2, [
      "#112233",
      "#ddeeff",
    ]),
    true
  );

  assert.deepEqual(applied, [
    ["--bg", "#112233"],
    ["--fg", "#ddeeff"],
  ]);
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures++;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`${failures} test${failures === 1 ? "" : "s"} failed`);
  process.exitCode = 1;
} else {
  console.log(`${tests.length} tests passed`);
}
