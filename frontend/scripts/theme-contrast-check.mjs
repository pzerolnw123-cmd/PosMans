import { readFileSync } from "node:fs";
import { join } from "node:path";

const themeDir = join(process.cwd(), "src", "styles", "themes");

const files = {
  violet: ["_base.css", "violet.css"],
  light: ["_base.css", "light.css"],
  dark: ["_base.css", "dark.css"],
  mono: ["_base.css"],
};

const pairs = [
  ["foreground", "background", 4.5],
  ["foreground-soft", "background", 3],
  ["foreground", "surface-strong", 4.5],
  ["button-text", "button-bg", 4.5],
  ["danger", "background", 3],
  ["success", "background", 3],
];

function collectTokens(themeName, fileNames) {
  const tokens = new Map();

  for (const fileName of fileNames) {
    const css = readFileSync(join(themeDir, fileName), "utf8");
    for (const block of css.matchAll(/(:root|html\[data-store-theme="([^"]+)"\])\s*\{([\s\S]*?)\n\}/g)) {
      const selectorTheme = block[2];

      if (block[1] !== ":root" && selectorTheme !== themeName) {
        continue;
      }

      for (const match of block[3].matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
        tokens.set(match[1], match[2].trim());
      }
    }
  }

  return tokens;
}

function resolveToken(name, tokens, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Circular token reference: ${[...seen, name].join(" -> ")}`);
  }

  const value = tokens.get(name);
  if (!value) {
    throw new Error(`Missing token: --${name}`);
  }

  const varMatch = value.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (varMatch) {
    seen.add(name);
    return resolveToken(varMatch[1], tokens, seen);
  }

  return parseColor(value);
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const expanded =
      raw.length === 3
        ? raw
            .split("")
            .map((part) => part + part)
            .join("")
        : raw;

    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
    };
  }

  const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i);
  if (rgb) {
    return {
      r: Number.parseInt(rgb[1], 10),
      g: Number.parseInt(rgb[2], 10),
      b: Number.parseInt(rgb[3], 10),
    };
  }

  throw new Error(`Unsupported color value for contrast check: ${value}`);
}

function luminance({ r, g, b }) {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(colorA, colorB) {
  const light = Math.max(luminance(colorA), luminance(colorB));
  const dark = Math.min(luminance(colorA), luminance(colorB));
  return (light + 0.05) / (dark + 0.05);
}

const failures = [];

for (const [themeName, fileNames] of Object.entries(files)) {
  const tokens = collectTokens(themeName, fileNames);

  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrastRatio(resolveToken(foreground, tokens), resolveToken(background, tokens));
    const formatted = ratio.toFixed(2);

    if (ratio < minimum) {
      failures.push(`${themeName}: --${foreground} on --${background} is ${formatted}:1, expected ${minimum}:1`);
    } else {
      console.log(`${themeName}: --${foreground} on --${background} = ${formatted}:1`);
    }
  }
}

if (failures.length > 0) {
  console.error("\nTheme contrast check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
