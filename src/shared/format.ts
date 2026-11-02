/** Форматирование чисел и дат для отображения. Значения не пересчитываются — только выводятся. */

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Значение метрики с единицей. null → «—»: метрика не рассчитана (например, нет целей). */
export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  return unit === '%' ? `${formatNumber(value)} %` : formatNumber(value);
}

/**
 * Дельта со знаком. Для процентных метрик разница — в процентных пунктах, а не в процентах:
 * «75 % → 80 %» это «+5 п.п.», а не «+5 %».
 */
export function formatDelta(delta: number, unit?: string): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const suffix = unit === '%' ? ' п.п.' : '';
  return `${sign}${formatNumber(Math.abs(delta))}${suffix}`;
}

export function formatPercentChange(deltaPct: number): string {
  const sign = deltaPct > 0 ? '+' : deltaPct < 0 ? '−' : '±';
  return `${sign}${formatNumber(Math.abs(deltaPct))} %`;
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00`));
}

export function pluralize(n: number, forms: [one: string, few: string, many: string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
