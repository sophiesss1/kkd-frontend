import { render, screen } from '@testing-library/react';
import { DeltaIndicator, trendFromDirection } from './DeltaIndicator';

describe('DeltaIndicator', () => {
  it('без прошлого значения пишет «нет данных для сравнения», а не 0', () => {
    render(<DeltaIndicator delta={null} trend={null} unit="%" />);
    expect(screen.getByText('нет данных для сравнения')).toBeInTheDocument();
    expect(screen.queryByText(/0/)).not.toBeInTheDocument();
  });

  it('оценку берёт из trend, а не из знака: рост может быть «хуже»', () => {
    render(<DeltaIndicator delta={8} trend="worse" />);
    expect(screen.getByText('+8')).toBeInTheDocument();
    expect(screen.getByText('хуже')).toBeInTheDocument();
  });

  it('падение может быть «лучше»', () => {
    render(<DeltaIndicator delta={-3} trend="better" />);
    expect(screen.getByText('−3')).toBeInTheDocument();
    expect(screen.getByText('лучше')).toBeInTheDocument();
  });

  it('для процентных метрик показывает процентные пункты', () => {
    render(<DeltaIndicator delta={-6.2} trend="worse" unit="%" />);
    expect(screen.getByText('−6,2 п.п.')).toBeInTheDocument();
  });

  it('у нейтральной метрики нет оценки «лучше / хуже»', () => {
    render(<DeltaIndicator delta={2} trend={null} unit="шт." />);
    expect(screen.queryByText(/лучше|хуже/)).not.toBeInTheDocument();
  });

  it('смысл передаёт видимым текстом, а не aria-label на span без роли', () => {
    const { container } = render(<DeltaIndicator delta={-1} trend="better" deltaPct={-2.1} />);
    const root = container.firstElementChild!;
    expect(root).not.toHaveAttribute('aria-label');
    expect(root).toHaveTextContent(/^−1\s*\(−2,1\s?%\)\s*лучше$/);
  });
});

describe('trendFromDirection', () => {
  it('для счётчиков проблем (higher_is_better: false) рост — хуже, снижение — лучше', () => {
    expect(trendFromDirection(5, false)).toBe('worse');
    expect(trendFromDirection(-5, false)).toBe('better');
    expect(trendFromDirection(0, false)).toBe('same');
  });

  it('для долей (higher_is_better: true) рост — лучше', () => {
    expect(trendFromDirection(0.8, true)).toBe('better');
    expect(trendFromDirection(-25.5, true)).toBe('worse');
  });

  it('без сравнения или без направления оценки нет', () => {
    expect(trendFromDirection(null, false)).toBeNull();
    expect(trendFromDirection(3, null)).toBeNull();
    expect(trendFromDirection(3, undefined)).toBeNull();
  });
});
