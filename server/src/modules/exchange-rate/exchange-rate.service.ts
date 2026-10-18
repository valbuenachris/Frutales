import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http-error.js';
import { round } from '../projects/projects.calc.js';

/** Current USD -> COP rate plus provenance, so the client can show it. */
export interface ExchangeRateInfo {
  /** COP per 1 USD. */
  rate: number;
  source: string;
  fetchedAt: string;
}

/**
 * Providers tried in order. The first one is the official Colombian TRM
 * (datos.gov.co, no API key needed); the second is a generic FX API fallback.
 */
const DEFAULT_PROVIDERS = [
  'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC',
  'https://open.er-api.com/v6/latest/USD',
];

/** Understand both provider shapes without trusting their types. */
const parseRate = (body: unknown): number | null => {
  // datos.gov.co: [{ valor: "3174.67", unidad: "COP", ... }]
  if (Array.isArray(body) && body.length > 0) {
    const first = body[0] as { valor?: unknown } | undefined;
    const value = Number(first?.valor);
    if (Number.isFinite(value) && value > 0) return value;
  }
  // open.er-api: { result: "success", rates: { COP: 3182.77, ... } }
  if (body !== null && typeof body === 'object') {
    const rates = (body as { rates?: Record<string, unknown> }).rates;
    const value = Number(rates?.COP);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
};

/**
 * Resolve the current USD -> COP exchange rate.
 * Throws when every provider fails; callers decide how to degrade.
 */
export async function getUsdCopRate(): Promise<ExchangeRateInfo> {
  const providers = env.EXCHANGE_RATE_API_URL ? [env.EXCHANGE_RATE_API_URL] : DEFAULT_PROVIDERS;
  let lastError: unknown = null;

  for (const url of providers) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rate = parseRate(await response.json());
      if (rate === null) throw new Error('Respuesta inesperada del proveedor');
      return { rate: round(rate, 4), source: new URL(url).hostname, fetchedAt: new Date().toISOString() };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Tipo de cambio no disponible');
}

/**
 * Rate to persist for a USD money entry (purchase, sale or expense): the
 * value captured by the client, or the live TRM as fallback. Throws a 503
 * with a user-facing Spanish message when neither is available.
 */
export async function resolveUsdCopRate(provided: number | undefined): Promise<number> {
  if (provided !== undefined) return round(provided, 4);
  try {
    return (await getUsdCopRate()).rate;
  } catch {
    throw new HttpError(
      503,
      'No se pudo obtener el precio del dólar automáticamente. Ingresa el valor manualmente.',
    );
  }
}
