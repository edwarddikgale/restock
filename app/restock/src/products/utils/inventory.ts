import type { MeasureType } from "../types";

interface FormatConfig {
  /** Short suffix to append (e.g. "L", "kg"). Empty for Units (we use the product name instead). */
  suffix: string;
  /** Decimal places to show in the partial value. */
  decimals: number;
}

const MEASURE_FORMATS: Record<MeasureType, FormatConfig> = {
  Units: { suffix: "", decimals: 0 },
  Packages: { suffix: "", decimals: 0 },
  Litres: { suffix: "L", decimals: 1 },
  Millilitres: { suffix: "ml", decimals: 0 },
  Kilograms: { suffix: "kg", decimals: 2 },
  Grams: { suffix: "g", decimals: 0 },
};

function formatNumber(n: number, decimals: number): string {
  if (decimals === 0) return String(Math.round(n));
  // strip trailing zeros: 2.0 → "2", 2.50 → "2.5"
  return n.toFixed(decimals).replace(/\.?0+$/, "");
}

/**
 * Inventory hint for a given percentage left.
 *
 * Examples:
 *   Bananas, defaultQuantity=6, pct=50, measure=Units → "3 of 6 Bananas left"
 *   Oat Milk, defaultQuantity=4, pct=50, measure=Litres → "2L of 4L left"
 *   Rice, defaultQuantity=2, pct=25, measure=Kilograms → "0.5kg of 2kg left"
 *
 * Pass `percentageLeft` explicitly so the hint can update live while dragging
 * the slider (don't read it off the product object).
 */
export function formatInventoryHint(
  productName: string,
  measureType: MeasureType,
  defaultQuantity: number,
  percentageLeft: number
): string {
  if (!Number.isFinite(defaultQuantity) || defaultQuantity <= 0) return "";

  const cfg = MEASURE_FORMATS[measureType] ?? { suffix: "", decimals: 0 };
  const remaining = (defaultQuantity * percentageLeft) / 100;

  const cur = formatNumber(remaining, cfg.decimals);
  const total = formatNumber(defaultQuantity, cfg.decimals);

  if (measureType === "Units" || measureType === "Packages") {
    const unitWord = measureType === "Packages" ? "packages" : productName;
    return `${cur} of ${total} ${unitWord} left`;
  }
  return `${cur}${cfg.suffix} of ${total}${cfg.suffix} left`;
}
