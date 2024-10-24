'use client';

import { useState } from 'react';
import styles from './toggleTheme.module.scss'; // CSS Modules

import DarkModeIcon from './DarkMode.icon';
import LightModeIcon from './LightMode.icon';

type ThemeIconTypeAlias = 'light' | 'dark';

;
const ToggleTheme = () => {
  const [theme, setTheme] = useState<ThemeIconTypeAlias>('dark');

  // テーマ切り替え用関数
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // クラスとアイコンカラーの動的適用
  const lightModeActiveClass = theme === 'light' ? styles.active : '';
  const darkModeActiveClass = theme === 'dark' ? styles.active : '';
  const iconColor = theme === 'light' ? '#000' : '#fff';

  return (
    <button type="button" className={styles.toggleThemeButton} onClick={toggleTheme}>
      <figure className={`${styles.toggleThemeButtonIcon} ${lightModeActiveClass}`}>
        <LightModeIcon fillColor={iconColor} />
      </figure>
      <span>/</span>
      <figure className={`${styles.toggleThemeButtonIcon} ${darkModeActiveClass}`}>
        <DarkModeIcon fillColor={iconColor} />
      </figure>
    </button>
  );
};

export default ToggleTheme;
