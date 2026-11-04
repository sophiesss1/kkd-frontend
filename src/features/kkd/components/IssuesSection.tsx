import { CloseCircleFilled, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Select, Table, Tooltip } from 'antd';
import type { PaginationProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { cloneElement, forwardRef, isValidElement, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../../api/client';
import { useIssues, useRetryFailed } from '../../../api/queries';
import type { DeltaStatus, Issue, IssueFilters, IssueSort, Rule, SeverityCode } from '../../../api/types';
import { useDictionaries } from '../../../shared/dictionaries';
import { formatDate, pluralize } from '../../../shared/format';
import { LinkButton } from '../../../shared/LinkButton';
import { QueryError } from '../../../shared/QueryError';
import { DeltaStatusTag, SeverityTag } from '../../../shared/tags';
import { PAGE_SIZES } from '../useKkdParams';
import styles from './IssuesSection.module.css';

const SORT_OPTIONS: { value: IssueSort; label: string }[] = [
  { value: 'severity', label: 'Сначала важные' },
  { value: 'age', label: 'Сначала давние' },
  { value: 'unit', label: 'По подразделению' },
  { value: 'rule', label: 'По правилу' },
];

const PAGER_LABEL: Partial<Record<string, string>> = {
  prev: 'Предыдущая страница',
  next: 'Следующая страница',
};

/**
 * У стрелок пагинации antd внутри кнопки только значок, и диктор назвал бы их «left» / «right».
 * У «•••» (на 5 страниц вперёд или назад) русская подпись уже есть в title пункта, значки внутри скрыты.
 */
const renderPagerItem: PaginationProps['itemRender'] = (_page, type, original) => {
  if (!isValidElement<Record<string, unknown>>(original)) return original;
  const label = PAGER_LABEL[type];
  if (label) return cloneElement(original, { 'aria-label': label });
  if (type === 'jump-prev' || type === 'jump-next') return cloneElement(original, { 'aria-hidden': true });
  return original;
};

function hasActiveFilters(f: IssueFilters) {
  return f.rule_code.length > 0 || f.severity.length > 0 || f.delta_status.length > 0 || f.q !== '';
}

/**
 * Поиск обновляет URL с задержкой, чтобы не слать запрос на каждый символ. Первое изменение добавляет запись
 * в историю, уточнения до ухода из поля её заменяют: «назад» возвращает состояние до поиска, а не каждую букву.
 * Сброс фильтров пересоздаёт поле (key), поэтому набранный, но ещё не отправленный текст после сброса не применится.
 */
function SearchInput({ value, onChange }: { value: string; onChange: (q: string, opts: { replace: boolean }) => void }) {
  const [draft, setDraft] = useState(value);
  // editing — в этом заходе в поле запись истории уже добавлена; focused — курсор сейчас в поле
  const editing = useRef(false);
  const focused = useRef(false);
  // таймер не перезапускается при каждой перерисовке родителя из-за новой функции onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    // заменять ли запись, решается в момент набора: уточнение, набранное до ухода из поля, всё равно уточнение
    const replace = editing.current;
    const timer = window.setTimeout(() => {
      onChangeRef.current(draft, { replace });
      // после ухода из поля следующий поиск снова добавит свою запись
      editing.current = focused.current;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <Input.Search
      // у кнопок antd по умолчанию только значки, и диктор назвал бы их «close-circle» и «search»
      allowClear={{ clearIcon: <CloseCircleFilled aria-label="Очистить поиск" /> }}
      enterButton={<Button aria-label="Найти" icon={<SearchOutlined aria-hidden />} />}
      className={styles.search}
      placeholder="ID, название цели или КР, ответственный"
      aria-label="Поиск по проблемам"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        editing.current = false;
      }}
      onSearch={(q) => {
        onChangeRef.current(q, { replace: editing.current });
        editing.current = false;
      }}
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
  onPageChange: (page: number, pageSize: number, opts?: { replace?: boolean }) => void;
  onOpenIssue: (issueId: string) => void;
}

export const IssuesSection = forwardRef<HTMLElement, Props>(function IssuesSection(
  { runId, unitId, enabled, hasComparison, rules, filters, page, pageSize, onFiltersChange, onResetFilters, onPageChange, onOpenIssue },
  ref,
) {
  const { severityTitle, severityCodes, deltaStatusTitle, deltaStatusCodes } = useDictionaries();
  const severityOptions = severityCodes.map((code: SeverityCode) => ({ value: code, label: severityTitle[code] }));
  const statusOptions = deltaStatusCodes.map((code: DeltaStatus) => ({ value: code, label: deltaStatusTitle[code] }));
  // сброс фильтров пересоздаёт поле поиска вместе с ещё не отправленным текстом
  const [searchGeneration, setSearchGeneration] = useState(0);
  const resetFilters = () => {
    setSearchGeneration((g) => g + 1);
    onResetFilters();
  };

  const applied = {
    ...filters,
    // правило из старой ссылки, которого нет в справочнике, API отверг бы ошибкой 422
    rule_code: filters.rule_code.filter((code) => rules.some((r) => r.code === code)),
    // пробелы по краям не меняют поиск — и не дают второго запроса с тем же результатом
    q: filters.q.trim(),
    // в первом прогоне статусов дельты нет: фильтр статуса, оставшийся в URL от другого прогона, не применяем
    delta_status: hasComparison ? filters.delta_status : [],
  };
  const issues = useIssues(runId, unitId, applied, page, pageSize, enabled);
  const retryFailed = useRetryFailed();
  const filtered = hasActiveFilters(applied);
  // выгрузка — тот же набор фильтров, что у списка, но все страницы; файл отдаёт API
  const exportUrl = apiUrl('/api/kkd/issues/export', {
    run_id: runId,
    unit_id: unitId,
    rule_code: applied.rule_code,
    severity: applied.severity,
    delta_status: applied.delta_status,
    q: applied.q,
  });
  // пока на экране прошлые данные (смена фильтров), выгрузка уже ушла бы по новым — кнопку держим выключенной
  const canExport = enabled && !issues.isError && !issues.isPlaceholderData && Boolean(issues.data?.total);

  // страница за концом списка (старая ссылка с ?page=, список стал короче) — переходим на последнюю,
  // иначе пустая таблица выглядела бы как «проблем нет»
  const total = issues.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const outOfRange = issues.isSuccess && !issues.isPlaceholderData && page > lastPage;
  useEffect(() => {
    if (outOfRange) onPageChange(lastPage, pageSize, { replace: true });
  }, [outOfRange, lastPage, pageSize, onPageChange]);

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
        hasComparison ? <DeltaStatusTag status={status} /> : <span className={styles.muted}>—</span>,
    },
    {
      title: 'Проблема',
      key: 'problem',
      render: (_, issue) => (
        <div className={styles.cellStack}>
          <LinkButton
            className={styles.problemLink}
            aria-haspopup="dialog"
            onClick={(e) => {
              e.stopPropagation();
              onOpenIssue(issue.id);
            }}
          >
            {issue.rule_title}
          </LinkButton>
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
      // не Typography type="secondary": в antd 5 он красит третичным цветом, а это содержательные данные
      render: (owner: Issue['owner']) => (owner ? owner.full_name : <span className={styles.muted}>Не назначен</span>),
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
          <span className={styles.muted}>—</span>
        ),
    },
  ];

  const emptyText = filtered ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="По выбранным фильтрам проблем нет">
      <Button onClick={resetFilters}>Сбросить фильтры</Button>
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
        <Tooltip
          title="CSV с текущими фильтрами, все страницы — чтобы передать список на исправление"
          trigger={['hover', 'focus']}
        >
          <Button
            className={styles.export}
            icon={<DownloadOutlined aria-hidden />}
            href={exportUrl}
            download
            disabled={!canExport}
          >
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
          value={applied.rule_code}
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
          options={severityOptions}
        />
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          className={styles.statusFilter}
          placeholder={hasComparison ? 'Новые и сохраняющиеся' : 'Нет сравнения'}
          aria-label="Статус относительно прошлого прогона"
          value={applied.delta_status}
          onChange={(delta_status) => onFiltersChange({ delta_status })}
          options={statusOptions}
          disabled={!hasComparison}
        />
        <SearchInput key={searchGeneration} value={filters.q} onChange={(q, opts) => onFiltersChange({ q }, opts)} />
        <Select
          className={styles.sort}
          aria-label="Сортировка"
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ sort })}
          options={SORT_OPTIONS}
        />
        {filtered && (
          <Button type="link" onClick={resetFilters}>
            Сбросить фильтры
          </Button>
        )}
      </div>
      {hasComparison && !filters.delta_status.includes('resolved') && (
        <p className={styles.hint}>Исправленные проблемы показываются при выборе статуса «Исправлена».</p>
      )}

      <div className={styles.body}>
        {issues.isError ? (
          <QueryError error={issues.error} onRetry={retryFailed} title="Не удалось загрузить список проблем" />
        ) : (
          <Table<Issue>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={issues.data?.items}
            loading={issues.isFetching}
            // Пустое состояние — только по ответу на текущие фильтры: не по прошлым данным (keepPreviousData) во время
            // загрузки и не при total > 0 (страница за концом списка, пока идёт переход на последнюю).
            locale={{ emptyText: issues.isPending || issues.isPlaceholderData || total > 0 ? ' ' : emptyText }}
            onRow={(issue) => ({ onClick: () => onOpenIssue(issue.id), className: styles.row })}
            pagination={{
              current: page,
              pageSize,
              total: issues.data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZES,
              hideOnSinglePage: false,
              showTotal: (total, [from, to]) => `${from}–${to} из ${total}`,
              itemRender: renderPagerItem,
              onChange: onPageChange,
            }}
          />
        )}
      </div>
    </section>
  );
});
