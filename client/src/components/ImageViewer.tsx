import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  /** Receipt as a data URL. */
  image: string;
  /** Caption shown in the header. */
  title?: string;
  /** File name used by the "Descargar" button. */
  downloadName?: string;
  onClose: () => void;
}

/**
 * Fullscreen in-app viewer for receipt photos.
 * Mobile browsers block top-level navigation to `data:` URLs, so receipts
 * must open inside the app (tap the backdrop, the X or press Escape to close).
 */
export function ImageViewer({ image, title, downloadName, onClose }: ImageViewerProps) {
  // Lock background scroll + close with Escape while open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  /** Convert the data URL to a blob so the download works on mobile too. */
  const handleDownload = () => {
    const [meta, base64] = image.split(',');
    const mime = /data:(.*?);base64/.exec(meta ?? '')?.[1] ?? 'image/jpeg';
    const bytes = atob(base64 ?? '');
    const buffer = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) {
      buffer[index] = bytes.charCodeAt(index);
    }
    const blobUrl = URL.createObjectURL(new Blob([buffer], { type: mime }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = downloadName ?? 'comprobante.jpg';
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-slate-900/95"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Comprobante'}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="min-w-0 truncate text-sm font-medium text-white">{title ?? 'Comprobante'}</p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Descargar
          </button>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tap anywhere on the image area to close */}
      <button
        type="button"
        aria-label="Cerrar visor"
        onClick={onClose}
        className="relative flex-1 cursor-zoom-out"
      >
        <img
          src={image}
          alt={title ?? 'Comprobante'}
          className="pointer-events-none absolute inset-0 m-auto max-h-full max-w-full object-contain p-4"
        />
      </button>
    </div>,
    document.body,
  );
}
