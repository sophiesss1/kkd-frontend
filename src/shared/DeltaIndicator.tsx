import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from '@ant-design/icons';
import type { Trend } from '../api/types';
import { formatDelta, formatPercentChange } from './format';
import styles from './DeltaIndicator.module.css';

export const TREND_LABEL: Record<Trend, string> = {
  better: 'лучше',
  worse: 'хуже',
  same: 'без изменений',
};

export const NO_COMPARISON_TEXT = 'нет данных для сравнения';

interface Props {
  delta: number | null;
  /**
   * Оценка «лучше / хуже» приходит из API и не выводится из знака дельты:
   * рост числа проблем — это «хуже», рост доли корректных целей — «лучше».
   * null при ненулевой дельте — нейтральная метрика (например, число целей).
   */
  trend: Trend | null;
  unit?: string;
  deltaPct?: number | null;
  size?: 'default' | 'small';
}

export function DeltaIndicator({ delta, trend, unit, deltaPct, size = 'default' }: Props) {
  if (delta === null) {
    return <span className={`${styles.root} ${styles.none} ${styles[size]}`}>{NO_COMPARISON_TEXT}</span>;
  }

  const Icon = delta > 0 ? ArrowUpOutlined : delta < 0 ? ArrowDownOutlined : MinusOutlined;
  const tone = trend === 'better' ? styles.better : trend === 'worse' ? styles.worse : styles.neutral;
  const label = trend ? TREND_LABEL[trend] : null;
  const text = formatDelta(delta, unit);
  const showPct = deltaPct !== null && deltaPct !== undefined && unit !== '%' && delta !== 0;

  return (
    <span
      className={`${styles.root} ${tone} ${styles[size]}`}
      aria-label={`Изменение ${text}${label ? `, ${label}` : ''}`}
    >
      <Icon aria-hidden className={styles.icon} />
      <span className={styles.value}>{text}</span>
      {showPct && <span className={styles.pct}>({formatPercentChange(deltaPct)})</span>}
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
}

/**
 * Там, где API не отдаёт trend (разбивки по важности и правилам, метрики подразделений), оценка
 * берётся из направления метрики в /api/meta (`higher_is_better`). Это интерпретация знака, а не пересчёт:
 * само число дельты — из API. Без направления (нейтральная метрика) оценки нет.
 */
export function trendFromDirection(delta: number | null, higherIsBetter: boolean | null | undefined): Trend | null {
  if (delta === null || higherIsBetter === null || higherIsBetter === undefined) return null;
  if (delta === 0) return 'same';
  return delta > 0 === higherIsBetter ? 'better' : 'worse';
}
