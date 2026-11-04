import { SwapOutlined } from '@ant-design/icons';
import type { Run } from '../../../api/types';
import { formatDate } from '../../../shared/format';
import styles from './ComparisonNote.module.css';

interface Props {
  run: Run;
  runs: Run[];
}

/** Явно говорит, с каким прогоном идёт сравнение и почему именно с ним. */
export function ComparisonNote({ run, runs }: Props) {
  if (run.status !== 'completed') return null;

  const base = run.compared_to_run_id ? runs.find((r) => r.id === run.compared_to_run_id) : undefined;

  if (!run.compared_to_run_id) {
    return (
      <p className={styles.root}>
        <SwapOutlined aria-hidden className={styles.icon} />
        <span>
          <strong>{run.id}</strong> — первый прогон: сравнивать не с чем, дельта не рассчитывается.
        </span>
      </p>
    );
  }

  // Прогоны между текущим и базой сравнения — неуспешные: API сравнивает с предыдущим успешным.
  // «С ошибкой» пишем, только если так и есть по статусу: пропущенный может и выполняться.
  const skipped = base ? runs.filter((r) => r.number > base.number && r.number < run.number) : [];
  const many = skipped.length > 1;
  const reason = skipped.every((r) => r.status === 'failed')
    ? `завершил${many ? 'ись' : 'ся'} с ошибкой`
    : `не завершил${many ? 'ись' : 'ся'} успешно`;

  return (
    <p className={styles.root}>
      <SwapOutlined aria-hidden className={styles.icon} />
      <span>
        Прогон <strong>{run.id}</strong> от {formatDate(run.snapshot_date)} сравнивается с{' '}
        <strong>{run.compared_to_run_id}</strong>
        {base && <> от {formatDate(base.snapshot_date)}</>}
        {skipped.length > 0 && (
          <span className={styles.secondary}>
            {' '}
            — {skipped.map((r) => r.id).join(', ')} пропущен{many ? 'ы' : ''}: {reason}
          </span>
        )}
      </span>
    </p>
  );
}
