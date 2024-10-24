'use client';

import { useEffect, useState } from 'react';

import { Black, DarkTheme, LightTheme, White } from '../../colorCode';

import DarkModeIcon from './DarkMode.icon';
import LightModeIcon from './LightMode.icon';
import styles from './toggleTheme.module.scss';

type ThemeIconTypeAlias = 'light' | 'dark';

const updateCSSVariables = (theme: ThemeIconTypeAlias) => {
  const themeVariables = theme === 'light' ? LightTheme : DarkTheme;

  Object.entries(themeVariables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

const ToggleTheme = () => {
  const [theme, setTheme] = useState<ThemeIconTypeAlias>(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeIconTypeAlias;
    return savedTheme || 'dark';
  });

  useEffect(() => {
    updateCSSVariables(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    updateCSSVariables(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const lightModeActiveClass = theme === 'light' ? styles.active : '';
  const darkModeActiveClass = theme === 'dark' ? styles.active : '';
  const iconColor = theme === 'light' ? Black : White;

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
