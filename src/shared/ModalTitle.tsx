import type { ReactNode } from 'react';
import styles from './ModalTitle.module.css';

/**
 * Заголовок модального окна как h2: внутри окна разделы — h3, и уровень заголовка не пропускается.
 * Размер и начертание остаются от заголовка Modal из темы (20/600/28).
 */
export function ModalTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.root}>{children}</h2>;
}
