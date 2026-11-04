import { ExclamationCircleFilled, ReloadOutlined, WarningFilled } from '@ant-design/icons';
import { Button, Result } from 'antd';
import { ApiError } from '../../../api/client';
import type { Run, Unit } from '../../../api/types';
import { formatDate } from '../../../shared/format';
import { QueryError } from '../../../shared/QueryError';
import styles from './RunUnavailable.module.css';

interface Props {
  error: unknown;
  run: Run | undefined;
  latestCompleted: Run | undefined;
  /** Подразделение по умолчанию — выход, если подразделения из ссылки нет. */
  defaultUnit: Unit | undefined;
  onOpenRun: (runId: string) => void;
  onOpenUnit: (unitId: string) => void;
  onRetry: () => void;
}

/** Результаты прогона недоступны: прогон упал (409 RUN_FAILED), ещё идёт (409 RUN_IN_PROGRESS) или не найден. */
export function RunUnavailable({ error, run, latestCompleted, defaultUnit, onOpenRun, onOpenUnit, onRetry }: Props) {
  const code = error instanceof ApiError ? error.code : null;
  const fallback =
    latestCompleted && latestCompleted.id !== run?.id ? (
      <Button key="latest" type="primary" onClick={() => onOpenRun(latestCompleted.id)}>
        Открыть {latestCompleted.id} от {formatDate(latestCompleted.snapshot_date)}
      </Button>
    ) : null;

  if (code === 'RUN_FAILED') {
    return (
      <Result
        className={styles.card}
        status="warning"
        // значки antd по умолчанию озвучивались бы по-английски («warning», «exclamation-circle»)
        icon={<WarningFilled aria-hidden />}
        title={`Прогон ${run?.id ?? ''} завершился с ошибкой — результатов нет`}
        subTitle={run?.error ?? (error as ApiError).message}
        extra={fallback}
      />
    );
  }

  if (code === 'RUN_IN_PROGRESS') {
    return (
      <Result
        className={styles.card}
        status="info"
        icon={<ExclamationCircleFilled aria-hidden />}
        title={`Прогон ${run?.id ?? ''} ещё выполняется`}
        subTitle="Результаты появятся после завершения прогона."
        extra={[
          <Button key="retry" icon={<ReloadOutlined aria-hidden />} onClick={onRetry}>
            Проверить ещё раз
          </Button>,
          fallback,
        ]}
      />
    );
  }

  // другой прогон с тем же подразделением дал бы ту же ошибку: выход — подразделение по умолчанию
  if (code === 'UNIT_NOT_FOUND') {
    return (
      <Result
        className={styles.card}
        status="404"
        title={(error as ApiError).message}
        extra={
          defaultUnit && (
            <Button type="primary" onClick={() => onOpenUnit(defaultUnit.id)}>
              Открыть «{defaultUnit.name}»
            </Button>
          )
        }
      />
    );
  }

  if (code === 'RUN_NOT_FOUND') {
    return <Result className={styles.card} status="404" title={(error as ApiError).message} extra={fallback} />;
  }

  return <QueryError error={error} onRetry={onRetry} title="Не удалось загрузить сводку ККД" />;
}
