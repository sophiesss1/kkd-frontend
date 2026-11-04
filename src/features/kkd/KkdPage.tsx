import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Empty, Skeleton, Spin } from 'antd';
import { useRef } from 'react';
import { useMeta, useRetryFailed, useRuns, useSummary, useUnitsMetrics } from '../../api/queries';
import type { DeltaStatus, IssueFilters, SeverityCode } from '../../api/types';
import { DictionariesProvider } from '../../shared/dictionaries';
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
import { DEFAULT_UNIT_ID, EMPTY_FILTERS, useKkdParams } from './useKkdParams';
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
  // Прогон из ссылки может не попасть в первые 100 из /api/runs: тогда об успехе прогона судим по самой сводке.
  const runCompleted = selectedRun
    ? selectedRun.status === 'completed'
    : summary.isSuccess && !summary.isPlaceholderData;
  // Разрез нужен только успешному прогону (у упавшего API отвечает 409) и только подразделению с дочерними.
  const unitHasChildren = meta.data?.units.some((u) => u.parent_id === params.unitId) ?? false;
  const unitsEnabled = runCompleted && unitHasChildren;
  const unitsMetrics = useUnitsMetrics(runId, unitsEnabled);

  // keepPreviousData держит прошлые данные на экране, пока грузятся новые — показываем это явно
  const summaryIsStale = summary.isPlaceholderData || (unitsEnabled && unitsMetrics.isPlaceholderData);

  /** Клик по счётчику в сводке открывает список проблем ровно с этим фильтром. */
  const showIssues = (filters: Partial<IssueFilters>) => {
    setFilters({ ...EMPTY_FILTERS, ...filters });
    issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // «Повторить» перезапрашивает всё, что упало, — и сводку, чтобы после восстановления API не нужен был второй клик
  const retryFailed = useRetryFailed();

  // Страница заменяется ошибкой, только если справочников ещё нет совсем. Неудачный повторный запрос списка
  // прогонов при уже загруженных данных не стирает экран.
  if ((meta.isError && !meta.data) || (runs.isError && !runs.data)) {
    return (
      <main className={styles.page}>
        <QueryError error={meta.error ?? runs.error} onRetry={retryFailed} />
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

  // Ни одного успешного прогона и прогон не выбран в ссылке — показывать нечего, а не вечная загрузка.
  // Неудачная повторная проверка видна сообщением об ошибке, а не тем же экраном молча.
  if (!runId) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Контроль качества данных</h1>
        {runs.isError ? (
          <QueryError error={runs.error} onRetry={retryFailed} title="Не удалось обновить список прогонов" />
        ) : (
          <section className={styles.emptyUnit}>
            <Empty description="Успешных прогонов ККД пока нет — результаты появятся после первого успешного прогона.">
              <Button icon={<ReloadOutlined aria-hidden />} loading={runs.isFetching} onClick={() => runs.refetch()}>
                Проверить ещё раз
              </Button>
            </Empty>
          </section>
        )}
      </main>
    );
  }

  const unitName = meta.data.units.find((u) => u.id === params.unitId)?.name;
  const data = summary.data;
  // из списка прогонов, а не из сводки: пока сводка нового прогона грузится, на экране ещё прошлая
  const hasComparison = selectedRun ? Boolean(selectedRun.compared_to_run_id) : Boolean(data?.compared_to);
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
    <DictionariesProvider meta={meta.data}>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Контроль качества данных</h1>
            <p className={styles.subtitle}>
              {data && !summaryIsStale ? data.unit.path.map((p) => p.name).join(' / ') : unitName}
              {/* метрики и список проблем подразделения API считает вместе со всеми вложенными */}
              {unitHasChildren && ' · с учётом вложенных подразделений'}
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
            defaultUnit={meta.data.units.find((u) => u.id === DEFAULT_UNIT_ID)}
            onOpenRun={setRun}
            onOpenUnit={setUnit}
            // список прогонов перечитывается всегда: у прогона в работе мог смениться статус
            onRetry={() => {
              runs.refetch();
              retryFailed();
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
                <Spin indicator={<LoadingOutlined spin aria-hidden />} size="small" /> Обновляем данные…
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
                          onRetry={retryFailed}
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
                    runId={runId}
                    unitId={params.unitId}
                    enabled={runCompleted}
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

        <IssueModal issueId={params.issueId} runId={runId} hasComparison={hasComparison} onClose={closeIssue} />
      </main>
    </DictionariesProvider>
  );
}
