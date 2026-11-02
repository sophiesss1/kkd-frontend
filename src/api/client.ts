/**
 * Базовый адрес API. По умолчанию пустой: запросы идут на тот же origin в /api/*,
 * а dev-сервер Vite или nginx в контейнере проксируют их на адрес из переменной API_URL.
 * VITE_API_BASE_URL нужен, только если фронтенд должен ходить в API напрямую.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export type ApiErrorCode =
  | 'RUN_NOT_FOUND'
  | 'UNIT_NOT_FOUND'
  | 'ISSUE_NOT_FOUND'
  | 'RUN_FAILED'
  | 'RUN_IN_PROGRESS'
  | 'INVALID_PARAM'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | (string & {});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Ошибки 4xx — ответ сервера по существу, повторять запрос бессмысленно. */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

type QueryValue = string | number | string[] | undefined | null;

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Полный адрес запроса — для ссылок, которые браузер открывает сам (выгрузка CSV). */
export function apiUrl(path: string, params: Record<string, QueryValue> = {}): string {
  return `${BASE_URL}${path}${buildQuery(params)}`;
}

/**
 * Ошибки валидации FastAPI (например, limit=0) приходят не в едином формате API, а как
 * {"detail": [{"loc": ["query", "limit"], "msg": "..."}]}. Называем параметры, остальное — служебные детали.
 */
function validationError(status: number, detail: unknown): ApiError | null {
  if (!Array.isArray(detail)) return null;
  const params = detail
    .map((item) => (Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null))
    .filter((name): name is string => typeof name === 'string');
  const list = params.length ? `: ${[...new Set(params)].join(', ')}` : '';
  return new ApiError(status, 'INVALID_PARAM', `Некорректные параметры запроса${list}.`);
}

export async function apiGet<T>(path: string, params: Record<string, QueryValue> = {}, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path, params), {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Нет связи с сервером. Проверьте подключение и повторите попытку.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    // Без тела в формате API ответ пришёл не от сервиса, а от прокси (nginx / Vite): бэкенд недоступен
    if (!error && response.status >= 500) {
      throw new ApiError(response.status, 'SERVICE_UNAVAILABLE', 'Сервис ККД недоступен. Повторите попытку чуть позже.');
    }
    if (!error) {
      const validation = validationError(response.status, body?.detail);
      if (validation) throw validation;
    }
    throw new ApiError(
      response.status,
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? `Сервер вернул ошибку ${response.status}`,
    );
  }
  return body as T;
}
