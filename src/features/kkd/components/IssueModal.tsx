import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Descriptions, Modal, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import { useIssue } from '../../../api/queries';
import type { IssueHistoryPoint } from '../../../api/types';
import { formatDate, pluralize } from '../../../shared/format';
import { QueryError } from '../../../shared/QueryError';
import { DeltaStatusTag, SeverityTag } from '../../../shared/tags';
import styles from './IssueModal.module.css';

const GOAL_LEVEL_LABEL = { block: 'цель блока', hq: 'цель департамента', unit: 'цель подразделения', employee: 'цель сотрудника' };

function formatValue(value: string | number | null): ReactNode {
  if (value === null || value === '') return <span className={styles.missing}>не заполнено</span>;
  return String(value);
}

function historyView(point: IssueHistoryPoint): { icon: ReactNode; text: string; tone: string } {
  if (point.run_status === 'failed') return { icon: <ExclamationCircleOutlined />, text: 'прогон с ошибкой', tone: styles.muted };
  if (point.run_status === 'running') return { icon: <LoadingOutlined />, text: 'выполняется', tone: styles.muted };
  return point.present
    ? { icon: <CloseCircleOutlined />, text: 'обнаружена', tone: styles.present }
    : { icon: <CheckCircleOutlined />, text: 'не обнаружена', tone: styles.absent };
}

interface Props {
  issueId: string | null;
  runId: string;
  hasComparison: boolean;
  onClose: () => void;
}

export function IssueModal({ issueId, runId, hasComparison, onClose }: Props) {
  const { data: issue, error, isPending, refetch } = useIssue(issueId, runId);

  return (
    <Modal
      open={Boolean(issueId)}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      title={issue ? issue.rule_title : 'Карточка проблемы'}
    >
      {error ? (
        <QueryError error={error} onRetry={() => refetch()} title="Не удалось открыть карточку проблемы" />
      ) : isPending || !issue ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div className={styles.body}>
          <div className={styles.tags}>
            <SeverityTag severity={issue.severity} />
            {hasComparison && <DeltaStatusTag status={issue.delta_status} />}
            <span className={styles.id}>{issue.id}</span>
          </div>

          <p className={styles.details}>{issue.details}</p>

          <div className={styles.values}>
            <div className={styles.valueBox}>
              <span className={styles.valueLabel}>Фактическое значение</span>
              <span className={styles.value}>{formatValue(issue.actual)}</span>
            </div>
            <div className={styles.valueBox}>
              <span className={styles.valueLabel}>Ожидаемое значение</span>
              <span className={styles.value}>{formatValue(issue.expected)}</span>
            </div>
          </div>

          <div className={styles.recommendation}>
            <span className={styles.valueLabel}>Как исправить</span>
            <span>{issue.recommendation}</span>
          </div>

          <Descriptions column={1} size="small" styles={{ label: { width: 200 } }}>
            <Descriptions.Item label="Цель">
              {issue.goal_title} ({issue.goal_id}, {GOAL_LEVEL_LABEL[issue.goal_level]})
            </Descriptions.Item>
            {issue.kr_id && (
              <Descriptions.Item label="Ключевой результат">
                {issue.kr_title} ({issue.kr_id})
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Подразделение">{issue.unit_name}</Descriptions.Item>
            <Descriptions.Item label="Ответственный">
              {issue.owner ? `${issue.owner.full_name}, ${issue.owner.position}` : <span className={styles.missing}>не назначен</span>}
            </Descriptions.Item>
            {issue.first_detected_run_id && issue.first_detected_at && (
              <Descriptions.Item label="Впервые обнаружена">
                {issue.first_detected_run_id} от {formatDate(issue.first_detected_at)}
                {issue.runs_in_row &&
                  ` · ${issue.runs_in_row} ${pluralize(issue.runs_in_row, ['прогон', 'прогона', 'прогонов'])} подряд`}
              </Descriptions.Item>
            )}
          </Descriptions>

          <section aria-labelledby="issue-history-heading">
            <h3 id="issue-history-heading" className={styles.subheading}>
              История по прогонам
            </h3>
            <ol className={styles.history}>
              {issue.history.map((point) => {
                const view = historyView(point);
                return (
                  <li key={point.run_id} className={`${styles.historyItem} ${view.tone}`}>
                    <span className={styles.historyRun}>{point.run_id}</span>
                    <span className={styles.historyDate}>{formatDate(point.snapshot_date)}</span>
                    <span className={styles.historyStatus}>
                      <span aria-hidden>{view.icon}</span> {view.text}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}
    </Modal>
  );
}
