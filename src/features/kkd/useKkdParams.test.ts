import { act, renderHook } from '@testing-library/react';
import { parseParams, useKkdParams } from './useKkdParams';

describe('parseParams', () => {
  it('значения по умолчанию', () => {
    expect(parseParams('')).toEqual({
      unitId: 'B2B',
      runId: undefined,
      filters: { rule_code: [], severity: [], delta_status: [], q: '', sort: 'severity' },
      page: 1,
      pageSize: 20,
      issueId: null,
    });
  });

  it('читает фильтры и игнорирует мусор', () => {
    const p = parseParams('?unit=CIB-REG&run=RUN-007&status=new,resolved&sort=bogus&page=-2');
    expect(p.unitId).toBe('CIB-REG');
    expect(p.runId).toBe('RUN-007');
    expect(p.filters.delta_status).toEqual(['new', 'resolved']);
    expect(p.filters.sort).toBe('severity');
    expect(p.page).toBe(1);
  });

  it('отбрасывает коды и размер страницы, которые API отверг бы ошибкой 422', () => {
    const p = parseParams('?severity=critical,foo&status=bar,new&size=500');
    expect(p.filters.severity).toEqual(['critical']);
    expect(p.filters.delta_status).toEqual(['new']);
    expect(p.pageSize).toBe(20);
    expect(parseParams('?size=50').pageSize).toBe(50);
  });
});

describe('useKkdParams', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  it('смена подразделения сбрасывает страницу и закрывает карточку, фильтры сохраняет', () => {
    window.history.replaceState(null, '', '/?severity=critical&page=3&issue=ISS-1');
    const { result } = renderHook(() => useKkdParams());

    act(() => result.current.setUnit('HQ-SME'));

    expect(result.current.params.unitId).toBe('HQ-SME');
    expect(result.current.params.page).toBe(1);
    expect(result.current.params.issueId).toBeNull();
    expect(result.current.params.filters.severity).toEqual(['critical']);
    expect(window.location.search).toBe('?unit=HQ-SME&severity=critical');
  });

  it('изменение фильтра возвращает на первую страницу', () => {
    window.history.replaceState(null, '', '/?page=4');
    const { result } = renderHook(() => useKkdParams());

    act(() => result.current.setFilters({ rule_code: ['GOAL_NO_KR'] }));

    expect(result.current.params.page).toBe(1);
    expect(result.current.params.filters.rule_code).toEqual(['GOAL_NO_KR']);
  });

  it('повторный выбор того же значения не добавляет запись в историю', () => {
    const { result } = renderHook(() => useKkdParams());
    act(() => result.current.setFilters({ delta_status: ['new'] }));
    const length = window.history.length;

    act(() => result.current.setFilters({ delta_status: ['new'] }));
    act(() => result.current.setRun('RUN-008'));
    act(() => result.current.setRun('RUN-008'));

    expect(window.history.length).toBe(length + 1);
    expect(window.location.search).toBe('?run=RUN-008&status=new');
  });
});
