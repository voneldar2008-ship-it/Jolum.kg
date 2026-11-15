/// <reference types="vite/client" />

declare const __JOLUM_APP_URL__: string;

interface ImportMetaEnv {
  readonly VITE_YANDEX_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
