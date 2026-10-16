/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional API base URL for production builds (defaults to /api). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
