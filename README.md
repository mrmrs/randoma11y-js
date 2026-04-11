# randoma11y

Generate accessible background/foreground color pairs for apps, using vendored contrast math aligned with `colorjs.io` and no runtime dependencies.

## Install

```bash
npm install randoma11y
```

## Usage

```js
import { randoma11y, contrast } from "randoma11y";

const pair = randoma11y({
  algorithm: "APCA",
  threshold: 75,
});

console.log(pair.colors); // ['#1d5ec9', '#f5f7cf']
console.log(pair.contrast);

const locked = randoma11y({
  color: "#336699",
  role: "background",
  algorithm: "WCAG21",
  threshold: 4.5,
});

console.log(locked.colors); // ['#336699', '#f0f4c5']
console.log(contrast(locked.colors[0], locked.colors[1], "WCAG21"));
```

## React

`randoma11y` is plain JavaScript: import it and call it from event handlers, effects, or server code. **`colors[0]` is background, `colors[1]` is foreground** — use them for `backgroundColor` / `color`, CSS variables, or theme objects.

### Random pair in component state

```jsx
import { useCallback, useState } from "react";
import { randoma11y } from "randoma11y";

export function DuoPreview() {
  const [bg, setBg] = useState("#ffffff");
  const [fg, setFg] = useState("#000000");

  const regenerate = useCallback(() => {
    const { colors } = randoma11y({ algorithm: "APCA", threshold: 75 });
    setBg(colors[0]);
    setFg(colors[1]);
  }, []);

  return (
    <section
      style={{
        backgroundColor: bg,
        color: fg,
        padding: "2rem",
        minHeight: "100vh",
      }}
    >
      <p>Background {bg} · Foreground {fg}</p>
      <button type="button" onClick={regenerate} style={{ color: fg, borderColor: fg }}>
        New accessible pair
      </button>
    </section>
  );
}
```

### Write theme colors to `:root` (CSS custom properties)

Use this when the rest of the app reads `var(--app-bg)` / `var(--app-fg)` in CSS. Runs in the **browser** only (`document` must exist).

```jsx
import { useCallback } from "react";
import { randoma11y } from "randoma11y";

export function ThemeRefreshButton() {
  const refresh = useCallback(() => {
    randoma11y({
      algorithm: "APCA",
      threshold: 75,
      cssVariables: {
        names: ["--app-bg", "--app-fg"],
      },
    });
    // Optional: dispatch a custom event so other components re-read CSS vars if needed
    document.dispatchEvent(new CustomEvent("theme:updated"));
  }, []);

  return (
    <button type="button" onClick={refresh}>
      New theme
    </button>
  );
}
```

Example CSS elsewhere:

```css
body {
  background: var(--app-bg, #fff);
  color: var(--app-fg, #000);
}
```

### Lock a brand color (generate the other slot)

Pick a fixed background once (lazy state so you do not call `randoma11y` on every render).

```jsx
import { useState } from "react";
import { randoma11y } from "randoma11y";

const BRAND_BG = "#0f172a";

export function BrandedHero() {
  const [{ colors, meetsThreshold }] = useState(() =>
    randoma11y({
      color: BRAND_BG,
      role: "background",
      algorithm: "APCA",
      threshold: 75,
    })
  );

  return (
    <header style={{ backgroundColor: colors[0], color: colors[1] }}>
      <h1>Uses your brand background and an accessible foreground</h1>
      {!meetsThreshold && <p>Consider lowering threshold or changing algorithm.</p>}
    </header>
  );
}
```

For **SSR**, avoid `cssVariables` on the server; either call `randoma11y` without `cssVariables` and pass `colors` into props, or run the `cssVariables` branch only inside `useEffect` / on click after mount.

## API

`randoma11y(options?)` returns:

```ts
{
  colors: [backgroundHex, foregroundHex];
  contrast: number;
  algorithm: ContrastAlgorithm;
  threshold: number;
  meetsThreshold: boolean;
  iterations: number;
  cssVariables?: {
    applied: boolean;
    names: [string, string];
    target: { style: { setProperty(name: string, value: string): void } } | null;
  };
}
```

Options:

- `algorithm`: `'APCA' | 'WCAG21' | 'Michelson' | 'Weber' | 'Lstar' | 'deltaPhi'`
- `threshold`: minimum accepted contrast for the chosen algorithm
- `color`: lock one side of the pair to a specific input color
- `role`: whether `color` is the `'background'` or `'foreground'`
- `maxIterations`: positive integer search budget
- `cssVariables`: `true` or an object describing where to write CSS custom properties

## Notes

- Output colors are always normalized hex strings.
- `colors[0]` is **background**, `colors[1]` is **foreground**. This order matters for APCA, which is asymmetric.
- The exported `contrast(background, foreground, algorithm)` function follows the same **background-first** convention. Swapping the arguments produces a different APCA value.
- `WCAG21` thresholds are ratio-based. Typical values are `3`, `4.5`, or `7`.
- The default `threshold: 75` is intended for `APCA`.
- Supported input syntax: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `black`, `white`, `transparent`.
- The package is ESM-only.
- TypeScript declarations are included.
- **`engines.node`:** `>=14`. For local development, run `npm install` and `npm test` from the package directory (tests use `colorjs.io` only as a devDependency to verify vendored contrast math).

## CSS Variables

```js
const result = randoma11y({
  cssVariables: {
    names: ["--app-bg", "--app-fg"],
  },
});
```

That writes the generated colors to the provided variable names on `document.documentElement` by default.
