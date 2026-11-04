import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import fixture from '../../../test/fixtures/run-008.json';
import { TrendBars } from './TrendBars';

afterEach(() => vi.unstubAllGlobals());

describe('динамика по прогонам', () => {
  it('ошибка запроса показывается с кнопкой «Повторить», а не скрывает блок (A18)', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        fail
          ? new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Сервис недоступен' } }), {
              status: 503,
            })
          : new Response(JSON.stringify(fixture.trend.B2B), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TrendBars unitId="B2B" metric="clean_goals_share" selectedRunId="RUN-008" onSelectRun={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Не удалось загрузить динамику по прогонам')).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /Повторить/ }));
    expect(await screen.findByText('Динамика по прогонам')).toBeInTheDocument();
  });
});
