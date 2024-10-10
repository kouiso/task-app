'use client';

import { useState } from 'react';

import styles from './_toggleTheme.module.scss';

export const ToggleTheme = () => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button type="button" className={styles.toggleThemeButton} onClick={toggleTheme}>
      {theme === 'light' ? '🌞' : '🌙'}
    </button>
  );
};
