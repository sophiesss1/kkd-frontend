import { CloseCircleFilled, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { ApiError } from '../api/client';

interface Props {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/** Ошибка запроса: сетевую можно повторить, ответ 4xx показываем как есть. */
export function QueryError({ error, onRetry, title = 'Не удалось загрузить данные' }: Props) {
  const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
  const retryable = !(error instanceof ApiError && error.isClientError);
  return (
    <Alert
      type="error"
      showIcon
      // значок antd по умолчанию озвучивался бы как «close-circle» перед текстом ошибки
      icon={<CloseCircleFilled aria-hidden />}
      role="alert"
      message={title}
      description={message}
      action={
        retryable && onRetry ? (
          <Button icon={<ReloadOutlined aria-hidden />} onClick={onRetry}>
            Повторить
          </Button>
        ) : undefined
      }
    />
  );
}
