const SUPPORTED_ALGORITHMS = new Set([
  "APCA",
  "WCAG21",
  "Michelson",
  "Weber",
  "Lstar",
  "deltaPhi",
]);

export function assertAlgorithm(algorithm) {
  if (!SUPPORTED_ALGORITHMS.has(algorithm)) {
    throw new TypeError(`Unknown contrast algorithm: ${algorithm}`);
  }
  return algorithm;
}

export function normalizeThreshold(threshold) {
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new TypeError(
      `threshold must be a finite number greater than or equal to 0, got ${threshold}`
    );
  }
  return threshold;
}

export function normalizeMaxIterations(maxIterations) {
  if (!Number.isSafeInteger(maxIterations) || maxIterations < 1) {
    throw new TypeError(
      `maxIterations must be a positive safe integer, got ${maxIterations}`
    );
  }
  return maxIterations;
}
