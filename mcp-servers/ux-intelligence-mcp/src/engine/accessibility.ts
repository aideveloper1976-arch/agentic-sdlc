export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAA18: boolean;
  passesAAA: boolean;
  recommendation: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function checkContrast(foreground: string, background: string, fontSize?: number): ContrastResult {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  const rounded = Math.round(ratio * 100) / 100;

  const isLargeText = fontSize ? fontSize >= 24 || (fontSize >= 18.66 && fontSize < 24) : false;

  const passesAA = isLargeText ? rounded >= 3 : rounded >= 4.5;
  const passesAA18 = rounded >= 3;
  const passesAAA = isLargeText ? rounded >= 4.5 : rounded >= 7;

  let recommendation: string;
  if (passesAAA) {
    recommendation = "Excellent contrast. Passes WCAG AAA.";
  } else if (passesAA) {
    if (isLargeText) {
      recommendation = "Passes WCAG AA for large text (3:1). For normal text, target 4.5:1.";
    } else {
      recommendation = `Passes WCAG AA (${rounded.toFixed(2)}:1). To reach AAA, target 7:1.`;
    }
  } else if (passesAA18) {
    recommendation = `Fails WCAG AA for normal text (< 4.5:1). Only passes at 18px+ bold or 24px+ (3:1).`;
  } else {
    recommendation = `Fails WCAG AA. This contrast ratio (${rounded.toFixed(2)}:1) is insufficient. Target at least 4.5:1.`;
  }

  return {
    ratio: rounded,
    passesAA,
    passesAA18,
    passesAAA,
    recommendation,
  };
}
