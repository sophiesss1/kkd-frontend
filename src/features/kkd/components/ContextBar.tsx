import { Select, Space, Tag, TreeSelect, Typography } from 'antd';
import { useMemo } from 'react';
import type { Run, Unit } from '../../../api/types';
import { formatDate } from '../../../shared/format';
import styles from './ContextBar.module.css';

interface TreeNode {
  value: string;
  title: string;
  children: TreeNode[];
}

function buildUnitTree(units: Unit[]): TreeNode[] {
  const nodes = new Map(units.map((u) => [u.id, { value: u.id, title: u.name, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const unit of units) {
    const node = nodes.get(unit.id)!;
    const parent = unit.parent_id ? nodes.get(unit.parent_id) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

const RUN_STATUS_TAG: Partial<Record<Run['status'], { color: string; text: string }>> = {
  failed: { color: 'error', text: 'ошибка' },
  running: { color: 'processing', text: 'выполняется' },
};

interface Props {
  units: Unit[];
  runs: Run[];
  unitId: string;
  runId: string | undefined;
  onUnitChange: (unitId: string) => void;
  onRunChange: (runId: string) => void;
}

export function ContextBar({ units, runs, unitId, runId, onUnitChange, onRunChange }: Props) {
  const treeData = useMemo(() => buildUnitTree(units), [units]);
  const latestCompletedId = runs.find((r) => r.status === 'completed')?.id;

  const runOptions = runs.map((run) => {
    const statusTag = RUN_STATUS_TAG[run.status];
    return {
      value: run.id,
      // текст для поиска и для отображения выбранного значения
      title: `${run.id} от ${formatDate(run.snapshot_date)}`,
      label: (
        <span className={styles.runOption}>
          <span>
            {run.id} <Typography.Text type="secondary">от {formatDate(run.snapshot_date)}</Typography.Text>
          </span>
          {statusTag && <Tag color={statusTag.color}>{statusTag.text}</Tag>}
          {run.id === latestCompletedId && <Tag>последний</Tag>}
          {run.status === 'completed' && !run.compared_to_run_id && <Tag>первый</Tag>}
        </span>
      ),
    };
  });

  return (
    <Space size={12} wrap className={styles.root}>
      <label className={styles.field}>
        <span className={styles.label}>Подразделение</span>
        <TreeSelect
          className={styles.unitSelect}
          value={unitId}
          treeData={treeData}
          treeDefaultExpandAll
          showSearch
          treeNodeFilterProp="title"
          popupMatchSelectWidth={360}
          onChange={onUnitChange}
          aria-label="Подразделение"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Прогон</span>
        <Select
          className={styles.runSelect}
          value={runId}
          options={runOptions}
          optionLabelProp="title"
          onChange={onRunChange}
          aria-label="Прогон"
          popupMatchSelectWidth={320}
        />
      </label>
    </Space>
  );
}
