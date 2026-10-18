import { apiRequest } from './client';

/** Current USD -> COP rate plus provenance. */
export interface ExchangeRateInfo {
  /** COP per 1 USD. */
  rate: number;
  source: string;
  fetchedAt: string;
}

export const getExchangeRate = (): Promise<ExchangeRateInfo> =>
  apiRequest<ExchangeRateInfo>('/exchange-rate');
