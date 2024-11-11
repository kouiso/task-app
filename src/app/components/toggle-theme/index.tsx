'use client';

import { useEffect, useState } from 'react';
import { useLocalStorage } from 'react-use';

import classNames from 'classnames';

import DarkModeIcon from './dark-mode.icon';
import LightModeIcon from './light-mode.icon';
import styles from './style.module.scss';

const ToggleTheme = () => {
  const [theme, setTheme] = useLocalStorage<string | undefined>('theme', undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (theme === undefined) {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDarkMode ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme-mode', initialTheme);
    } else {
      document.documentElement.setAttribute('data-theme-mode', theme);
    }
    setMounted(true);
  }, [theme, setTheme]);

  if (theme === undefined) {
    return null;
  }

  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark';

  const reverseTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme-mode', newTheme);
  };

  const lightModeActiveClass = { [styles.toggleThemeButtonIcon__active]: !isDark };
  const darkModeActiveClass = { [styles.toggleThemeButtonIcon__active]: isDark };

  return (
    <button type="button" className={styles.toggleThemeButton} onClick={reverseTheme}>
      <figure className={classNames(styles.toggleThemeButtonIcon, lightModeActiveClass)}>
        <LightModeIcon />
      </figure>
      <span>/</span>
      <figure className={classNames(styles.toggleThemeButtonIcon, darkModeActiveClass)}>
        <DarkModeIcon />
      </figure>
    </button>
  );
};

export default ToggleTheme;
