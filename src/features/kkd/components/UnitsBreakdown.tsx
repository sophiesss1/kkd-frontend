import { ApartmentOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import { useState } from 'react';
import { DeltaIndicator, NO_COMPARISON_TEXT, TREND_LABEL } from '../../../shared/DeltaIndicator';
import { formatDelta, formatMetricValue, pluralize } from '../../../shared/format';
import { QueryError } from '../../../shared/QueryError';
import type { BreakdownRow, UnitsBreakdown as Breakdown } from '../unitsBreakdown';
import { UnitsTreeModal } from './UnitsTreeModal';
import styles from './UnitsBreakdown.module.css';

const TOP_COUNT = 5;
const UNITS_LOCATIVE: [string, string, string] = ['подразделении', 'подразделениях', 'подразделениях'];

function RowMeta({ row }: { row: BreakdownRow }) {
  const parts = [...row.path];
  if (row.new_issues) parts.push(`новых проблем: ${row.new_issues}`);
  if (row.critical_issues) parts.push(`критичных: ${row.critical_issues}`);
  if (row.clean_goals_share === null) parts.push('нет активных целей');
  return parts.length ? <span className={styles.rowMeta}>{parts.join(' · ')}</span> : null;
}

function describeRow(row: BreakdownRow) {
  const delta = row.clean_goals_share_delta;
  const change =
    delta === null ? NO_COMPARISON_TEXT : `${formatDelta(delta, '%')}${row.trend ? `, ${TREND_LABEL[row.trend]}` : ''}`;
  return `${row.name}: ${formatMetricValue(row.clean_goals_share, '%')}, ${change}. Открыть подразделение`;
}

function UnitRow({ row, onSelect }: { row: BreakdownRow; onSelect: (unitId: string) => void }) {
  return (
    <li>
      <button type="button" className={styles.row} onClick={() => onSelect(row.id)} aria-label={describeRow(row)}>
        <span className={styles.rowName}>
          <span className={styles.unitName}>{row.name}</span>
          <RowMeta row={row} />
        </span>
        <span className={styles.rowValue}>{formatMetricValue(row.clean_goals_share, '%')}</span>
        <span className={styles.rowDelta}>
          <DeltaIndicator delta={row.clean_goals_share_delta} trend={row.trend} unit="%" size="small" />
        </span>
      </button>
    </li>
  );
}

function CountsLine({ breakdown }: { breakdown: Breakdown }) {
  const { better, same, noComparison, noGoals } = breakdown.counts;
  const parts = [
    better && `улучшились: ${better}`,
    same && `без изменений: ${same}`,
    noComparison && `нет данных для сравнения: ${noComparison}`,
    noGoals && `без целей: ${noGoals}`,
  ].filter(Boolean);
  return parts.length ? <p className={styles.counts}>{parts.join(' · ')}</p> : null;
}

interface Props {
  unitId: string;
  breakdown: Breakdown | undefined;
  error: unknown;
  onRetry: () => void;
  onSelectUnit: (unitId: string) => void;
}

/** Блок «Где стало хуже»: вложенные подразделения, в которых доля корректных целей снизилась. */
export function UnitsBreakdown({ unitId, breakdown, error, onRetry, onSelectUnit }: Props) {
  const [treeOpen, setTreeOpen] = useState(false);

  if (error) {
    return (
      <section className={styles.card}>
        <QueryError error={error} onRetry={onRetry} title="Не удалось загрузить разрез по подразделениям" />
      </section>
    );
  }
  if (!breakdown) {
    return (
      <section className={styles.card} aria-busy="true">
        <Skeleton active title={{ width: 200 }} paragraph={{ rows: 5 }} />
      </section>
    );
  }

  const { hasComparison, descendants, worse, lowest } = breakdown;
  const rows = (hasComparison ? worse : lowest).slice(0, TOP_COUNT);
  const hidden = (hasComparison ? worse.length : lowest.length) - rows.length;

  return (
    <section className={styles.card} aria-labelledby="units-heading">
      <h3 id="units-heading" className={styles.heading}>
        {hasComparison ? 'Где стало хуже' : 'Где доля корректных целей ниже'}
      </h3>
      <p className={styles.hint}>
        {hasComparison
          ? 'Доля корректных целей во вложенных подразделениях — сильнее всего снизившиеся сверху'
          : 'Первый прогон — нет данных для сравнения, поэтому сверху подразделения с наименьшей долей'}
      </p>

      {hasComparison && worse.length === 0 ? (
        <p className={styles.clean}>
          <CheckCircleOutlined aria-hidden /> Ни в одном из {descendants.length} вложенных подразделений доля корректных
          целей не снизилась.
        </p>
      ) : (
        <ol className={styles.list}>
          {rows.map((row) => (
            <UnitRow key={row.id} row={row} onSelect={onSelectUnit} />
          ))}
        </ol>
      )}
      {hidden > 0 && <p className={styles.more}>и ещё {hidden} — в полном списке</p>}

      <div className={styles.footer}>
        {hasComparison && <CountsLine breakdown={breakdown} />}
        <Button icon={<ApartmentOutlined />} className={styles.treeButton} onClick={() => setTreeOpen(true)}>
          Все подразделения ({descendants.length})
        </Button>
      </div>

      <UnitsTreeModal
        open={treeOpen}
        unitId={unitId}
        breakdown={breakdown}
        onSelectUnit={(id) => {
          setTreeOpen(false);
          onSelectUnit(id);
        }}
        onClose={() => setTreeOpen(false)}
      />
    </section>
  );
}

/**
 * Оговорка к вердикту: итог по подразделению «лучше» или «без изменений», а внутри есть ухудшения.
 * Смысл передаётся текстом и значком, не только цветом.
 */
export function BreakdownCaveat({ breakdown }: { breakdown: Breakdown }) {
  const [worst] = breakdown.worse;
  if (!worst || worst.clean_goals_share_delta === null) return null;
  const n = breakdown.worse.length;
  return (
    <p className={styles.caveat} role="note">
      <WarningOutlined aria-hidden className={styles.caveatIcon} />
      <span>
        но хуже в {n} {pluralize(n, UNITS_LOCATIVE)}, сильнее всего — {worst.name} (
        {formatDelta(worst.clean_goals_share_delta, '%')})
      </span>
    </p>
  );
}
