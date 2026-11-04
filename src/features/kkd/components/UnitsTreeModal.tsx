import { Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeltaIndicator } from '../../../shared/DeltaIndicator';
import { formatMetricValue, formatNumber } from '../../../shared/format';
import { LinkButton } from '../../../shared/LinkButton';
import { ModalTitle } from '../../../shared/ModalTitle';
import type { BreakdownRow, UnitsBreakdownData } from '../unitsBreakdown';
import styles from './UnitsTreeModal.module.css';

type TreeRow = BreakdownRow & { children?: TreeRow[] };

/** Вложенные подразделения деревом в порядке оргструктуры. */
function buildTree(rows: BreakdownRow[], rootId: string): TreeRow[] {
  const nodes = new Map<string, TreeRow>(rows.map((row) => [row.id, { ...row }]));
  const roots: TreeRow[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parent_id && row.parent_id !== rootId ? nodes.get(row.parent_id) : undefined;
    if (parent) parent.children = [...(parent.children ?? []), node];
    else roots.push(node);
  }
  return roots;
}

const count = (value: number | null) => (value === null ? <span className={styles.muted}>—</span> : formatNumber(value));

interface Props {
  open: boolean;
  unitId: string;
  breakdown: UnitsBreakdownData;
  onSelectUnit: (unitId: string) => void;
  onClose: () => void;
}

export function UnitsTreeModal({ open, unitId, breakdown, onSelectUnit, onClose }: Props) {
  const columns: ColumnsType<TreeRow> = [
    {
      title: 'Подразделение',
      key: 'name',
      render: (_, row) => (
        <LinkButton onClick={() => onSelectUnit(row.id)} className={styles.unitLink}>
          {row.name}
        </LinkButton>
      ),
    },
    {
      title: 'Доля корректных целей',
      dataIndex: 'clean_goals_share',
      width: 150,
      align: 'right',
      render: (value: number | null) => formatMetricValue(value, '%'),
    },
    {
      title: 'Изменение',
      key: 'delta',
      width: 180,
      render: (_, row) => (
        <DeltaIndicator delta={row.clean_goals_share_delta} trend={row.trend} unit="%" size="small" />
      ),
    },
    { title: 'Целей', dataIndex: 'goals_active', width: 70, align: 'right', render: count },
    { title: 'Проблем', dataIndex: 'issues_total', width: 80, align: 'right', render: count },
    { title: 'Новые', dataIndex: 'new_issues', width: 70, align: 'right', render: count },
    { title: 'Исправлены', dataIndex: 'resolved_issues', width: 100, align: 'right', render: count },
    { title: 'Критичные', dataIndex: 'critical_issues', width: 90, align: 'right', render: count },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1200}
      title={<ModalTitle>Все вложенные подразделения</ModalTitle>}
      closable={{ 'aria-label': 'Закрыть' }}
      destroyOnHidden
    >
      <p className={styles.hint}>
        Метрики подразделения учитывают его дочерние. Нажмите на название, чтобы открыть подразделение.
      </p>
      <Table<TreeRow>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={buildTree(breakdown.descendants, unitId)}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
      />
    </Modal>
  );
}
