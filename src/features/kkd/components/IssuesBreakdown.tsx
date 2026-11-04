import { CheckCircleOutlined, ClockCircleOutlined, PlusCircleOutlined, RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { DeltaStatus, Metric, SeverityCode, Summary } from '../../../api/types';
import { DeltaIndicator, NO_COMPARISON_TEXT, trendFromDirection } from '../../../shared/DeltaIndicator';
import { useDictionaries } from '../../../shared/dictionaries';
import { formatMetricValue, formatNumber } from '../../../shared/format';
import { SeverityTag } from '../../../shared/tags';
import { VisuallyHidden } from '../../../shared/VisuallyHidden';
import styles from './IssuesBreakdown.module.css';

/**
 * Оформление счётчиков. Заголовки во множественном числе с пояснением — текст интерфейса, а не справочник:
 * в /api/meta статусы подписаны в единственном числе («Новая»), так они и выводятся в тегах и фильтре.
 * Какие счётчики и в каком порядке — по справочнику статусов из /api/meta.
 */
const DELTA_COUNTER_VIEW: Record<DeltaStatus, { title: string; hint: string; icon: ReactNode; tone: string }> = {
  new: { title: 'Новые', hint: 'появились в этом прогоне', icon: <PlusCircleOutlined aria-hidden />, tone: styles.new },
  persisting: { title: 'Сохраняются', hint: 'были и в прошлом прогоне', icon: <ClockCircleOutlined aria-hidden />, tone: styles.persisting },
  resolved: { title: 'Исправлены', hint: 'были в прошлом прогоне, теперь нет', icon: <CheckCircleOutlined aria-hidden />, tone: styles.resolved },
};

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
  const { deltaStatusCodes } = useDictionaries();
  const counters = deltaStatusCodes.map((code) => ({ code, ...DELTA_COUNTER_VIEW[code] }));

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby="delta-heading">
        <h3 id="delta-heading" className={styles.heading}>
          Изменения с прошлого прогона
        </h3>
        {hasComparison ? (
          <ul className={styles.counters}>
            {counters.map((c) => {
              const value = summary.delta[c.code];
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    className={`${styles.counter} ${c.tone}`}
                    onClick={() => onDeltaStatusClick(c.code)}
                    disabled={value === null}
                  >
                    <span className={styles.counterTitle}>
                      {c.icon} {c.title}
                    </span>
                    <span className={styles.counterValue}>
                      {value === null ? (
                        <>
                          <span aria-hidden>—</span>
                          <VisuallyHidden>{NO_COMPARISON_TEXT}</VisuallyHidden>
                        </>
                      ) : (
                        formatNumber(value)
                      )}
                    </span>
                    <span className={styles.counterHint}>
                      {c.hint} <RightOutlined aria-hidden />
                    </span>
                    <VisuallyHidden>. Показать в списке проблем</VisuallyHidden>
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
              {issuesTotal.previous !== null && (
                <span className={styles.previous}>
                  {' '}
                  было {formatMetricValue(issuesTotal.previous, issuesTotal.unit)}
                </span>
              )}
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
              >
                <SeverityTag severity={row.code} />
                <span className={styles.severityValue}>{formatNumber(row.current)}</span>
                <DeltaIndicator delta={row.delta} trend={trendFromDirection(row.delta, issuesHigherIsBetter)} size="small" />
                <VisuallyHidden>. Показать в списке проблем</VisuallyHidden>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
