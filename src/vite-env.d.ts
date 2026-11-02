/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Необязательный прямой адрес API. По умолчанию запросы идут на тот же origin через прокси. */
  readonly VITE_API_BASE_URL?: string;
}
