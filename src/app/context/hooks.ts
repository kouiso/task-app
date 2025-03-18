import { useContext } from 'react';

import { ThemeContext } from './ThemeContext';

const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export default useThemeContext;
