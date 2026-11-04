import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { DeltaStatus, IssueFilters, IssueSort, SeverityCode } from '../../api/types';

/**
 * Параметры страницы живут в query-строке URL: страница переключается без перезагрузки,
 * ссылкой на конкретный срез (подразделение, прогон, фильтры, открытая проблема) можно поделиться,
 * а кнопки «назад/вперёд» браузера работают ожидаемо.
 */

export const DEFAULT_UNIT_ID = 'B2B';
export const DEFAULT_PAGE_SIZE = 20;

export interface KkdParams {
  unitId: string;
  /** undefined — пользователь не выбирал прогон, берём последний успешный. */
  runId: string | undefined;
  filters: IssueFilters;
  page: number;
  pageSize: number;
  issueId: string | null;
}

/** Размеры страницы таблицы; другой размер из ссылки (например, больше лимита API в 200) заменяется на размер по умолчанию. */
export const PAGE_SIZES = [10, 20, 50, 100];

const SORTS: IssueSort[] = ['severity', 'age', 'unit', 'rule'];
// коды из контракта API: неизвестный код из ссылки API отверг бы ошибкой 422, поэтому он отбрасывается
const SEVERITIES: SeverityCode[] = ['critical', 'major', 'minor'];
const DELTA_STATUSES: DeltaStatus[] = ['new', 'persisting', 'resolved'];

function list<T extends string>(search: URLSearchParams, key: string, allowed?: readonly T[]): T[] {
  const values = (search.get(key) ?? '').split(',').filter(Boolean) as T[];
  return allowed ? values.filter((value) => allowed.includes(value)) : values;
}

function positive(raw: string | null, fallback: number) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function parseParams(searchString: string): KkdParams {
  const search = new URLSearchParams(searchString);
  const sort = search.get('sort') as IssueSort | null;
  return {
    unitId: search.get('unit') || DEFAULT_UNIT_ID,
    runId: search.get('run') || undefined,
    filters: {
      rule_code: list(search, 'rule'),
      severity: list(search, 'severity', SEVERITIES),
      delta_status: list(search, 'status', DELTA_STATUSES),
      q: search.get('q') ?? '',
      sort: sort && SORTS.includes(sort) ? sort : 'severity',
    },
    page: positive(search.get('page'), 1),
    pageSize: PAGE_SIZES.includes(Number(search.get('size'))) ? Number(search.get('size')) : DEFAULT_PAGE_SIZE,
    issueId: search.get('issue'),
  };
}

function serialize(p: KkdParams): string {
  const search = new URLSearchParams();
  if (p.unitId !== DEFAULT_UNIT_ID) search.set('unit', p.unitId);
  if (p.runId) search.set('run', p.runId);
  if (p.filters.rule_code.length) search.set('rule', p.filters.rule_code.join(','));
  if (p.filters.severity.length) search.set('severity', p.filters.severity.join(','));
  if (p.filters.delta_status.length) search.set('status', p.filters.delta_status.join(','));
  if (p.filters.q) search.set('q', p.filters.q);
  if (p.filters.sort !== 'severity') search.set('sort', p.filters.sort);
  if (p.page > 1) search.set('page', String(p.page));
  if (p.pageSize !== DEFAULT_PAGE_SIZE) search.set('size', String(p.pageSize));
  if (p.issueId) search.set('issue', p.issueId);
  const qs = search.toString();
  return qs ? `?${qs}` : window.location.pathname;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

const getSearch = () => window.location.search;

export const EMPTY_FILTERS: IssueFilters = { rule_code: [], severity: [], delta_status: [], q: '', sort: 'severity' };

export function useKkdParams() {
  const searchString = useSyncExternalStore(subscribe, getSearch);
  const params = useMemo(() => parseParams(searchString), [searchString]);

  const update = useCallback((patch: Partial<KkdParams>, { replace = false } = {}) => {
    const url = serialize({ ...parseParams(window.location.search), ...patch });
    // повторный клик по уже выбранному (счётчик, прогон, столбец динамики) не добавляет пустую запись в историю
    if (url === (window.location.search || window.location.pathname)) return;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    listeners.forEach((l) => l());
  }, []);

  const actions = useMemo(
    () => ({
      /** Смена контекста сбрасывает пагинацию и закрывает карточку проблемы, фильтры сохраняются. */
      setUnit: (unitId: string) => update({ unitId, page: 1, issueId: null }),
      setRun: (runId: string) => update({ runId, page: 1, issueId: null }),
      setFilters: (filters: Partial<IssueFilters>, opts?: { replace?: boolean }) =>
        update({ filters: { ...parseParams(window.location.search).filters, ...filters }, page: 1 }, opts),
      resetFilters: () => update({ filters: EMPTY_FILTERS, page: 1 }),
      setPage: (page: number, pageSize: number, opts?: { replace?: boolean }) => update({ page, pageSize }, opts),
      openIssue: (issueId: string) => update({ issueId }),
      closeIssue: () => update({ issueId: null }),
    }),
    [update],
  );

  return { params, ...actions };
}
