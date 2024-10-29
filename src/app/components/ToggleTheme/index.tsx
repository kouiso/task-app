'use client';

import { useLocalStorage } from 'react-use';

import DarkModeIcon from './dark-mode.icon';
import LightModeIcon from './light-mode.icon';
import styles from './style.module.scss';

const ToggleTheme = () => {
  const [isDark, setIsDark] = useLocalStorage<boolean>('isDark', true);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.setAttribute('data-is-dark-theme', newIsDark.toString());
  };

  const lightModeActiveClass = { [styles.toggleThemeButtonIcon__active]: !isDark };
  const darkModeActiveClass = { [styles.toggleThemeButtonIcon__active]: isDark };
  const iconIsDarkClass = { [styles.isDark]: isDark };

  return (
    <button type="button" className={styles.toggleThemeButton} onClick={toggleTheme}>
      <figure className={`${styles.toggleThemeButtonIcon} ${lightModeActiveClass} ${iconIsDarkClass}`}>
        <LightModeIcon />
      </figure>
      <span>/</span>
      <figure className={`${styles.toggleThemeButtonIcon} ${darkModeActiveClass} ${iconIsDarkClass}`}>
        <DarkModeIcon />
      </figure>
    </button>
  );
};

export default ToggleTheme;
