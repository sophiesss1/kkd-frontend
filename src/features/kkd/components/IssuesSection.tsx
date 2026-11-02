import { DownloadOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Select, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { forwardRef, useEffect, useState } from 'react';
import { apiUrl } from '../../../api/client';
import { useIssues } from '../../../api/queries';
import type { DeltaStatus, Issue, IssueFilters, IssueSort, Rule, SeverityCode } from '../../../api/types';
import { formatDate, pluralize } from '../../../shared/format';
import { QueryError } from '../../../shared/QueryError';
import { DELTA_STATUS_LABEL, DeltaStatusTag, SEVERITY_LABEL, SeverityTag } from '../../../shared/tags';
import styles from './IssuesSection.module.css';

const SORT_OPTIONS: { value: IssueSort; label: string }[] = [
  { value: 'severity', label: 'Сначала важные' },
  { value: 'age', label: 'Сначала давние' },
  { value: 'unit', label: 'По подразделению' },
  { value: 'rule', label: 'По правилу' },
];

const SEVERITY_OPTIONS = (Object.keys(SEVERITY_LABEL) as SeverityCode[]).map((code) => ({
  value: code,
  label: SEVERITY_LABEL[code],
}));

const STATUS_OPTIONS = (Object.keys(DELTA_STATUS_LABEL) as DeltaStatus[]).map((code) => ({
  value: code,
  label: DELTA_STATUS_LABEL[code],
}));

function hasActiveFilters(f: IssueFilters) {
  return f.rule_code.length > 0 || f.severity.length > 0 || f.delta_status.length > 0 || f.q !== '';
}

/** Поиск обновляет URL с задержкой, чтобы не слать запрос на каждый символ. */
function SearchInput({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), 400);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <Input.Search
      allowClear
      className={styles.search}
      placeholder="ID, название цели или КР, ответственный"
      aria-label="Поиск по проблемам"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onSearch={(q) => onChange(q)}
    />
  );
}

interface Props {
  runId: string;
  unitId: string;
  /** Не запрашивать список, пока известно, что у прогона нет результатов. */
  enabled: boolean;
  hasComparison: boolean;
  rules: Rule[];
  filters: IssueFilters;
  page: number;
  pageSize: number;
  onFiltersChange: (patch: Partial<IssueFilters>, opts?: { replace?: boolean }) => void;
  onResetFilters: () => void;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenIssue: (issueId: string) => void;
}

