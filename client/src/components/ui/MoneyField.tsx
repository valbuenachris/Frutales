import type { ExchangeRateInfo } from '../../api/exchangeRate';
import { formatMoney } from '../../lib/format';
import type { SaleCurrency } from '../../types/project';
import { Field } from './Field';
import { ImagePicker } from './ImagePicker';
import { Input } from './Input';
import { Select } from './Select';

interface MoneyFieldProps {
  id: string;
  label: string;
  amount: string;
  onAmountChange: (value: string) => void;
  currency: SaleCurrency;
  onCurrencyChange: (currency: SaleCurrency) => void;
  exchangeRate: string;
  onExchangeRateChange: (value: string) => void;
  image: string | null;
  onImageChange: (image: string | null) => void;
  placeholder?: string;
  hint?: string;
  /** TRM preview hint (only rendered for USD). */
  rateInfo?: ExchangeRateInfo;
  rateLoading?: boolean;
  rateError?: boolean;
}

/**
 * Money input with everything a money entry needs:
 * amount + currency (COP/USD) + USD rate (TRM, auto-filled, editable)
 * + optional receipt photo (camera or gallery).
 * Shared by purchase price, selling price and expense amount.
 */
export function MoneyField({
  id,
  label,
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  exchangeRate,
  onExchangeRateChange,
  image,
  onImageChange,
  placeholder,
  hint,
  rateInfo,
  rateLoading,
  rateError,
}: MoneyFieldProps) {
  return (
    <div className="space-y-3">
      <Field label={label} htmlFor={id} hint={hint}>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={placeholder}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Moneda" htmlFor={`${id}-currency`}>
          <Select
            id={`${id}-currency`}
            value={currency}
            onChange={(event) => onCurrencyChange(event.target.value as SaleCurrency)}
          >
            <option value="COP">Pesos colombianos (COP)</option>
            <option value="USD">Dólares (USD)</option>
          </Select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600">Comprobante (opcional)</span>
          <ImagePicker id={`${id}-image`} image={image} onChange={onImageChange} />
        </div>
      </div>

      {currency === 'USD' ? (
        <Field
          label="Precio del dólar (COP por USD)"
          htmlFor={`${id}-rate`}
          hint={
            rateInfo
              ? `Valor de referencia actual: ${formatMoney(rateInfo.rate)} (${rateInfo.source}). Se guarda con el registro; puedes ajustarlo.`
              : rateError
                ? 'No se pudo obtener automáticamente. Ingresa el valor manualmente.'
                : rateLoading
                  ? 'Obteniendo el valor actual del dólar…'
                  : 'Se usará el valor actual del dólar al guardar.'
          }
        >
          <Input
            id={`${id}-rate`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={exchangeRate}
            onChange={(event) => onExchangeRateChange(event.target.value)}
            placeholder="4000"
          />
        </Field>
      ) : null}
    </div>
  );
}
