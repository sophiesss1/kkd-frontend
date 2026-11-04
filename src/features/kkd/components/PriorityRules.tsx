import { CheckCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import type { Rule, RuleCountRow } from '../../../api/types';
import { DeltaIndicator, trendFromDirection } from '../../../shared/DeltaIndicator';
import { useDictionaries } from '../../../shared/dictionaries';
import { formatNumber } from '../../../shared/format';
import { SeverityTag } from '../../../shared/tags';
import styles from './PriorityRules.module.css';

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
  // порядок важности — из справочника /api/meta (order), а не из копии в коде
  const { severityOrder } = useDictionaries();
  const ruleByCode = new Map(rules.map((r) => [r.code, r]));
  const active = rows
    .filter((r) => r.current > 0)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.current - a.current);
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
              <span className={styles.ruleTitle}>{row.title}</span>
              {/* рекомендация — второй строкой под названием на всю ширину, чтобы не обрезалась и не вытягивала строку */}
              <span className={styles.ruleHint}>
                {OBJECT_LABEL[row.object_type]} · {ruleByCode.get(row.code)?.recommendation}
              </span>
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
