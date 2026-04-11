/**
 * randoma11y — generate accessible two-color combinations (same contrast models as colorjs.io, inlined).
 *
 * @module randoma11y
 */

import { generateCombo } from "./combo.js";
import { meetsThreshold as _meetsThreshold } from "./contrast.js";
import {
  applyCssVariables,
  resolveCssVariablesOption,
} from "./cssVariables.js";
import {
  assertAlgorithm,
  normalizeMaxIterations,
  normalizeThreshold,
} from "./options.js";

/** @typedef {import('./contrast.js').ContrastAlgorithm} ContrastAlgorithm */

/**
 * @typedef {object} Randoma11yOptions
 * @property {ContrastAlgorithm} [algorithm='APCA']
 * @property {number} [threshold=75]
 * @property {string} [color] If set, generates a partner for this color (see `role`).
 * @property {'background' | 'foreground'} [role='background'] When `color` is set: treat it as background (default) or foreground; the other slot is generated.
 * @property {number} [maxIterations=20000] Total search steps (random HSL grid + fallbacks share this budget).
 * @property {boolean | Randoma11yCssVariables} [cssVariables] When truthy, assigns `colors[0]` and `colors[1]` to CSS custom properties on a target element (default `document.documentElement`). In environments without `document`, nothing is set (`cssVariables.applied` is false).
 */

/**
 * @typedef {object} Randoma11yCssVariables
 * @property {Element | null} [target] Element to call `style.setProperty` on. Defaults to `document.documentElement` in browsers.
 * @property {string} [color1] First variable name (background). Default `--randoma11y-color-1`. Names without a `--` prefix get it added.
 * @property {string} [color2] Second variable name (foreground). Default `--randoma11y-color-2`.
 * @property {[string, string]} [names] Shorthand for `[color1, color2]`.
 */

/**
 * @typedef {object} Randoma11yResult
 * @property {[string, string]} colors `[background, foreground]` as hex strings.
 * @property {number} contrast Raw contrast value for the chosen algorithm (see `contrast()`).
 * @property {ContrastAlgorithm} algorithm The algorithm used for this result.
 * @property {number} threshold The threshold that was requested.
 * @property {boolean} meetsThreshold Whether `contrast` meets `threshold` for `algorithm`.
 * @property {number} iterations Search steps used.
 * @property {Randoma11yCssVariablesResult} [cssVariables] Present when `cssVariables` was requested.
 */

/**
 * @typedef {object} Randoma11yCssVariablesResult
 * @property {boolean} applied Whether `setProperty` ran (false if no DOM target).
 * @property {[string, string]} names The variable names used for color 1 and color 2.
 * @property {Element | null} target Element that received the properties, if any.
 */

/**
 * Generate an accessible **[background, foreground]** pair as hex strings.
 *
 * Naming: **`randoma11y`** matches the package name (`randoma11y` on npm). You can alias it locally
 * (`import { randoma11y as randomAccessiblePair } from 'randoma11y'`) if you prefer descriptive names.
 *
 * @param {Randoma11yOptions | string} [options] Options object, or a CSS color string shorthand for `{ color }`.
 * @returns {Randoma11yResult}
 *
 * @example
 * randoma11y()
 * randoma11y({ threshold: 90 })
 * randoma11y({ color: '#336699', role: 'background' })
 * randoma11y('#e2b714') // shorthand for { color: '#e2b714' }
 * randoma11y({ cssVariables: true }) // sets --randoma11y-color-1 / --randoma11y-color-2 on :root
 * randoma11y({ cssVariables: { target: document.body, names: ['--bg', '--fg'] } })
 */
export function randoma11y(options) {
  const opts =
    typeof options === "string"
      ? { color: options }
      : options && typeof options === "object"
        ? options
        : {};

  const algorithm = assertAlgorithm(opts.algorithm ?? "APCA");
  const threshold = normalizeThreshold(opts.threshold ?? 75);
  const color = opts.color ?? null;
  const role = opts.role ?? "background";
  const maxIterations = normalizeMaxIterations(opts.maxIterations ?? 20000);
  const cssOpt = opts.cssVariables;

  if (role !== "background" && role !== "foreground") {
    throw new TypeError(`role must be 'background' or 'foreground', got ${role}`);
  }

  const combo = generateCombo({
    algorithm,
    threshold,
    color,
    role,
    maxIterations,
  });

  const result = {
    colors: combo.colors,
    contrast: combo.contrast,
    algorithm,
    threshold,
    meetsThreshold: _meetsThreshold(combo.contrast, algorithm, threshold),
    iterations: combo.iterations,
  };

  const resolved = resolveCssVariablesOption(cssOpt);
  if (!resolved) {
    return result;
  }

  const applied = applyCssVariables(
    resolved.target,
    resolved.color1,
    resolved.color2,
    result.colors
  );

  return {
    ...result,
    cssVariables: {
      applied,
      names: /** @type {[string, string]} */ ([resolved.color1, resolved.color2]),
      target: resolved.target,
    },
  };
}

/** Descriptive alias for `randoma11y`. */
export const randomAccessiblePair = randoma11y;

export { contrast, meetsThreshold } from "./contrast.js";
export {
  applyCssVariables,
  resolveCssVariablesOption,
} from "./cssVariables.js";
