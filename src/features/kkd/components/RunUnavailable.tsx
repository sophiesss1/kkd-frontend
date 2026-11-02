import { ReloadOutlined } from '@ant-design/icons';
import { Button, Result } from 'antd';
import { ApiError } from '../../../api/client';
import type { Run } from '../../../api/types';
import { formatDate } from '../../../shared/format';
import { QueryError } from '../../../shared/QueryError';

interface Props {
  error: unknown;
  run: Run | undefined;
  latestCompleted: Run | undefined;
  onOpenRun: (runId: string) => void;
  onRetry: () => void;
}

/** Результаты прогона недоступны: прогон упал (409 RUN_FAILED), ещё идёт (409 RUN_IN_PROGRESS) или не найден. */
export function RunUnavailable({ error, run, latestCompleted, onOpenRun, onRetry }: Props) {
  const code = error instanceof ApiError ? error.code : null;
  const fallback =
    latestCompleted && latestCompleted.id !== run?.id ? (
      <Button type="primary" onClick={() => onOpenRun(latestCompleted.id)}>
        Открыть {latestCompleted.id} от {formatDate(latestCompleted.snapshot_date)}
      </Button>
    ) : null;

  if (code === 'RUN_FAILED') {
    return (
      <Result
        status="warning"
        title={`Прогон ${run?.id ?? ''} завершился с ошибкой — результатов нет`}
        subTitle={run?.error ?? (error as ApiError).message}
        extra={fallback}
      />
    );
  }

  if (code === 'RUN_IN_PROGRESS') {
    return (
      <Result
        status="info"
        title={`Прогон ${run?.id ?? ''} ещё выполняется`}
        subTitle="Результаты появятся после завершения прогона."
        extra={[
          <Button key="retry" icon={<ReloadOutlined />} onClick={onRetry}>
            Проверить ещё раз
          </Button>,
          fallback,
        ]}
      />
    );
  }

  if (code === 'RUN_NOT_FOUND' || code === 'UNIT_NOT_FOUND') {
    return <Result status="404" title={(error as ApiError).message} extra={fallback} />;
  }

  return <QueryError error={error} onRetry={onRetry} title="Не удалось загрузить сводку ККД" />;
}
