import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { ApiError } from '../api/client';
import { KkdPage } from '../features/kkd/KkdPage';
import { AppHeader } from './AppHeader';
import { theme } from './theme';
import styles from './App.module.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // 4xx — осмысленный ответ сервера (404, 409 RUN_FAILED, 422), повторять бессмысленно
      retry: (failureCount, error) => !(error instanceof ApiError && error.isClientError) && failureCount < 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme} locale={ruRU}>
        <AntApp className={styles.app}>
          <AppHeader />
          <KkdPage />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
