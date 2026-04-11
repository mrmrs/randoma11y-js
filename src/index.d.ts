export type ContrastAlgorithm =
  | "APCA"
  | "WCAG21"
  | "Michelson"
  | "Weber"
  | "Lstar"
  | "deltaPhi";

export interface CssVariableTargetLike {
  style: {
    setProperty(name: string, value: string): void;
  };
}

export interface Randoma11yCssVariables {
  target?: CssVariableTargetLike | null;
  color1?: string;
  color2?: string;
  names?: readonly [string, string];
}

export interface Randoma11yOptions {
  algorithm?: ContrastAlgorithm;
  threshold?: number;
  color?: string;
  role?: "background" | "foreground";
  maxIterations?: number;
  cssVariables?: boolean | Randoma11yCssVariables;
}

export interface Randoma11yCssVariablesResult {
  applied: boolean;
  names: [string, string];
  target: CssVariableTargetLike | null;
}

export interface Randoma11yResult {
  colors: [string, string];
  contrast: number;
  algorithm: ContrastAlgorithm;
  threshold: number;
  meetsThreshold: boolean;
  iterations: number;
  cssVariables?: Randoma11yCssVariablesResult;
}

export interface ResolvedCssVariablesOption {
  target: CssVariableTargetLike | null;
  color1: string;
  color2: string;
}

export function randoma11y(
  options?: Randoma11yOptions | string
): Randoma11yResult;

export const randomAccessiblePair: typeof randoma11y;

export function contrast(
  background: string,
  foreground: string,
  algorithm: ContrastAlgorithm
): number;

export function meetsThreshold(
  value: number,
  algorithm: ContrastAlgorithm,
  threshold: number
): boolean;

export function applyCssVariables(
  target: CssVariableTargetLike | null,
  color1Name: string,
  color2Name: string,
  colors: readonly [string, string]
): boolean;

export function resolveCssVariablesOption(
  opt?: boolean | Randoma11yCssVariables | null
): ResolvedCssVariablesOption | null;
