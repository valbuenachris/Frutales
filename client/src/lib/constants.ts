/**
 * Common fruit-processing methods offered in the form dropdown (es-CO).
 * Note: legacy rows stored with English values fall back to "Otro" + custom
 * text when edited — existing data is never rewritten.
 */
export const PROCESS_TYPES = [
  'Deshidratada',
  'Caramelizada',
  'Melada',
  'En almíbar',
  'Mermelada',
  'Liofilizada',
  'Otro',
] as const;

export type ProcessTypeOption = (typeof PROCESS_TYPES)[number];
