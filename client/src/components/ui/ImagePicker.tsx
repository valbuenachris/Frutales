import { useRef, useState, type ChangeEvent } from 'react';
import { compressImage } from '../../lib/image';

interface ImagePickerProps {
  id: string;
  image: string | null;
  onChange: (image: string | null) => void;
}

/**
 * Attach a receipt photo: on mobile the input opens the camera
 * (`capture="environment"`), on desktop the file picker. The chosen photo is
 * compressed client-side and kept as a data URL.
 */
export function ImagePicker({ id, image, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await compressImage(file));
    } catch {
      setError('No se pudo procesar la imagen. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => void handleFile(event)}
      />

      {image ? (
        <div className="relative">
          <img
            src={image}
            alt="Comprobante"
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-stone-200"
          />
          <button
            type="button"
            aria-label="Quitar comprobante"
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white"
          >
            ×
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {busy ? 'Procesando…' : image ? 'Cambiar foto' : 'Foto o cámara'}
      </button>

      {error ? <p className="w-full text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
