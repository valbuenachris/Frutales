import { useQuery } from '@tanstack/react-query';
import { getExchangeRate } from '../api/exchangeRate';

/**
 * Current USD -> COP rate (TRM). Only fetched when a USD sale is being
 * registered/edited; cached for 5 minutes.
 */
export function useExchangeRate(enabled: boolean) {
  return useQuery({
    queryKey: ['exchange-rate'],
    queryFn: getExchangeRate,
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
