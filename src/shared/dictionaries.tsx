import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DeltaStatus, GoalLevel, Meta, SeverityCode } from '../api/types';

/**
 * Подписи и порядок из справочников GET /api/meta (важность, статусы дельты, уровни целей) —
 * берутся из API, а не дублируются в коде. Страница рендерит содержимое только после загрузки meta,
 * поэтому провайдер всегда стоит над компонентами, которым нужны подписи.
 */
export interface Dictionaries {
  severityTitle: Record<SeverityCode, string>;
  /** Порядок важности из API: 0 — самая важная. */
  severityOrder: Record<SeverityCode, number>;
  severityCodes: SeverityCode[];
  deltaStatusTitle: Record<DeltaStatus, string>;
  deltaStatusCodes: DeltaStatus[];
  goalLevelTitle: Record<GoalLevel, string>;
}

export function buildDictionaries(meta: Pick<Meta, 'severities' | 'delta_statuses' | 'goal_levels'>): Dictionaries {
  const severities = [...meta.severities].sort((a, b) => a.order - b.order);
  return {
    severityTitle: Object.fromEntries(severities.map((s) => [s.code, s.title])) as Record<SeverityCode, string>,
    severityOrder: Object.fromEntries(severities.map((s) => [s.code, s.order])) as Record<SeverityCode, number>,
    severityCodes: severities.map((s) => s.code),
    deltaStatusTitle: Object.fromEntries(meta.delta_statuses.map((s) => [s.code, s.title])) as Record<DeltaStatus, string>,
    deltaStatusCodes: meta.delta_statuses.map((s) => s.code),
    goalLevelTitle: Object.fromEntries(meta.goal_levels.map((l) => [l.code, l.title])) as Record<GoalLevel, string>,
  };
}

const DictionariesContext = createContext<Dictionaries | null>(null);

export function DictionariesProvider({ meta, children }: { meta: Meta; children: ReactNode }) {
  const value = useMemo(() => buildDictionaries(meta), [meta]);
  return <DictionariesContext.Provider value={value}>{children}</DictionariesContext.Provider>;
}

export function useDictionaries(): Dictionaries {
  const value = useContext(DictionariesContext);
  if (!value) throw new Error('useDictionaries: нет DictionariesProvider — справочники из /api/meta ещё не переданы');
  return value;
}
