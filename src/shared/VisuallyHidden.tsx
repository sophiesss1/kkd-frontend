import type { ReactNode } from 'react';
import styles from './VisuallyHidden.module.css';

/**
 * Текст только для экранного диктора: дополняет видимое содержимое кнопки, а не подменяет его,
 * как это сделал бы aria-label (тогда дельта и числа на кнопке не прозвучали бы).
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={styles.root}>{children}</span>;
}
