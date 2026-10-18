/** Formatting helpers shared by every screen (Spanish — Colombia). */

const LOCALE = 'es-CO';

/**
 * Colombian pesos via Intl: dot thousands separators, no forced decimals
 * -> "$ 25.000" (cents appear only when present, e.g. "$ 25.000,5").
 */
const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Quantities with dot thousands and comma decimals -> "1.500,5". */
const qtyFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });

/** Short dates as DD/MM/YYYY -> "16/10/2026" (browser-local timezone). */
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Money, e.g. "$ 25.000". */
export const formatMoney = (value: number): string => moneyFormatter.format(value);

/** US dollars, e.g. "US$ 1,50". */
const usdFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** US dollars, e.g. "US$ 1,50". */
export const formatMoneyUsd = (value: number): string => usdFormatter.format(value);

/** Compact COP for chart labels: "$ 48 mil", "$ 1,2 M". */
export const formatMoneyCompact = (value: number): string => {
  const abs = Math.abs(value);
  const prefix = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${prefix}$ ${qtyFormatter.format(Math.round((abs / 1_000_000) * 10) / 10)} M`;
  }
  if (abs >= 100_000) {
    return `${prefix}$ ${qtyFormatter.format(Math.round(abs / 1000))} mil`;
  }
  return formatMoney(value);
};

/** Kilograms, up to three decimals, e.g. "8 kg" / "1.500,5 kg". */
export const formatQty = (value: number): string => `${qtyFormatter.format(value)} kg`;

/** Percentage, up to three decimals, e.g. "20%" / "12,5%". */
export const formatPct = (value: number): string => `${qtyFormatter.format(value)}%`;

/** ISO timestamp -> "DD/MM/YYYY". */
export const formatDate = (isoDate: string): string => dateFormatter.format(new Date(isoDate));

const pad = (value: number): string => String(value).padStart(2, '0');

/** Local date as "YYYY-MM-DD" for native <input type="date"> values. */
export const toDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Today's local date as "YYYY-MM-DD". */
export const todayInputValue = (): string => toDateInputValue(new Date());

/** Tiny classNames helper (keeps conditional class lists readable). */
export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');
