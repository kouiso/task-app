'use client';

import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Box, IconButton } from '@mui/material';

import useThemeContext from '../../context/hooks';

const OPACITY = {
  ACTIVE: 1,
  INACTIVE: 0.5,
} as const;

const SPACING = {
  SMALL: 0.5,
  MEDIUM: 1,
} as const;

const ToggleTheme = () => {
  const { mode, toggleTheme } = useThemeContext();
  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        p: SPACING.MEDIUM,
      }}
    >
      <IconButton
        sx={{
          mr: SPACING.MEDIUM,
          opacity: isDark ? OPACITY.INACTIVE : OPACITY.ACTIVE,
          transition: 'opacity 0.3s',
        }}
        color="inherit"
        aria-label="ライトモードに切り替え"
        onClick={isDark ? toggleTheme : undefined}
      >
        <Brightness7Icon />
      </IconButton>
      <Box sx={{ mx: SPACING.SMALL, userSelect: 'none' }}>/</Box>
      <IconButton
        sx={{
          ml: SPACING.MEDIUM,
          opacity: isDark ? OPACITY.ACTIVE : OPACITY.INACTIVE,
          transition: 'opacity 0.3s',
        }}
        color="inherit"
        aria-label="ダークモードに切り替え"
        onClick={!isDark ? toggleTheme : undefined}
      >
        <Brightness4Icon />
      </IconButton>
    </Box>
  );
};

export default ToggleTheme;
