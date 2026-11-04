import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../../app/App';
import fixture from '../../test/fixtures/run-008.json';

/** Вариант данных для отдельного теста: успешных прогонов нет. */
let onlyFailedRuns = false;

/** Ответы mock API из снимка; на запрос, которого в снимке нет, — 404 в формате API. */
function respond(path: string, params: URLSearchParams): unknown {
  const unit = params.get('unit_id') ?? '';
  switch (path) {
    case '/api/meta':
      return fixture.meta;
    case '/api/runs':
      return onlyFailedRuns
        ? { ...fixture.runs, items: fixture.runs.items.map((r) => ({ ...r, status: 'failed' })) }
        : fixture.runs;
    case '/api/kkd/summary':
      return fixture.summary[unit as keyof typeof fixture.summary];
    case '/api/kkd/units':
      return fixture.units;
    case '/api/kkd/trend':
      return fixture.trend[unit as keyof typeof fixture.trend];
    case '/api/kkd/issues':
      return fixture.issues;
    default:
      return undefined;
  }
}

let calls: string[] = [];
/** Пока не вызван, список проблем «грузится» — так видно состояние кнопки выгрузки до ответа. */
let releaseIssues: () => void = () => {};

beforeEach(() => {
  calls = [];
  onlyFailedRuns = false;
  const issuesGate = new Promise<void>((resolve) => (releaseIssues = resolve));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.origin);
      calls.push(url.pathname + url.search);
      // так mock API отвечает на подразделение, которого нет
      if (url.searchParams.get('unit_id') === 'XYZ') {
        return new Response(
          JSON.stringify({ error: { code: 'UNIT_NOT_FOUND', message: 'Подразделение XYZ не найдено' } }),
          { status: 404 },
        );
      }
      if (url.pathname === '/api/kkd/issues') await issuesGate;
      const body = respond(url.pathname, url.searchParams);
      return body === undefined
        ? new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: url.pathname } }), { status: 404 })
        : new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Переход как по «назад» или по ссылке: адрес меняется, страница слушает popstate. */
function navigate(url: string) {
  act(() => {
    window.history.pushState(null, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

const requests = (path: string) => calls.filter((call) => call.split('?')[0] === path);

describe('страница ККД с данными mock API', () => {
  it('один запрос разреза на прогон: переход в подразделение его не повторяет', async () => {
    window.history.replaceState(null, '', '/');
    render(<App />);

    // B2B, RUN-008: итог «лучше», а оговорка называет худшее вложенное подразделение (A11)
    expect(
      await screen.findByText('но хуже в 5 подразделениях, сильнее всего — Управление региональных продаж (−25,5 п.п.)'),
    ).toBeInTheDocument();

    // клик по строке «Где стало хуже» открывает подразделение без перезагрузки, URL обновлён (A12).
    // Кнопка ищется по тексту: getByRole с именем на всей странице в jsdom считает имена всех кнопок и очень медленный.
    const unitRow = screen
      .getAllByText('Управление региональных продаж')
      .map((el) => el.closest('button'))
      .find(Boolean)!;
    fireEvent.click(unitRow);
    expect(window.location.search).toBe('?unit=CIB-REG');
    expect(
      await screen.findByText('Корпоративный блок / Департамент корпоративного бизнеса / Управление региональных продаж'),
    ).toBeInTheDocument();

    // Через минуту (дольше staleTime по умолчанию) — в подразделение с дочерними (HQ-CIB). У CIB-REG дочерних нет,
    // и запрос разреза там был выключен: его повторное включение не должно запросить разрез заново (A16).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 61_000);
    navigate('/?unit=HQ-CIB');
    expect(await screen.findByText(/^Корпоративный блок \/ Департамент корпоративного бизнеса · /)).toBeInTheDocument();
    expect(await screen.findByText('Где стало хуже')).toBeInTheDocument();

    expect(requests('/api/kkd/summary')).toEqual([
      '/api/kkd/summary?run_id=RUN-008&unit_id=B2B',
      '/api/kkd/summary?run_id=RUN-008&unit_id=CIB-REG',
      '/api/kkd/summary?run_id=RUN-008&unit_id=HQ-CIB',
    ]);
    expect(requests('/api/kkd/units')).toEqual(['/api/kkd/units?run_id=RUN-008']);
    expect(requests('/api/meta')).toHaveLength(1);
    expect(requests('/api/runs')).toHaveLength(1);
  });

  it('клик по уже показанному прогону в динамике не добавляет запись в историю (A9)', async () => {
    window.history.replaceState(null, '', '/');
    render(<App />);

    const current = await screen.findByLabelText(/^RUN-008 от .*Показан сейчас$/);
    const length = window.history.length;
    fireEvent.click(current);

    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(length);
  });

  it('«Выгрузить CSV» выключена, пока список грузится, и ведёт на выгрузку с текущими фильтрами', async () => {
    window.history.replaceState(null, '', '/?severity=critical');
    render(<App />);

    // кнопка-ссылка antd: выключенная — <a aria-disabled> без href
    const exportButton = (await screen.findByText('Выгрузить CSV')).closest('a')!;
    expect(exportButton).toHaveAttribute('aria-disabled', 'true');
    expect(exportButton).not.toHaveAttribute('href');

    releaseIssues();
    await waitFor(() =>
      expect(exportButton).toHaveAttribute('href', '/api/kkd/issues/export?run_id=RUN-008&unit_id=B2B&severity=critical'),
    );
    expect(exportButton).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('неизвестное подразделение из ссылки: выход на подразделение по умолчанию (A19)', async () => {
    window.history.replaceState(null, '', '/?unit=XYZ');
    render(<App />);

    expect(await screen.findByText('Подразделение XYZ не найдено')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Открыть «Корпоративный блок»').closest('button')!);
    expect(window.location.search).toBe('');
    expect(
      await screen.findByText('но хуже в 5 подразделениях, сильнее всего — Управление региональных продаж (−25,5 п.п.)'),
    ).toBeInTheDocument();
  });

  it('нет ни одного успешного прогона — сообщение, а не вечная загрузка', async () => {
    window.history.replaceState(null, '', '/');
    onlyFailedRuns = true;
    render(<App />);

    expect(await screen.findByText(/Успешных прогонов ККД пока нет/)).toBeInTheDocument();
    expect(requests('/api/kkd/summary')).toEqual([]);
  });
});
