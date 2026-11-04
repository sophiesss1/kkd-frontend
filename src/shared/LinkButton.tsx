import type { ButtonHTMLAttributes } from 'react';
import styles from './LinkButton.module.css';

/**
 * Действие, которое выглядит как ссылка: открыть карточку, перейти в подразделение. Нативная кнопка, потому что
 * Typography.Link без href не получает фокус с клавиатуры и не нажимается Enter и пробелом.
 */
export function LinkButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={className ? `${styles.root} ${className}` : styles.root} />;
}
