import { render, screen } from '@testing-library/react';
import type { UnitMetricsRow } from '../../api/types';
import { BreakdownCaveat } from './components/UnitsBreakdown';
import { buildUnitsBreakdown } from './unitsBreakdown';

type Row = [id: string, name: string, parent: string | null, share: number | null, delta: number | null];

/** Доли корректных целей и дельты из GET /api/kkd/units?run_id=RUN-008 (mock API). */
const RUN_008: Row[] = [
  ['B2B', 'Корпоративный блок', null, 75.8, 0.8],
  ['HQ-CIB', 'Департамент корпоративного бизнеса', 'B2B', 56.5, -6.2],
  ['CIB-KEY', 'Управление по работе с ключевыми клиентами', 'HQ-CIB', 59.1, -2.8],
  ['CIB-REG', 'Управление региональных продаж', 'HQ-CIB', 36.4, -25.5],
  ['CIB-TRADE', 'Управление торгового финансирования', 'HQ-CIB', 75, 10],
  ['HQ-SME', 'Департамент малого и среднего бизнеса', 'B2B', 89.9, 10.2],
  ['SME-ACQ', 'Управление привлечения клиентов', 'HQ-SME', 95, 10],
  ['SME-SRV', 'Управление обслуживания', 'HQ-SME', 90.9, 12.6],
  ['SME-DIG', 'Отдел цифровых каналов', 'HQ-SME', 81.8, 5.6],
  ['HQ-TX', 'Департамент транзакционного бизнеса', 'B2B', 80.9, -2.1],
  ['TX-ACQ', 'Управление эквайринга', 'HQ-TX', 63.6, -4.6],
  ['TX-SAL', 'Управление зарплатных проектов', 'HQ-TX', 100, 0],
  ['TX-NEW', 'Новое управление', 'HQ-TX', null, null],
];

function rows(data: Row[], firstRun = false): UnitMetricsRow[] {
  return data.map(([id, name, parent_id, share, delta]) => ({
    id,
    name,
    parent_id,
    level: parent_id === null ? 'block' : parent_id === 'B2B' ? 'hq' : 'unit',
    depth: parent_id === null ? 0 : parent_id === 'B2B' ? 1 : 2,
    goals_active: share === null ? 0 : 20,
    goals_with_issues: 0,
    issues_total: 0,
    critical_issues: 0,
    clean_goals_share: share,
    clean_goals_share_previous: firstRun || share === null || delta === null ? null : share - delta,
    clean_goals_share_delta: firstRun ? null : delta,
    new_issues: firstRun ? null : 0,
    resolved_issues: firstRun ? null : 0,
  }));
}

describe('buildUnitsBreakdown', () => {
  it('по блоку: все вложенные подразделения, сильнее всего ухудшившиеся сверху', () => {
    const b = buildUnitsBreakdown(rows(RUN_008), 'B2B', true, true);
    expect(b.descendants).toHaveLength(12);
    expect(b.worse.map((r) => r.id)).toEqual(['CIB-REG', 'HQ-CIB', 'TX-ACQ', 'CIB-KEY', 'HQ-TX']);
    expect(b.counts).toEqual({ better: 5, same: 1, noComparison: 0, noGoals: 1 });
  });

  it('путь показывает, чьё подразделение в плоском списке', () => {
    const b = buildUnitsBreakdown(rows(RUN_008), 'B2B', true, true);
    expect(b.worse[0].path).toEqual(['Департамент корпоративного бизнеса']);
    expect(b.worse[1].path).toEqual([]);
  });

  it('по департаменту — только его управления', () => {
    const b = buildUnitsBreakdown(rows(RUN_008), 'HQ-CIB', true, true);
    expect(b.descendants.map((r) => r.id)).toEqual(['CIB-KEY', 'CIB-REG', 'CIB-TRADE']);
    expect(b.worse.map((r) => r.id)).toEqual(['CIB-REG', 'CIB-KEY']);
  });

  it('у подразделения без дочерних разреза нет', () => {
    const b = buildUnitsBreakdown(rows(RUN_008), 'TX-SAL', true, true);
    expect(b.descendants).toEqual([]);
    expect(b.worse).toEqual([]);
  });

  it('первый прогон: без оценок «хуже», сверху наименьшая доля', () => {
    const b = buildUnitsBreakdown(rows(RUN_008, true), 'B2B', true, false);
    expect(b.hasComparison).toBe(false);
    expect(b.worse).toEqual([]);
    expect(b.descendants.every((r) => r.trend === null)).toBe(true);
    expect(b.lowest.slice(0, 2).map((r) => r.id)).toEqual(['CIB-REG', 'HQ-CIB']);
    expect(b.lowest.some((r) => r.id === 'TX-NEW')).toBe(false);
  });
});

describe('BreakdownCaveat', () => {
  it('называет число ухудшившихся подразделений и самое сильное падение', () => {
    render(<BreakdownCaveat breakdown={buildUnitsBreakdown(rows(RUN_008), 'B2B', true, true)} />);
    expect(screen.getByRole('note')).toHaveTextContent(
      'но хуже в 5 подразделениях, сильнее всего — Управление региональных продаж (−25,5 п.п.)',
    );
  });

  it('без ухудшений ничего не показывает', () => {
    const { container } = render(
      <BreakdownCaveat breakdown={buildUnitsBreakdown(rows(RUN_008), 'HQ-SME', true, true)} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
