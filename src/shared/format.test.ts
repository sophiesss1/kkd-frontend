import { formatDate, formatDelta, formatMetricValue, pluralize } from './format';

describe('format', () => {
  it('null-метрика выводится прочерком', () => {
    expect(formatMetricValue(null, '%')).toBe('—');
  });

  it('форматирует значения по-русски', () => {
    expect(formatMetricValue(75.8, '%')).toBe('75,8 %');
    expect(formatMetricValue(2.35, 'шт.')).toBe('2,35');
  });

  it('дельта всегда со знаком', () => {
    expect(formatDelta(4)).toBe('+4');
    expect(formatDelta(-4.3, '%')).toBe('−4,3 п.п.');
    expect(formatDelta(0)).toBe('±0');
  });

  it('дата без сдвига часового пояса', () => {
    expect(formatDate('2026-10-26')).toBe('26.10.2026');
  });

  it('склоняет существительные', () => {
    const forms: [string, string, string] = ['прогон', 'прогона', 'прогонов'];
    expect(pluralize(1, forms)).toBe('прогон');
    expect(pluralize(3, forms)).toBe('прогона');
    expect(pluralize(11, forms)).toBe('прогонов');
    expect(pluralize(22, forms)).toBe('прогона');
  });
});
