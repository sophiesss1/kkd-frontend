import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type { IssueDetail, IssueFilters, IssuesPage, Meta, Page, Run, Summary, TrendResponse, UnitsMetrics } from './types';

/**
 * Все запросы страницы ККД. Ключи собраны в одном месте, чтобы одинаковые запросы
 * из разных компонентов дедуплицировались кэшем React Query, а не уходили на сервер дважды.
 */
export const queryKeys = {
  meta: ['meta'] as const,
  runs: ['runs'] as const,
  summary: (runId: string, unitId: string) => ['summary', runId, unitId] as const,
  units: (runId: string) => ['units', runId] as const,
  issues: (runId: string, unitId: string, filters: IssueFilters, page: number, pageSize: number) =>
    ['issues', runId, unitId, filters, page, pageSize] as const,
  issue: (issueId: string, runId: string) => ['issue', issueId, runId] as const,
  trend: (unitId: string, metric: string) => ['trend', unitId, metric] as const,
};

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: ({ signal }) => apiGet<Meta>('/api/meta', {}, signal),
    staleTime: Infinity,
  });
}

export function useRuns() {
  return useQuery({
    queryKey: queryKeys.runs,
    queryFn: ({ signal }) => apiGet<Page<Run>>('/api/runs', { limit: 100 }, signal),
    select: (page) => page.items,
  });
}

export function useSummary(runId: string | undefined, unitId: string) {
  return useQuery({
    queryKey: queryKeys.summary(runId ?? '', unitId),
    queryFn: ({ signal }) => apiGet<Summary>('/api/kkd/summary', { run_id: runId, unit_id: unitId }, signal),
    enabled: Boolean(runId),
    placeholderData: keepPreviousData,
  });
}

/**
 * Метрики всех подразделений прогона одним запросом (необязательный эндпоинт). Нужен, чтобы итог по блоку
 * не скрывал провалы внутри него; не зависит от выбранного подразделения, поэтому кэшируется на прогон.
 */
export function useUnitsMetrics(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.units(runId ?? ''),
    queryFn: ({ signal }) => apiGet<UnitsMetrics>('/api/kkd/units', { run_id: runId }, signal),
    enabled: Boolean(runId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useIssues(
  runId: string | undefined,
  unitId: string,
  filters: IssueFilters,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.issues(runId ?? '', unitId, filters, page, pageSize),
    queryFn: ({ signal }) =>
      apiGet<IssuesPage>(
        '/api/kkd/issues',
        {
          run_id: runId,
          unit_id: unitId,
          rule_code: filters.rule_code,
          severity: filters.severity,
          delta_status: filters.delta_status,
          q: filters.q.trim(),
          sort: filters.sort,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        signal,
      ),
    enabled: Boolean(runId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTrend(unitId: string, metric: string) {
  return useQuery({
    queryKey: queryKeys.trend(unitId, metric),
    queryFn: ({ signal }) => apiGet<TrendResponse>('/api/kkd/trend', { unit_id: unitId, metric, limit: 8 }, signal),
  });
}

export function useIssue(issueId: string | null, runId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.issue(issueId ?? '', runId ?? ''),
    queryFn: ({ signal }) => apiGet<IssueDetail>(`/api/kkd/issues/${encodeURIComponent(issueId!)}`, { run_id: runId }, signal),
    enabled: Boolean(issueId && runId),
  });
}
