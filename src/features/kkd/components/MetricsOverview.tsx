import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import type { Metric, Run, Trend } from '../../../api/types';
import { DeltaIndicator } from '../../../shared/DeltaIndicator';
import { formatMetricValue } from '../../../shared/format';
import styles from './MetricsOverview.module.css';

/** Порядок показа — решение по иерархии информации; сами значения берутся из API как есть. */
export const PRIMARY_METRIC = 'clean_goals_share';
const KEY_METRICS = ['critical_issues', 'goals_with_issues', 'cascade_coverage', 'kr_completeness'];
/** «Найдено проблем» показывается в блоке разбивки проблем по важности. */
export const ISSUES_TOTAL_METRIC = 'issues_total';

const VERDICT: Record<Trend, { text: string; className: string }> = {
  better: { text: 'Стало лучше', className: styles.better },
  worse: { text: 'Стало хуже', className: styles.worse },
  same: { text: 'Без изменений', className: styles.neutral },
};

function MetricTitle({ metric }: { metric: Metric }) {
  return (
    <span className={styles.title}>
      {metric.title}
      <Tooltip title={`Формула: ${metric.formula}`}>
        <InfoCircleOutlined className={styles.info} aria-label={`Как считается: ${metric.formula}`} tabIndex={0} />
      </Tooltip>
    </span>
  );
}

function Previous({ metric, comparedTo }: { metric: Metric; comparedTo: Run | null }) {
  if (metric.previous === null || !comparedTo) return null;
  return (
    <span className={styles.previous}>
      было {formatMetricValue(metric.previous, metric.unit)} в {comparedTo.id}
    </span>
  );
}

interface HeroProps {
  metric: Metric;
  comparedTo: Run | null;
  note?: ReactNode;
  footer?: ReactNode;
}

function HeroMetric({ metric, comparedTo, note, footer }: HeroProps) {
  const verdict = metric.trend ? VERDICT[metric.trend] : null;
  return (
    <article className={`${styles.card} ${styles.hero}`} aria-labelledby="hero-metric-title">
      <h3 id="hero-metric-title" className={styles.cardHeading}>
        <MetricTitle metric={metric} />
      </h3>
      {/* без сравнения вердикта нет — об этом скажет сам индикатор дельты ниже */}
      {verdict && (
        <p className={`${styles.verdict} ${verdict.className}`}>
          {verdict.text}
          {comparedTo && <span className={styles.verdictBase}> по сравнению с {comparedTo.id}</span>}
        </p>
      )}
      {note}
      <div className={styles.heroValue}>{formatMetricValue(metric.value, metric.unit)}</div>
      <div className={styles.deltaRow}>
        <DeltaIndicator delta={metric.delta} trend={metric.trend} unit={metric.unit} deltaPct={metric.delta_pct} />
        <Previous metric={metric} comparedTo={comparedTo} />
      </div>
      {footer && <div className={styles.heroFooter}>{footer}</div>}
    </article>
  );
}

function MetricCard({ metric, comparedTo }: { metric: Metric; comparedTo: Run | null }) {
  return (
    <article className={styles.card}>
      <h3 className={styles.cardHeading}>
        <MetricTitle metric={metric} />
      </h3>
      <div className={styles.value}>{formatMetricValue(metric.value, metric.unit)}</div>
      <DeltaIndicator delta={metric.delta} trend={metric.trend} unit={metric.unit} deltaPct={metric.delta_pct} size="small" />
      <Previous metric={metric} comparedTo={comparedTo} />
    </article>
  );
}

interface Props {
  metrics: Metric[];
  comparedTo: Run | null;
  /** Оговорка под вердиктом (например, «но хуже в N подразделениях»). */
  verdictNote?: ReactNode;
  /** Дополнительный блок внизу главной карточки (динамика по прогонам). */
  heroFooter?: ReactNode;
  /**
   * Блок рядом с главной метрикой (разрез по подразделениям). Если он есть, ключевые метрики
   * уходят строкой ниже; если нет (подразделение без дочерних) — стоят сеткой рядом с главной.
   */
  aside?: ReactNode;
}

export function MetricsOverview({ metrics, comparedTo, verdictNote, heroFooter, aside }: Props) {
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  const primary = byKey.get(PRIMARY_METRIC);
  const key = KEY_METRICS.map((k) => byKey.get(k)).filter((m): m is Metric => Boolean(m));
  const volume = metrics.filter(
    (m) => m.key !== PRIMARY_METRIC && m.key !== ISSUES_TOTAL_METRIC && !KEY_METRICS.includes(m.key),
  );

  const keyCards = key.map((m) => <MetricCard key={m.key} metric={m} comparedTo={comparedTo} />);

  return (
    <div className={styles.root}>
      <div className={aside ? styles.top : styles.grid}>
        {primary && <HeroMetric metric={primary} comparedTo={comparedTo} note={verdictNote} footer={heroFooter} />}
        {aside || keyCards}
      </div>
      {aside && <div className={styles.keyRow}>{keyCards}</div>}
      {volume.length > 0 && (
        <dl className={styles.volume} aria-label="Объём проверенных данных">
          {volume.map((m) => (
            <div key={m.key} className={styles.volumeItem}>
              <dt>{m.title}</dt>
              <dd>
                <span className={styles.volumeValue}>{formatMetricValue(m.value, m.unit)}</span>
                <DeltaIndicator delta={m.delta} trend={m.trend} unit={m.unit} size="small" />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
