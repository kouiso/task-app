'use client';

import { useEffect, useState } from 'react';

import classNames from 'classnames';

import useLocalStorage from '@/lib/use-local-storage/index';

import DarkModeIcon from './dark-mode.icon';
import LightModeIcon from './light-mode.icon';
import styles from './style.module.scss';

const ToggleTheme = () => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(
    'theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme-mode', theme);
    }
    setMounted(true);
  }, [theme]);

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
