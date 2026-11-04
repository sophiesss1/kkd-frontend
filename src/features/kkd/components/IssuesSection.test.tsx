import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { Meta, Rule } from '../../../api/types';
import { DictionariesProvider } from '../../../shared/dictionaries';
import fixture from '../../../test/fixtures/run-008.json';
import { EMPTY_FILTERS } from '../useKkdParams';
import { IssuesSection } from './IssuesSection';

let calls: string[] = [];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.origin);
      calls.push(url.pathname + url.search);
      return new Response(JSON.stringify(fixture.issues), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderSection(props: Partial<ComponentProps<typeof IssuesSection>>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DictionariesProvider meta={fixture.meta as Meta}>
        <IssuesSection
          runId="RUN-008"
          unitId="B2B"
          enabled
          hasComparison
          rules={fixture.meta.rules as Rule[]}
          filters={EMPTY_FILTERS}
          page={1}
          pageSize={20}
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
          onPageChange={vi.fn()}
          onOpenIssue={vi.fn()}
          {...props}
        />
      </DictionariesProvider>
    </QueryClientProvider>,
  );
}

describe('список проблем', () => {
  it('карточка проблемы открывается кнопкой, доступной с клавиатуры', async () => {
    const onOpenIssue = vi.fn();
    renderSection({ onOpenIssue });

    const [title] = await screen.findAllByRole('button', { name: 'Цель без ответственного' });
    // нативная кнопка: в порядке Tab, Enter и пробел вызывают click (в jsdom нажатие клавиш click не порождает)
    expect(title.tagName).toBe('BUTTON');
    title.focus();
    expect(title).toHaveFocus();

    // клик по строке таблицы второй раз карточку не открывает
    fireEvent.click(title);
    expect(onOpenIssue).toHaveBeenCalledTimes(1);
    expect(onOpenIssue).toHaveBeenCalledWith('ISS-8E97CCCACA');
  });

  it('в первом прогоне фильтр статуса из URL не применяется ни к списку, ни к выгрузке', async () => {
    renderSection({ hasComparison: false, filters: { ...EMPTY_FILTERS, delta_status: ['resolved'] } });

    await screen.findAllByRole('button', { name: 'Цель без ответственного' });
    expect(calls).toEqual(['/api/kkd/issues?run_id=RUN-008&unit_id=B2B&sort=severity&limit=20&offset=0']);
    expect(screen.getByText('Выгрузить CSV').closest('a')).toHaveAttribute(
      'href',
      '/api/kkd/issues/export?run_id=RUN-008&unit_id=B2B',
    );
    expect(screen.queryByText('Сбросить фильтры')).not.toBeInTheDocument();
  });

  it('правило из ссылки, которого нет в справочнике, в запрос не уходит', async () => {
    renderSection({ filters: { ...EMPTY_FILTERS, rule_code: ['GOAL_NO_OWNER', 'UNKNOWN_RULE'] } });

    await screen.findAllByRole('button', { name: 'Цель без ответственного' });
    expect(calls).toEqual([
      '/api/kkd/issues?run_id=RUN-008&unit_id=B2B&rule_code=GOAL_NO_OWNER&sort=severity&limit=20&offset=0',
    ]);
  });

  it('страница за концом списка заменяется последней, а не показывает «проблем нет»', async () => {
    const onPageChange = vi.fn();
    renderSection({ page: 10, onPageChange });

    // в снимке 61 проблема: при 20 на странице последняя — четвёртая
    await waitFor(() => expect(onPageChange).toHaveBeenCalledWith(4, 20, { replace: true }));
    expect(screen.queryByText('Проблем не найдено — данные подразделения в порядке')).not.toBeInTheDocument();
  });

  it('поиск добавляет в историю одну запись, уточнения до ухода из поля её заменяют', async () => {
    const onFiltersChange = vi.fn();
    renderSection({ onFiltersChange });
    const search = screen.getByLabelText('Поиск по проблемам');

    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'Ива' } });
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Ива' }, { replace: false }));
    fireEvent.change(search, { target: { value: 'Иван' } });
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Иван' }, { replace: true }));

    fireEvent.blur(search);
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'Пет' } });
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Пет' }, { replace: false }));
  });

  it('уточнение, набранное до ухода из поля, заменяет запись; после ухода новый поиск добавляет свою', async () => {
    const onFiltersChange = vi.fn();
    renderSection({ onFiltersChange });
    const search = screen.getByLabelText('Поиск по проблемам');

    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'Ива' } });
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Ива' }, { replace: false }));
    // дописали и сразу ушли из поля, раньше чем сработала задержка
    fireEvent.change(search, { target: { value: 'Иван' } });
    fireEvent.blur(search);
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Иван' }, { replace: true }));

    // набрали и ушли раньше задержки — запись добавлена, но следующий заход в поле снова добавляет свою
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'Пет' } });
    fireEvent.blur(search);
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Пет' }, { replace: false }));
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'Петр' } });
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith({ q: 'Петр' }, { replace: false }));
  });

  it('пока список грузится после сброса фильтров, «данные в порядке» по прошлому пустому ответу не показывается', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), window.location.origin);
        const body = url.searchParams.has('severity') ? { ...fixture.issues, items: [], total: 0 } : (await gate, fixture.issues);
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = (filters: typeof EMPTY_FILTERS) => (
      <QueryClientProvider client={client}>
        <DictionariesProvider meta={fixture.meta as Meta}>
          <IssuesSection
            runId="RUN-008"
            unitId="B2B"
            enabled
            hasComparison
            rules={fixture.meta.rules as Rule[]}
            filters={filters}
            page={1}
            pageSize={20}
            onFiltersChange={vi.fn()}
            onResetFilters={vi.fn()}
            onPageChange={vi.fn()}
            onOpenIssue={vi.fn()}
          />
        </DictionariesProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(view({ ...EMPTY_FILTERS, severity: ['critical'] }));
    expect(await screen.findByText('По выбранным фильтрам проблем нет')).toBeInTheDocument();

    rerender(view(EMPTY_FILTERS));
    expect(screen.queryByText('Проблем не найдено — данные подразделения в порядке')).not.toBeInTheDocument();
    release();
    expect(await screen.findAllByRole('button', { name: 'Цель без ответственного' })).not.toHaveLength(0);
  });

  it('«Сбросить фильтры» отменяет набранный, но ещё не отправленный поиск', async () => {
    const onFiltersChange = vi.fn();
    const onResetFilters = vi.fn();
    renderSection({ filters: { ...EMPTY_FILTERS, severity: ['critical'] }, onFiltersChange, onResetFilters });
    await screen.findAllByRole('button', { name: 'Цель без ответственного' });

    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('Поиск по проблемам'), { target: { value: 'Ива' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    act(() => vi.advanceTimersByTime(1000));

    expect(onResetFilters).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Поиск по проблемам')).toHaveValue('');
  });

  it('кнопки поиска, очистки, выгрузки и пагинации не дают английских имён', async () => {
    renderSection({});
    await screen.findAllByRole('button', { name: 'Цель без ответственного' });
    // кнопка очистки поиска появляется, только когда в поле есть текст
    fireEvent.change(screen.getByLabelText('Поиск по проблемам'), { target: { value: 'Ива' } });

    expect(screen.getByRole('button', { name: 'Найти' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Очистить поиск' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Следующая страница' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /search|download|close|left|right/i })).not.toBeInTheDocument();
  });
});
