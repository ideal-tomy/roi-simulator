/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_BRAND?: 'axeon' | 'ideal';
  /** ideal サイトのオリジン上書き（末尾スラッシュなし） */
  readonly VITE_IDEAL_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
