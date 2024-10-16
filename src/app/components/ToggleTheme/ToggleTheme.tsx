'use client';

import { useState } from 'react';

import styles from './_toggleTheme.module.scss';

const themeIcon = { light: '明るいアイコン', dark: '暗いアイコン' } as const;
type ThemeIconTypeAlias = keyof typeof themeIcon;

const ToggleTheme = () => {
  const [theme, setTheme] = useState<ThemeIconTypeAlias>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button type="button" className={styles.toggleThemeButton} onClick={toggleTheme}>
      {themeIcon[theme]}
    </button>
  );
};
export default ToggleTheme;
