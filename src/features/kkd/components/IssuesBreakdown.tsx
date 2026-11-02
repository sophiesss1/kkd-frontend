import { CheckCircleOutlined, ClockCircleOutlined, PlusCircleOutlined, RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { DeltaStatus, Metric, SeverityCode, Summary } from '../../../api/types';
import { DeltaIndicator, NO_COMPARISON_TEXT, trendFromDirection } from '../../../shared/DeltaIndicator';
import { formatMetricValue, formatNumber } from '../../../shared/format';
import { SeverityTag } from '../../../shared/tags';
import styles from './IssuesBreakdown.module.css';

const DELTA_COUNTERS: { code: DeltaStatus; title: string; hint: string; icon: ReactNode; tone: string }[] = [
  { code: 'new', title: 'Новые', hint: 'появились в этом прогоне', icon: <PlusCircleOutlined aria-hidden />, tone: styles.new },
  { code: 'persisting', title: 'Сохраняются', hint: 'были и в прошлом прогоне', icon: <ClockCircleOutlined aria-hidden />, tone: styles.persisting },
  { code: 'resolved', title: 'Исправлены', hint: 'были в прошлом прогоне, теперь нет', icon: <CheckCircleOutlined aria-hidden />, tone: styles.resolved },
];

interface Props {
  summary: Summary;
  issuesTotal: Metric | undefined;
  /** Направление метрики «число проблем» из /api/meta — для оценки дельты по важности. */
  issuesHigherIsBetter: boolean | null;
  onDeltaStatusClick: (status: DeltaStatus) => void;
  onSeverityClick: (severity: SeverityCode) => void;
}

export function IssuesBreakdown({ summary, issuesTotal, issuesHigherIsBetter, onDeltaStatusClick, onSeverityClick }: Props) {
  const hasComparison = summary.compared_to !== null;

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby="delta-heading">
        <h3 id="delta-heading" className={styles.heading}>
          Изменения с прошлого прогона
        </h3>
        {hasComparison ? (
          <ul className={styles.counters}>
            {DELTA_COUNTERS.map((c) => {
              const value = summary.delta[c.code];
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    className={`${styles.counter} ${c.tone}`}
                    onClick={() => onDeltaStatusClick(c.code)}
                    disabled={value === null}
                    aria-label={`${c.title}: ${value ?? NO_COMPARISON_TEXT}. Показать в списке проблем`}
                  >
                    <span className={styles.counterTitle}>
                      {c.icon} {c.title}
                    </span>
                    <span className={styles.counterValue}>{value === null ? '—' : formatNumber(value)}</span>
                    <span className={styles.counterHint}>
                      {c.hint} <RightOutlined aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.empty}>
            Первый прогон — {NO_COMPARISON_TEXT}. Новые, сохраняющиеся и исправленные проблемы появятся после следующего
            прогона.
          </p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="severity-heading">
        <div className={styles.headingRow}>
          <h3 id="severity-heading" className={styles.heading}>
            Проблемы по важности
          </h3>
          {issuesTotal && (
            <span className={styles.total}>
              всего <strong>{formatMetricValue(issuesTotal.value, issuesTotal.unit)}</strong>{' '}
              <DeltaIndicator delta={issuesTotal.delta} trend={issuesTotal.trend} size="small" />
            </span>
          )}
        </div>
        <ul className={styles.severityList}>
          {summary.issues_by_severity.map((row) => (
            <li key={row.code}>
              <button
                type="button"
                className={styles.severityRow}
                onClick={() => onSeverityClick(row.code)}
                aria-label={`${row.title}: ${row.current}. Показать в списке проблем`}
              >
                <SeverityTag severity={row.code} />
                <span className={styles.severityValue}>{formatNumber(row.current)}</span>
                <DeltaIndicator delta={row.delta} trend={trendFromDirection(row.delta, issuesHigherIsBetter)} size="small" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
