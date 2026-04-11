/**
 * Contrast algorithms aligned with colorjs.io (vendored logic).
 * @typedef {'APCA' | 'WCAG21' | 'Michelson' | 'Weber' | 'Lstar' | 'deltaPhi'} ContrastAlgorithm
 */

import {
  getLuminanceY,
  labD65FromXyzD65,
  labD50FromXyzD50,
  linearSrgbFromEncoded,
  parseToSrgb01,
  xyzD50FromXyzD65,
  xyzD65FromLinearSrgb,
} from "./color.js";
import { assertAlgorithm } from "./options.js";

// --- APCA 0.0.98G (colorjs APCA.js) ---
const normBG = 0.56;
const normTXT = 0.57;
const revTXT = 0.62;
const revBG = 0.65;
const blkThrs = 0.022;
const blkClmp = 1.414;
const loClip = 0.1;
const deltaYmin = 0.0005;
const scaleBoW = 1.14;
const loBoWoffset = 0.027;
const scaleWoB = 1.14;
const loWoBoffset = 0.027;

function fclamp(Y) {
  if (Y >= blkThrs) return Y;
  return Y + (blkThrs - Y) ** blkClmp;
}

function linearizeApca(val) {
  const sign = val < 0 ? -1 : 1;
  const abs = Math.abs(val);
  return sign * abs ** 2.4;
}

export function contrastAPCAEncoded(bg, fg) {
  const [fR, fG, fB] = parseToSrgb01(fg);
  let lumTxt = linearizeApca(fR) * 0.2126729 + linearizeApca(fG) * 0.7151522 + linearizeApca(fB) * 0.072175;
  const [bR, bG, bB] = parseToSrgb01(bg);
  let lumBg = linearizeApca(bR) * 0.2126729 + linearizeApca(bG) * 0.7151522 + linearizeApca(bB) * 0.072175;

  let Ytxt = fclamp(lumTxt);
  let Ybg = fclamp(lumBg);
  const BoW = Ybg > Ytxt;
  let S;
  let C;
  let Sapc;

  if (Math.abs(Ybg - Ytxt) < deltaYmin) {
    C = 0;
  } else if (BoW) {
    S = Ybg ** normBG - Ytxt ** normTXT;
    C = S * scaleBoW;
  } else {
    S = Ybg ** revBG - Ytxt ** revTXT;
    C = S * scaleWoB;
  }
  if (Math.abs(C) < loClip) {
    Sapc = 0;
  } else if (C > 0) {
    Sapc = C - loBoWoffset;
  } else {
    Sapc = C + loWoBoffset;
  }
  return Sapc * 100;
}

export function contrastWCAG21Encoded(c1, c2) {
  const lin1 = linearSrgbFromEncoded(parseToSrgb01(c1));
  const lin2 = linearSrgbFromEncoded(parseToSrgb01(c2));
  let Y1 = getLuminanceY(lin1);
  let Y2 = getLuminanceY(lin2);
  if (Y2 > Y1) [Y1, Y2] = [Y2, Y1];
  return (Y1 + 0.05) / (Y2 + 0.05);
}

function orderedLuminancePair(c1, c2) {
  const lin1 = linearSrgbFromEncoded(parseToSrgb01(c1));
  const lin2 = linearSrgbFromEncoded(parseToSrgb01(c2));
  let Y1 = getLuminanceY(lin1);
  let Y2 = getLuminanceY(lin2);
  if (Y2 > Y1) [Y1, Y2] = [Y2, Y1];
  return [Y1, Y2];
}

export function contrastMichelsonEncoded(c1, c2) {
  const [Y1, Y2] = orderedLuminancePair(c1, c2);
  const denom = Y1 + Y2;
  return denom === 0 ? 0 : (Y1 - Y2) / denom;
}

const WEBER_MAX = 50000;

export function contrastWeberEncoded(c1, c2) {
  const [Y1, Y2] = orderedLuminancePair(c1, c2);
  return Y2 === 0 ? WEBER_MAX : (Y1 - Y2) / Y2;
}

function labD65LFromEncoded(c) {
  const lin = linearSrgbFromEncoded(parseToSrgb01(c));
  const xyz = xyzD65FromLinearSrgb(lin);
  return labD65FromXyzD65(xyz)[0];
}

function labD50LFromEncoded(c) {
  const lin = linearSrgbFromEncoded(parseToSrgb01(c));
  const xyz65 = xyzD65FromLinearSrgb(lin);
  const xyz50 = xyzD50FromXyzD65(xyz65);
  return labD50FromXyzD50(xyz50)[0];
}

export function contrastLstarEncoded(c1, c2) {
  const L1 = labD50LFromEncoded(c1);
  const L2 = labD50LFromEncoded(c2);
  return Math.abs(L1 - L2);
}

const phi = Math.pow(5, 0.5) * 0.5 + 0.5;

export function contrastDeltaPhiEncoded(c1, c2) {
  const Lstr1 = labD65LFromEncoded(c1);
  const Lstr2 = labD65LFromEncoded(c2);
  const deltaPhiStar = Math.abs(Math.pow(Lstr1, phi) - Math.pow(Lstr2, phi));
  const contrast = Math.pow(deltaPhiStar, 1 / phi) * Math.SQRT2 - 40;
  return contrast < 7.5 ? 0 : contrast;
}

/** @type {Record<ContrastAlgorithm, (a: string, b: string) => number>} */
const CONTRASTERS = {
  APCA: (bg, fg) => contrastAPCAEncoded(bg, fg),
  WCAG21: contrastWCAG21Encoded,
  Michelson: contrastMichelsonEncoded,
  Weber: contrastWeberEncoded,
  Lstar: contrastLstarEncoded,
  deltaPhi: contrastDeltaPhiEncoded,
};

/**
 * @param {string} background
 * @param {string} foreground
 * @param {ContrastAlgorithm} algorithm
 */
export function contrast(background, foreground, algorithm) {
  const fn = CONTRASTERS[assertAlgorithm(algorithm)];
  return fn(background, foreground);
}

export function meetsThreshold(value, algorithm, threshold) {
  const abs = Math.abs(value);
  if (algorithm === "WCAG21") return value >= threshold;
  return abs >= threshold;
}
