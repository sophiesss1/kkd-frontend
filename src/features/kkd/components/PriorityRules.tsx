import { CheckCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import type { Rule, RuleCountRow, SeverityCode } from '../../../api/types';
import { DeltaIndicator, trendFromDirection } from '../../../shared/DeltaIndicator';
import { formatNumber } from '../../../shared/format';
import { SeverityTag } from '../../../shared/tags';
import styles from './PriorityRules.module.css';

const SEVERITY_RANK: Record<SeverityCode, number> = { critical: 0, major: 1, minor: 2 };
const OBJECT_LABEL = { goal: 'цель', key_result: 'КР' } as const;
const TOP_COUNT = 5;

interface Props {
  rows: RuleCountRow[];
  rules: Rule[];
  /** Направление метрики «число проблем» из /api/meta. */
  issuesHigherIsBetter: boolean | null;
  onRuleClick: (ruleCode: string) => void;
}

/** «Что исправлять в первую очередь»: правила с нарушениями, сначала самые важные, затем самые массовые. */
export function PriorityRules({ rows, rules, issuesHigherIsBetter, onRuleClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const ruleByCode = new Map(rules.map((r) => [r.code, r]));
  const active = rows
    .filter((r) => r.current > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.current - a.current);
  const visible = expanded ? active : active.slice(0, TOP_COUNT);

  return (
    <section className={styles.card} aria-labelledby="priority-heading">
      <h3 id="priority-heading" className={styles.heading}>
        Что исправить в первую очередь
      </h3>
      {active.length === 0 ? (
        <p className={styles.clean}>
          <CheckCircleOutlined aria-hidden /> Нарушений правил нет — данные в порядке.
        </p>
      ) : (
        <ol className={styles.list}>
          {visible.map((row) => (
            <li key={row.code} className={styles.row}>
              <SeverityTag severity={row.severity} />
              <div className={styles.rule}>
                <span className={styles.ruleTitle}>{row.title}</span>
                <span className={styles.ruleHint}>
                  {OBJECT_LABEL[row.object_type]} · {ruleByCode.get(row.code)?.recommendation}
                </span>
              </div>
              <span className={styles.count}>{formatNumber(row.current)}</span>
              <span className={styles.delta}>
                <DeltaIndicator delta={row.delta} trend={trendFromDirection(row.delta, issuesHigherIsBetter)} size="small" />
              </span>
              <Button size="small" onClick={() => onRuleClick(row.code)} aria-label={`Показать проблемы: ${row.title}`}>
                Показать
              </Button>
            </li>
          ))}
        </ol>
      )}
      {active.length > TOP_COUNT && (
        <Button type="link" className={styles.more} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Свернуть' : `Показать все правила (${active.length})`}
        </Button>
      )}
    </section>
  );
}
