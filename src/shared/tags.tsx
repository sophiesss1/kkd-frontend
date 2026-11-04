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
import { useDictionaries } from './dictionaries';
import styles from './tags.module.css';

const SEVERITY_ICON = {
  critical: <CloseCircleFilled aria-hidden />,
  major: <ExclamationCircleFilled aria-hidden />,
  minor: <InfoCircleOutlined aria-hidden />,
};

/**
 * Важность: цвет + значок + слово — цвет не единственный носитель смысла. Роли — из раздела 5 кита
 * (critical → Error, major → Warning, minor → colorTextSecondary), тона — из его палитры (раздел 2):
 * фон роли и текстовый тон роли для слова. Подпись — из справочника /api/meta.
 */
export function SeverityTag({ severity }: { severity: SeverityCode }) {
  const { severityTitle } = useDictionaries();
  return (
    <Tag icon={SEVERITY_ICON[severity]} className={`${styles.tag} ${styles[severity]}`}>
      {severityTitle[severity]}
    </Tag>
  );
}

const STATUS_ICON = {
  new: <PlusCircleOutlined aria-hidden />,
  persisting: <ClockCircleOutlined aria-hidden />,
  resolved: <CheckCircleOutlined aria-hidden />,
};

export function DeltaStatusTag({ status }: { status: DeltaStatus }) {
  const { deltaStatusTitle } = useDictionaries();
  return (
    <Tag bordered={false} icon={STATUS_ICON[status]} className={`${styles.tag} ${styles[status]}`}>
      {deltaStatusTitle[status]}
    </Tag>
  );
}
