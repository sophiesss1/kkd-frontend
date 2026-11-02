import { AimOutlined } from '@ant-design/icons';
import { Breadcrumb } from 'antd';
import styles from './App.module.css';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <span className={styles.logo}>
          <AimOutlined aria-hidden className={styles.logoIcon} />
          Автотрекер целей
        </span>
        <Breadcrumb items={[{ title: 'Автотрекер' }, { title: 'Модуль ККД' }]} />
      </div>
    </header>
  );
}
