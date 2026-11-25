/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SURVEYJS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
