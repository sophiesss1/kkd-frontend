import type { Trend, UnitMetricsRow } from '../../api/types';
import { trendFromDirection } from '../../shared/DeltaIndicator';

/**
 * Разрез «где стало хуже» по данным GET /api/kkd/units. Значения и дельты берутся из API как есть:
 * здесь только выбор вложенных подразделений, оценка знака по направлению метрики и порядок показа.
 */

export interface BreakdownRow extends UnitMetricsRow {
  /** Оценка изменения доли корректных целей по `higher_is_better` из /api/meta. */
  trend: Trend | null;
  /** Подразделения между выбранным и этим (не включая оба) — чтобы в плоском списке было видно, чьё оно. */
  path: string[];
}

export interface UnitsBreakdown {
  /** Есть ли у прогона база сравнения (в первом прогоне нет). */
  hasComparison: boolean;
  /** Все вложенные подразделения любой глубины в порядке оргструктуры. */
  descendants: BreakdownRow[];
  /** Где доля корректных целей снизилась — сильнее всего упавшие сверху. */
  worse: BreakdownRow[];
  /** Для первого прогона: подразделения с наименьшей долей сверху. */
  lowest: BreakdownRow[];
  counts: { better: number; same: number; noComparison: number; noGoals: number };
}

export function buildUnitsBreakdown(
  items: UnitMetricsRow[],
  unitId: string,
  higherIsBetter: boolean | null,
  hasComparison: boolean,
): UnitsBreakdown {
  const children = new Map<string, UnitMetricsRow[]>();
  for (const item of items) {
    if (!item.parent_id) continue;
    children.set(item.parent_id, [...(children.get(item.parent_id) ?? []), item]);
  }

  const descendants: BreakdownRow[] = [];
  const walk = (parentId: string, path: string[]) => {
    for (const child of children.get(parentId) ?? []) {
      descendants.push({ ...child, path, trend: trendFromDirection(child.clean_goals_share_delta, higherIsBetter) });
      walk(child.id, [...path, child.name]);
    }
  };
  walk(unitId, []);

  const counts = { better: 0, same: 0, noComparison: 0, noGoals: 0 };
  for (const row of descendants) {
    if (row.clean_goals_share === null) counts.noGoals += 1;
    else if (row.trend === 'better') counts.better += 1;
    else if (row.trend === 'same') counts.same += 1;
    else if (row.trend === null) counts.noComparison += 1;
  }

  const worse = descendants
    .filter((row) => row.trend === 'worse')
    .sort((a, b) => Math.abs(b.clean_goals_share_delta!) - Math.abs(a.clean_goals_share_delta!));

  const direction = higherIsBetter === false ? -1 : 1;
  const lowest = descendants
    .filter((row) => row.clean_goals_share !== null)
    .sort((a, b) => direction * (a.clean_goals_share! - b.clean_goals_share!));

  return { hasComparison, descendants, worse, lowest, counts };
}
