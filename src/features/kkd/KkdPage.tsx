import { LoadingOutlined } from '@ant-design/icons';
import { Empty, Skeleton, Spin } from 'antd';
import { useRef } from 'react';
import { useMeta, useRuns, useSummary, useUnitsMetrics } from '../../api/queries';
import type { DeltaStatus, IssueFilters, SeverityCode } from '../../api/types';
import { QueryError } from '../../shared/QueryError';
import { ComparisonNote } from './components/ComparisonNote';
import { ContextBar } from './components/ContextBar';
import { IssueModal } from './components/IssueModal';
import { IssuesBreakdown } from './components/IssuesBreakdown';
import { IssuesSection } from './components/IssuesSection';
import { ISSUES_TOTAL_METRIC, MetricsOverview, PRIMARY_METRIC } from './components/MetricsOverview';
import { PriorityRules } from './components/PriorityRules';
import { RunUnavailable } from './components/RunUnavailable';
import { TrendBars } from './components/TrendBars';
import { BreakdownCaveat, UnitsBreakdown } from './components/UnitsBreakdown';
import { buildUnitsBreakdown } from './unitsBreakdown';
import { EMPTY_FILTERS, useKkdParams } from './useKkdParams';
import styles from './KkdPage.module.css';

export function KkdPage() {
  const { params, setUnit, setRun, setFilters, resetFilters, setPage, openIssue, closeIssue } = useKkdParams();
  const meta = useMeta();
  const runs = useRuns();
  const issuesRef = useRef<HTMLElement>(null);

  const latestCompleted = runs.data?.find((r) => r.status === 'completed');
  const runId = params.runId ?? latestCompleted?.id;
  const selectedRun = runs.data?.find((r) => r.id === runId);
  const summary = useSummary(runId, params.unitId);
  // разрез по подразделениям нужен только у успешного прогона: у упавшего API отвечает 409
  const unitsMetrics = useUnitsMetrics(runId, selectedRun?.status === 'completed');

  // keepPreviousData держит прошлые данные на экране, пока грузятся новые — показываем это явно
  const summaryIsStale = summary.isPlaceholderData || unitsMetrics.isPlaceholderData;

  /** Клик по счётчику в сводке открывает список проблем ровно с этим фильтром. */
  const showIssues = (filters: Partial<IssueFilters>) => {
    setFilters({ ...EMPTY_FILTERS, ...filters });
    issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (meta.isError || runs.isError) {
    return (
      <main className={styles.page}>
        <QueryError
          error={meta.error ?? runs.error}
          onRetry={() => {
            if (meta.isError) meta.refetch();
            if (runs.isError) runs.refetch();
          }}
        />
      </main>
    );
  }

  if (!meta.data || !runs.data) {
    return (
      <main className={styles.page} aria-busy="true">
        <Skeleton active title={{ width: 320 }} paragraph={{ rows: 1 }} />
        <Skeleton.Node active className={styles.skeletonBlock} />
      </main>
    );
  }

  const unitName = meta.data.units.find((u) => u.id === params.unitId)?.name;
  const data = summary.data;
  const hasComparison = Boolean(data?.compared_to);
  const metricByKey = new Map(data?.metrics.map((m) => [m.key, m]));
  const isEmptyUnit = data !== undefined && metricByKey.get('goals_active')?.value === 0;

  // направление «лучше / хуже» там, где API не отдаёт trend, — из метаданных метрик
  const higherIsBetter = (key: string) => meta.data.metrics.find((m) => m.key === key)?.higher_is_better ?? null;
  // разрез строим для подразделения, по которому пришла сводка, чтобы они не разошлись во время загрузки
  const shownUnitId = data?.unit.id ?? params.unitId;
  const hasChildUnits = meta.data.units.some((u) => u.parent_id === shownUnitId);
  const breakdown =
    hasChildUnits && unitsMetrics.data
      ? buildUnitsBreakdown(
          unitsMetrics.data.items,
          shownUnitId,
          higherIsBetter(PRIMARY_METRIC),
          unitsMetrics.data.compared_to !== null,
        )
      : undefined;
  const primaryTrend = metricByKey.get(PRIMARY_METRIC)?.trend;
  const showCaveat = breakdown && (primaryTrend === 'better' || primaryTrend === 'same');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Контроль качества данных</h1>
          <p className={styles.subtitle}>
            {data && !summaryIsStale ? data.unit.path.map((p) => p.name).join(' / ') : unitName}
          </p>
        </div>
        <ContextBar
          units={meta.data.units}
          runs={runs.data}
          unitId={params.unitId}
          runId={runId}
          onUnitChange={setUnit}
          onRunChange={setRun}
        />
      </header>

      {selectedRun && <ComparisonNote run={selectedRun} runs={runs.data} />}

      {summary.isError ? (
        <RunUnavailable
          error={summary.error}
          run={selectedRun}
          latestCompleted={latestCompleted}
          onOpenRun={setRun}
          onRetry={() => {
            runs.refetch();
            summary.refetch();
          }}
        />
      ) : !data ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton.Node active className={styles.skeletonBlock} />
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <div className={summaryIsStale ? styles.stale : undefined} aria-busy={summaryIsStale}>
          {summaryIsStale && (
            <div className={styles.staleBadge} role="status">
              <Spin indicator={<LoadingOutlined spin />} size="small" /> Обновляем данные…
            </div>
          )}

          {isEmptyUnit ? (
            <section className={styles.emptyUnit}>
              <Empty
                description={
                  <>
                    <strong>В подразделении «{data.unit.name}» нет активных целей.</strong>
                    <br />
                    Метрики качества не рассчитываются, проверять пока нечего.
                  </>
                }
              />
            </section>
          ) : (
            <div className={styles.sections}>
              <section aria-labelledby="overview-heading">
                <h2 id="overview-heading" className={styles.sectionTitle}>
                  Стало лучше или хуже
                </h2>
                <MetricsOverview
                  metrics={data.metrics}
                  comparedTo={data.compared_to}
                  verdictNote={showCaveat && <BreakdownCaveat breakdown={breakdown} />}
                  aside={
                    hasChildUnits && (
                      <UnitsBreakdown
                        unitId={shownUnitId}
                        breakdown={breakdown}
                        error={unitsMetrics.error}
                        onRetry={() => unitsMetrics.refetch()}
                        onSelectUnit={setUnit}
                      />
                    )
                  }
                  heroFooter={
                    <TrendBars
                      unitId={params.unitId}
                      metric={PRIMARY_METRIC}
                      selectedRunId={data.run.id}
                      onSelectRun={setRun}
                    />
                  }
                />
              </section>

              <section aria-labelledby="fix-heading" className={styles.fixSection}>
                <h2 id="fix-heading" className={styles.sectionTitle}>
                  Что исправлять
                </h2>
                <div className={styles.twoColumns}>
                  <IssuesBreakdown
                    summary={data}
                    issuesTotal={metricByKey.get(ISSUES_TOTAL_METRIC)}
                    issuesHigherIsBetter={higherIsBetter(ISSUES_TOTAL_METRIC)}
                    onDeltaStatusClick={(status: DeltaStatus) => showIssues({ delta_status: [status] })}
                    onSeverityClick={(severity: SeverityCode) => showIssues({ severity: [severity] })}
                  />
                  <PriorityRules
                    rows={data.issues_by_rule}
                    rules={meta.data.rules}
                    issuesHigherIsBetter={higherIsBetter(ISSUES_TOTAL_METRIC)}
                    onRuleClick={(code) => showIssues({ rule_code: [code] })}
                  />
                </div>

                <IssuesSection
                  ref={issuesRef}
                  runId={runId!}
                  unitId={params.unitId}
                  enabled={selectedRun?.status === 'completed'}
                  hasComparison={hasComparison}
                  rules={meta.data.rules}
                  filters={params.filters}
                  page={params.page}
                  pageSize={params.pageSize}
                  onFiltersChange={setFilters}
                  onResetFilters={resetFilters}
                  onPageChange={setPage}
                  onOpenIssue={openIssue}
                />
              </section>
            </div>
          )}
        </div>
      )}

      {runId && (
        <IssueModal issueId={params.issueId} runId={runId} hasComparison={hasComparison} onClose={closeIssue} />
      )}
    </main>
  );
}
