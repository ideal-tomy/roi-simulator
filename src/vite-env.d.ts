/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_BRAND?: 'axeon' | 'ideal';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
