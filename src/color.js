/**
 * Minimal sRGB-oriented color helpers (parse → linear / XYZ / Lab)
 * Matrix values match colorjs.io srgb-linear / lab-d65 / lab / adapt (Bradford D65↔D50).
 */

// prettier-ignore
const TO_XYZ_M = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];

const WHITES = {
  D65: [0.3127 / 0.329, 1, (1 - 0.3127 - 0.329) / 0.329],
  D50: [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585],
};

// prettier-ignore
const CAT_D65_TO_D50 = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];

const ε = 216 / 24389;
const ε3 = 24 / 116;
const κ = 24389 / 27;

const NAMED = {
  black: [0, 0, 0],
  white: [1, 1, 1],
  transparent: [0, 0, 0],
};

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function parseFiniteNumber(value, label, source) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`Invalid ${label} in color: ${source}`);
  }
  return parsed;
}

export function multiplyM3(v, m) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/** WCAG / colorjs relative luminance: linear sRGB → Y (XYZ D65). */
export function getLuminanceY(lin) {
  const xyz = multiplyM3(lin, TO_XYZ_M);
  return Math.max(xyz[1], 0);
}

/** Piecewise sRGB → linear (matches CSS / WCAG). */
export function linearizeSrgbChannel(c) {
  const sign = c < 0 ? -1 : 1;
  const abs = Math.abs(c);
  if (abs <= 0.04045) return c / 12.92;
  return sign * ((abs + 0.055) / 1.055) ** 2.4;
}

export function linearSrgbFromEncoded(rgb) {
  return rgb.map(linearizeSrgbChannel);
}

export function xyzD65FromLinearSrgb(lin) {
  return multiplyM3(lin, TO_XYZ_M);
}

export function labD65FromXyzD65(xyz) {
  const white = WHITES.D65;
  const xyzn = xyz.map((v, i) => v / white[i]);
  const f = xyzn.map((value) => (value > ε ? Math.cbrt(value) : (κ * value + 16) / 116));
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

export function labD50FromXyzD50(xyz) {
  const white = WHITES.D50;
  const xyzn = xyz.map((v, i) => v / white[i]);
  const f = xyzn.map((value) => (value > ε ? Math.cbrt(value) : (κ * value + 16) / 116));
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

export function xyzD50FromXyzD65(xyz) {
  return multiplyM3(xyz, CAT_D65_TO_D50);
}

/**
 * @param {string} str
 * @returns {[number, number, number]} sRGB 0–1 (encoded)
 */
export function parseToSrgb01(str) {
  const s = String(str).trim().toLowerCase();
  if (NAMED[s]) return NAMED[s].slice();

  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) {
      h = h.replace(/./g, "$&$&");
    }
    if (h.length !== 6 && h.length !== 8) {
      throw new TypeError(`Invalid hex color: ${str}`);
    }
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b];
  }

  const rgbM = s.match(/^rgba?\(\s*([^)]+)\s*\)/);
  if (rgbM) {
    const parts = rgbM[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) {
      throw new TypeError(`Invalid rgb color: ${str}`);
    }
    const toNum = (p, i) => {
      const parsed = parseFiniteNumber(p, "rgb component", str);
      if (p.endsWith("%")) return clamp01(parsed / 100);
      return i < 3 ? clamp01(parsed / 255) : clamp01(parsed);
    };
    return [toNum(parts[0], 0), toNum(parts[1], 1), toNum(parts[2], 2)];
  }

  const hslM = s.match(/^hsla?\(\s*([^)]+)\s*\)/);
  if (hslM) {
    const parts = hslM[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) {
      throw new TypeError(`Invalid hsl color: ${str}`);
    }
    let h = parseFiniteNumber(parts[0], "hue", str);
    const sPct = parseFiniteNumber(parts[1], "saturation", str);
    const lPct = parseFiniteNumber(parts[2], "lightness", str);
    h = ((h % 360) + 360) % 360;
    const sat = clamp01(sPct / 100);
    const light = clamp01(lPct / 100);
    return hslToSrgb01(h, sat, light);
  }

  throw new TypeError(`Unsupported color syntax: ${str}`);
}

function hslToSrgb01(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

export function randomSrgb01() {
  return [Math.random(), Math.random(), Math.random()];
}

/** HSL in degrees / 0–1 / 0–1 → sRGB 0–1 */
export function hsl01ToSrgb01(h, s, l) {
  return hslToSrgb01(h * 360, s, l);
}

export function toHex([r, g, b]) {
  const x = (n) =>
    Math.max(0, Math.min(255, Math.round(n * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${x(r)}${x(g)}${x(b)}`;
}
