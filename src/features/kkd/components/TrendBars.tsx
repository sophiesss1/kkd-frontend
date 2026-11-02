import { Skeleton, Tooltip } from 'antd';
import { useTrend } from '../../../api/queries';
import type { TrendPoint } from '../../../api/types';
import { formatDate, formatMetricValue } from '../../../shared/format';
import styles from './TrendBars.module.css';

interface Props {
  unitId: string;
  metric: string;
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
}

function describe(point: TrendPoint, unit: string) {
  if (point.run_status === 'failed') return 'прогон завершился с ошибкой — значения нет';
  if (point.run_status === 'running') return 'прогон выполняется';
  return formatMetricValue(point.value, unit);
}

/** Динамика метрики по последним прогонам. Значения — из GET /api/kkd/trend, высота столбца — только визуализация. */
export function TrendBars({ unitId, metric, selectedRunId, onSelectRun }: Props) {
  const trend = useTrend(unitId, metric);
  if (trend.isPending) return <Skeleton.Input active block className={styles.skeleton} />;
  if (!trend.data) return null;

  const { points, metric: meta } = trend.data;
  const max = meta.unit === '%' ? 100 : Math.max(...points.map((p) => p.value ?? 0), 1);

  return (
    <figure className={styles.root}>
      <figcaption className={styles.caption}>Динамика по прогонам</figcaption>
      <ol className={styles.bars}>
        {points.map((point) => {
          const selected = point.run_id === selectedRunId;
          const hasValue = point.value !== null;
          const label = `${point.run_id} от ${formatDate(point.snapshot_date)}: ${describe(point, meta.unit)}`;
          return (
            <li key={point.run_id} className={styles.item}>
              <Tooltip title={label}>
                <button
                  type="button"
                  className={`${styles.bar} ${selected ? styles.selected : ''}`}
                  onClick={() => onSelectRun(point.run_id)}
                  aria-label={`${label}. Открыть прогон`}
                  aria-current={selected || undefined}
                >
                  {hasValue ? (
                    <span className={styles.fill} style={{ height: `${Math.max((point.value! / max) * 100, 2)}%` }} />
                  ) : (
                    <span className={styles.gap} aria-hidden>
                      {point.run_status === 'failed' ? '×' : '…'}
                    </span>
                  )}
                </button>
              </Tooltip>
              <span className={`${styles.date} ${selected ? styles.dateSelected : ''}`}>
                {formatDate(point.snapshot_date).slice(0, 5)}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
