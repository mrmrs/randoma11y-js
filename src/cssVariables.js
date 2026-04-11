const DEFAULT_COLOR1 = "--randoma11y-color-1";
const DEFAULT_COLOR2 = "--randoma11y-color-2";

/** @param {string} name */
function normalizeVarName(name) {
  const n = String(name).trim();
  if (!n) throw new TypeError("CSS variable name cannot be empty");
  return n.startsWith("--") ? n : `--${n}`;
}

/**
 * @param {boolean | { target?: Element | null; color1?: string; color2?: string; names?: [string, string] } | null | undefined} opt
 * @returns {{ target: Element | null; color1: string; color2: string } | null}
 */
export function resolveCssVariablesOption(opt) {
  if (opt == null || opt === false) return null;

  const fallbackTarget =
    typeof document !== "undefined" ? document.documentElement : null;

  if (opt === true) {
    return {
      target: fallbackTarget,
      color1: DEFAULT_COLOR1,
      color2: DEFAULT_COLOR2,
    };
  }

  if (typeof opt !== "object") {
    throw new TypeError(
      "cssVariables must be true, false, null, or an options object"
    );
  }

  const color1 = normalizeVarName(
    opt.color1 ?? opt.names?.[0] ?? DEFAULT_COLOR1
  );
  const color2 = normalizeVarName(
    opt.color2 ?? opt.names?.[1] ?? DEFAULT_COLOR2
  );
  const target = opt.target !== undefined ? opt.target : fallbackTarget;

  if (
    target !== null &&
    (!target ||
      !target.style ||
      typeof target.style.setProperty !== "function")
  ) {
    throw new TypeError(
      "cssVariables.target must be null or an object with style.setProperty(name, value)"
    );
  }

  return {
    target,
    color1,
    color2,
  };
}

/**
 * @param {Element | null} target
 * @param {string} color1Name
 * @param {string} color2Name
 * @param {[string, string]} colors
 */
export function applyCssVariables(target, color1Name, color2Name, colors) {
  if (!target) return false;
  if (!target.style || typeof target.style.setProperty !== "function") {
    throw new TypeError(
      "target must be an object with style.setProperty(name, value)"
    );
  }
  target.style.setProperty(color1Name, colors[0]);
  target.style.setProperty(color2Name, colors[1]);
  return true;
}
