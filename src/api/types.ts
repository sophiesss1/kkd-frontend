/** Контракт mock API модуля ККД. Поля и nullability — как в ответах API. */

export type SeverityCode = 'critical' | 'major' | 'minor';
export type DeltaStatus = 'new' | 'persisting' | 'resolved';
export type Trend = 'better' | 'worse' | 'same';
export type RunStatus = 'completed' | 'failed' | 'running';
export type ObjectType = 'goal' | 'key_result';
export type GoalLevel = 'block' | 'hq' | 'unit' | 'employee';
export type IssueSort = 'severity' | 'age' | 'unit' | 'rule';

export interface Unit {
  id: string;
  name: string;
  level: 'block' | 'hq' | 'unit';
  parent_id: string | null;
  depth: number;
}

export interface Rule {
  code: string;
  object_type: ObjectType;
  severity: SeverityCode;
  title: string;
  description: string;
  recommendation: string;
}

export interface Severity {
  code: SeverityCode;
  title: string;
  order: number;
}

export interface Meta {
  units: Unit[];
  rules: Rule[];
  severities: Severity[];
  goal_levels: { code: GoalLevel; order: number; title: string }[];
  metrics: { key: string; title: string; unit: string; higher_is_better: boolean | null; formula: string }[];
  delta_statuses: { code: DeltaStatus; title: string }[];
}

export interface Run {
  id: string;
  number: number;
  status: RunStatus;
  trigger: 'schedule' | 'manual';
  snapshot_date: string;
  started_at: string;
  finished_at: string | null;
  compared_to_run_id: string | null;
  error: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Metric {
  key: string;
  title: string;
  unit: string;
  higher_is_better: boolean | null;
  formula: string;
  value: number | null;
  previous: number | null;
  delta: number | null;
  delta_pct: number | null;
  trend: Trend | null;
}

export interface CountRow {
  code: string;
  title: string;
  current: number;
  previous: number | null;
  delta: number | null;
}

export interface RuleCountRow extends CountRow {
  severity: SeverityCode;
  object_type: ObjectType;
}

export interface UnitView {
  id: string;
  name: string;
  level: Unit['level'];
  parent_id: string | null;
  path: { id: string; name: string }[];
}

export interface Summary {
  run: Run;
  compared_to: Run | null;
  unit: UnitView;
  metrics: Metric[];
  issues_by_severity: (CountRow & { code: SeverityCode })[];
  issues_by_rule: RuleCountRow[];
  delta: Record<DeltaStatus, number | null>;
}

/** Строка GET /api/kkd/units: метрики одного подразделения (с учётом дочерних) в прогоне. */
export interface UnitMetricsRow {
  id: string;
  name: string;
  level: Unit['level'];
  parent_id: string | null;
  depth: number;
  goals_active: number;
  goals_with_issues: number;
  issues_total: number;
  critical_issues: number;
  clean_goals_share: number | null;
  clean_goals_share_previous: number | null;
  clean_goals_share_delta: number | null;
  new_issues: number | null;
  resolved_issues: number | null;
}

export interface UnitsMetrics {
  run: Run;
  compared_to: Run | null;
  items: UnitMetricsRow[];
}

export interface Issue {
  id: string;
  rule_code: string;
  rule_title: string;
  severity: SeverityCode;
  object_type: ObjectType;
  object_id: string;
  goal_id: string;
  goal_title: string;
  goal_level: GoalLevel;
  kr_id: string | null;
  kr_title: string | null;
  unit_id: string;
  unit_name: string;
  owner: { id: string; full_name: string; position: string } | null;
  details: string;
  actual: string | number | null;
  expected: string | number | null;
  recommendation: string;
  delta_status: DeltaStatus;
  first_detected_run_id: string | null;
  first_detected_at: string | null;
  runs_in_row: number | null;
}

export interface IssueHistoryPoint {
  run_id: string;
  snapshot_date: string;
  run_status: RunStatus;
  present: boolean | null;
}

export interface IssueDetail extends Issue {
  history: IssueHistoryPoint[];
}

export interface IssuesPage extends Page<Issue> {
  run_id: string;
}

export interface TrendPoint {
  run_id: string;
  snapshot_date: string;
  run_status: RunStatus;
  value: number | null;
}

export interface TrendResponse {
  unit: UnitView;
  metric: { key: string; title: string; unit: string; higher_is_better: boolean | null };
  points: TrendPoint[];
}

export interface IssueFilters {
  rule_code: string[];
  severity: SeverityCode[];
  delta_status: DeltaStatus[];
  q: string;
  sort: IssueSort;
}