export const IssuesSection = forwardRef<HTMLElement, Props>(function IssuesSection(
  { runId, unitId, enabled, hasComparison, rules, filters, page, pageSize, onFiltersChange, onResetFilters, onPageChange, onOpenIssue },
  ref,
) {
  const issues = useIssues(runId, unitId, filters, page, pageSize, enabled);
  const filtered = hasActiveFilters(filters);
  // выгрузка — тот же набор фильтров, что у списка, но все страницы; файл отдаёт API
  const exportUrl = apiUrl('/api/kkd/issues/export', {
    run_id: runId,
    unit_id: unitId,
    rule_code: filters.rule_code,
    severity: filters.severity,
    delta_status: filters.delta_status,
    q: filters.q.trim(),
  });
  const canExport = enabled && !issues.isError && Boolean(issues.data?.total);

  const columns: ColumnsType<Issue> = [
    {
      title: 'Важность',
      dataIndex: 'severity',
      width: 156,
      render: (severity: SeverityCode) => <SeverityTag severity={severity} />,
    },
    {
      title: 'Статус',
      dataIndex: 'delta_status',
      width: 140,
      // в первом прогоне сравнения нет — статус «новая» был бы неправдой
      render: (status: DeltaStatus) =>
        hasComparison ? <DeltaStatusTag status={status} /> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Проблема',
      key: 'problem',
      render: (_, issue) => (
        <div className={styles.cellStack}>
          <Typography.Link
            className={styles.problemLink}
            onClick={(e) => {
              e.stopPropagation();
              onOpenIssue(issue.id);
            }}
          >
            {issue.rule_title}
          </Typography.Link>
          <span className={styles.secondary}>{issue.details}</span>
        </div>
      ),
    },
    {
      title: 'Объект',
      key: 'object',
      render: (_, issue) => (
        <div className={styles.cellStack}>
          <span>{issue.goal_title}</span>
          <span className={styles.secondary}>
            {issue.goal_id}
            {issue.kr_id && (
              <>
                {' · КР '}
                {issue.kr_title ?? issue.kr_id}
              </>
            )}
          </span>
        </div>
      ),
    },
    {
      title: 'Подразделение',
      dataIndex: 'unit_name',
      width: 200,
    },
    {
      title: 'Ответственный',
      dataIndex: 'owner',
      width: 180,
      render: (owner: Issue['owner']) =>
        owner ? owner.full_name : <Typography.Text type="secondary">Не назначен</Typography.Text>,
    },
    {
      title: 'Держится',
      key: 'age',
      width: 140,
      render: (_, issue) =>
        issue.runs_in_row ? (
          <div className={styles.cellStack}>
            <span>
              {issue.runs_in_row} {pluralize(issue.runs_in_row, ['прогон', 'прогона', 'прогонов'])}
            </span>
            {issue.first_detected_at && (
              <span className={styles.secondary}>с {formatDate(issue.first_detected_at)}</span>
            )}
          </div>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ];

  const emptyText = filtered ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="По выбранным фильтрам проблем нет">
      <Button onClick={onResetFilters}>Сбросить фильтры</Button>
    </Empty>
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Проблем не найдено — данные подразделения в порядке" />
  );

  return (
    <section ref={ref} className={styles.card} aria-labelledby="issues-heading">
      <div className={styles.header}>
        <h3 id="issues-heading" className={styles.heading}>
          Найденные проблемы
        </h3>
        {issues.data && (
          <span className={styles.secondary} aria-live="polite">
            {issues.data.total} {pluralize(issues.data.total, ['проблема', 'проблемы', 'проблем'])}
          </span>
        )}
        <Tooltip title="CSV с текущими фильтрами, все страницы — чтобы передать список на исправление">
          <Button className={styles.export} icon={<DownloadOutlined />} href={exportUrl} download disabled={!canExport}>
            Выгрузить CSV
          </Button>
        </Tooltip>
      </div>

      <div className={styles.filters} role="group" aria-label="Фильтры проблем">
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          className={styles.ruleFilter}
          placeholder="Все правила"
          aria-label="Правило"
          value={filters.rule_code}
          onChange={(rule_code) => onFiltersChange({ rule_code })}
          options={rules.map((r) => ({ value: r.code, label: r.title }))}
          optionFilterProp="label"
        />
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          className={styles.filter}
          placeholder="Любая важность"
          aria-label="Важность"
          value={filters.severity}
          onChange={(severity) => onFiltersChange({ severity })}
          options={SEVERITY_OPTIONS}
        />
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          className={styles.filter}
          placeholder={hasComparison ? 'Новые и сохраняющиеся' : 'Нет сравнения'}
          aria-label="Статус относительно прошлого прогона"
          value={filters.delta_status}
          onChange={(delta_status) => onFiltersChange({ delta_status })}
          options={STATUS_OPTIONS}
          disabled={!hasComparison}
        />
        <SearchInput value={filters.q} onChange={(q) => onFiltersChange({ q }, { replace: true })} />
        <Select
          className={styles.sort}
          aria-label="Сортировка"
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ sort })}
          options={SORT_OPTIONS}
        />
        {filtered && (
          <Button type="link" onClick={onResetFilters}>
            Сбросить фильтры
          </Button>
        )}
      </div>
      {hasComparison && !filters.delta_status.includes('resolved') && (
        <p className={styles.hint}>Исправленные проблемы показываются при выборе статуса «Исправлена».</p>
      )}

      {issues.isError ? (
        <QueryError error={issues.error} onRetry={() => issues.refetch()} title="Не удалось загрузить список проблем" />
      ) : (
        <Table<Issue>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={issues.data?.items}
          loading={issues.isFetching}
          locale={{ emptyText: issues.isPending ? ' ' : emptyText }}
          onRow={(issue) => ({ onClick: () => onOpenIssue(issue.id), className: styles.row })}
          pagination={{
            current: page,
            pageSize,
            total: issues.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            hideOnSinglePage: false,
            showTotal: (total, [from, to]) => `${from}–${to} из ${total}`,
            onChange: onPageChange,
          }}
        />
      )}
    </section>
  );
});
