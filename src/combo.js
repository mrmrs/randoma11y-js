import {
  getLuminanceY,
  hsl01ToSrgb01,
  linearSrgbFromEncoded,
  parseToSrgb01,
  randomSrgb01,
  toHex,
} from "./color.js";
import { contrast, meetsThreshold } from "./contrast.js";

const RANDOM_ATTEMPTS = 2000;
const FALLBACKS = ["#000000", "#ffffff"];

function shuffledGrid(hueSteps, satSteps, lightSteps) {
  const grid = [];
  for (let h = 0; h < 360; h += 360 / hueSteps) {
    for (let s = 0; s <= 100; s += 100 / satSteps) {
      for (let l = 0; l <= 100; l += 100 / lightSteps) {
        grid.push([h / 360, s / 100, l / 100]);
      }
    }
  }
  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }
  return grid;
}

/**
 * @param {string} targetCss
 * @param {number} threshold
 * @param {import('./contrast.js').ContrastAlgorithm} algorithm
 * @param {0 | 1} colorToGenerateIndex 0 = first color random, 1 = second color random
 * @param {number} maxIterations total budget (random + grid + fallback)
 */
function findColorMeetingThreshold(
  targetCss,
  threshold,
  algorithm,
  colorToGenerateIndex,
  maxIterations
) {
  let iterations = 0;
  let foundHex = null;
  let foundContrast = null;
  let bestContrast = null;
  let bestHex = null;
  const fallbackBudget = Math.min(FALLBACKS.length, maxIterations);
  const searchBudget = Math.max(0, maxIterations - fallbackBudget);

  const test = (candidateHex) => {
    const pair =
      colorToGenerateIndex === 0
        ? [candidateHex, targetCss]
        : [targetCss, candidateHex];
    return contrast(pair[0], pair[1], algorithm);
  };

  const consider = (candidateHex) => {
    const c = test(candidateHex);
    iterations++;
    if (bestContrast === null || Math.abs(c) > Math.abs(bestContrast)) {
      bestContrast = c;
      bestHex = candidateHex;
    }
    if (meetsThreshold(c, algorithm, threshold)) {
      foundHex = candidateHex;
      foundContrast = c;
      return true;
    }
    return false;
  };

  for (let i = 0; i < RANDOM_ATTEMPTS && iterations < searchBudget; i++) {
    const hex = toHex(randomSrgb01());
    if (consider(hex)) break;
  }

  if (!foundHex && iterations < searchBudget) {
    const grid = shuffledGrid(12, 10, 10);
    for (const [h, s, l] of grid) {
      if (iterations >= searchBudget) break;
      const hex = toHex(hsl01ToSrgb01(h, s, l));
      if (consider(hex)) break;
    }
  }

  if (!foundHex && fallbackBudget > 0) {
    for (const fallback of orderFallbacks(targetCss)) {
      if (iterations >= maxIterations) break;
      if (consider(fallback)) break;
    }
  }

  return {
    foundHex: foundHex || bestHex || "#000000",
    iterations,
    contrast: foundContrast ?? bestContrast ?? test("#000000"),
  };
}

function orderFallbacks(targetCss) {
  const luminance = getLuminanceY(linearSrgbFromEncoded(parseToSrgb01(targetCss)));
  return luminance >= 0.5 ? FALLBACKS : [...FALLBACKS].reverse();
}

/**
 * @param {object} o
 * @param {import('./contrast.js').ContrastAlgorithm} o.algorithm
 * @param {number} o.threshold
 * @param {string | null} o.color
 * @param {'background' | 'foreground'} o.role
 * @param {number} o.maxIterations
 */
export function generateCombo(o) {
  const {
    algorithm,
    threshold,
    color,
    role,
    maxIterations,
  } = o;

  if (color == null) {
    let totalIterations = 0;
    let firstHex;
    let secondHex;
    let finalContrast = 0;

    for (let attempt = 0; attempt < 5; attempt++) {
      const baseHex = toHex(randomSrgb01());
      const remaining = Math.max(0, maxIterations - totalIterations);
      const { foundHex, iterations, contrast: c } = findColorMeetingThreshold(
        baseHex,
        threshold,
        algorithm,
        1,
        remaining
      );
      totalIterations += iterations;
      if (meetsThreshold(c, algorithm, threshold)) {
        firstHex = baseHex;
        secondHex = foundHex;
        finalContrast = c;
        break;
      }
    }

    if (!firstHex) {
      const baseHex = toHex(randomSrgb01());
      const remaining = Math.max(0, maxIterations - totalIterations);
      const { foundHex, iterations, contrast: c } = findColorMeetingThreshold(
        baseHex,
        threshold,
        algorithm,
        1,
        remaining
      );
      totalIterations += iterations;
      firstHex = baseHex;
      secondHex = foundHex;
      finalContrast = c;
    }

    return {
      colors: /** @type {[string, string]} */ ([firstHex, secondHex]),
      contrast: finalContrast,
      iterations: totalIterations,
    };
  }

  // Locked color: normalize to hex for stable comparisons
  const parsed = parseToSrgb01(color);
  const targetHex = toHex(parsed);
  const colorToGenerateIndex = role === "background" ? 1 : 0;

  const { foundHex, iterations, contrast: c } = findColorMeetingThreshold(
    targetHex,
    threshold,
    algorithm,
    colorToGenerateIndex,
    maxIterations
  );

  const colors =
    role === "background"
      ? /** @type {[string, string]} */ ([targetHex, foundHex])
      : /** @type {[string, string]} */ ([foundHex, targetHex]);

  return {
    colors,
    contrast: c,
    iterations,
  };
}
