import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import type { DeltaStatus, SeverityCode } from '../api/types';
import styles from './tags.module.css';

export const SEVERITY_LABEL: Record<SeverityCode, string> = {
  critical: 'Критичная',
  major: 'Существенная',
  minor: 'Незначительная',
};

export const DELTA_STATUS_LABEL: Record<DeltaStatus, string> = {
  new: 'Новая',
  persisting: 'Сохраняется',
  resolved: 'Исправлена',
};

const SEVERITY_VIEW = {
  critical: { color: 'error', icon: <CloseCircleFilled aria-hidden /> },
  major: { color: 'warning', icon: <ExclamationCircleFilled aria-hidden /> },
  minor: { color: 'default', icon: <InfoCircleOutlined aria-hidden /> },
} as const;

/** Важность: цвет + значок + слово — цвет не единственный носитель смысла. */
export function SeverityTag({ severity }: { severity: SeverityCode }) {
  const view = SEVERITY_VIEW[severity];
  return (
    <Tag color={view.color} icon={view.icon} className={styles.tag}>
      {SEVERITY_LABEL[severity]}
    </Tag>
  );
}

const STATUS_ICON = {
  new: <PlusCircleOutlined aria-hidden />,
  persisting: <ClockCircleOutlined aria-hidden />,
  resolved: <CheckCircleOutlined aria-hidden />,
};

export function DeltaStatusTag({ status }: { status: DeltaStatus }) {
  return (
    <Tag bordered={false} icon={STATUS_ICON[status]} className={`${styles.tag} ${styles[status]}`}>
      {DELTA_STATUS_LABEL[status]}
    </Tag>
  );
}
