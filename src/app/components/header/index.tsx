'use client';

import { useState } from 'react';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  styled,
  useTheme,
} from '@mui/material';
import Link from 'next/link';

const SPACING = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
} as const;

const PROFILE_ICON = {
  SIZE: 44,
} as const;

const MOBILE_POSITION = {
  RIGHT: 16,
  TOP: 20,
} as const;

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  marginRight: theme.spacing(SPACING.MEDIUM),
  marginLeft: 0,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  [theme.breakpoints.down('sm')]: {
    marginLeft: theme.spacing(SPACING.LARGE),
    width: '80%',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, SPACING.MEDIUM),
  height: '100%',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    width: '100%',
  },
}));

const headerIconMenus = [
  {
    id: 'link',
    icon: <LinkIcon />,
    alt: 'リンクのアイコン',
  },
  {
    id: 'bell',
    icon: <NotificationsIcon />,
    alt: 'ベルのアイコン',
  },
  {
    id: 'setting',
    icon: <SettingsIcon />,
    alt: '歯車のアイコン',
  },
];

const headerProfMenus = [
  {
    id: 'menu1',
    href: '__TBD__',
    label: 'メニュー1',
  },
  {
    id: 'menu2',
    href: '__TBD__',
    label: 'メニュー2',
  },
  {
    id: 'menu3',
    href: '__TBD__',
    label: 'メニュー3',
  },
];

const Header = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: 'background.paper' }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: SPACING.LARGE, sm: SPACING.LARGE } }}>
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase placeholder="Search..." inputProps={{ 'aria-label': 'search' }} />
        </Search>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              gap: SPACING.SMALL,
              mr: SPACING.MEDIUM,
              [theme.breakpoints.down('sm')]: {
                position: 'fixed',
                right: MOBILE_POSITION.RIGHT,
                top: MOBILE_POSITION.TOP,
                zIndex: 9999,
                '& > *:not(:nth-of-type(2))': {
                  display: { xs: 'none', sm: 'block' },
                },
              },
            }}
          >
            {headerIconMenus.map((menu) => (
              <IconButton key={menu.id} size="large" aria-label={menu.alt}>
                {menu.icon}
              </IconButton>
            ))}
          </Box>

          <Box
            sx={{
              minWidth: '18rem',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Box
              onClick={handleClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.SMALL,
                cursor: 'pointer',
              }}
            >
              <Avatar
                src="/test/test_image_profile_icon_1.png"
                alt="プロフィールアイコン"
                sx={{ width: PROFILE_ICON.SIZE, height: PROFILE_ICON.SIZE }}
              />
              <Box sx={{ pr: SPACING.LARGE, position: 'relative' }}>
                <Typography variant="body2" fontWeight={600}>
                  Kousuke
                </Typography>
                <Typography variant="body2">Lead Developer</Typography>
                <KeyboardArrowDownIcon
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: open ? 'translateY(-50%) rotate(-180deg)' : 'translateY(-50%)',
                    transition: '0.5s',
                  }}
                />
              </Box>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {headerProfMenus.map((menu) => (
                <MenuItem key={menu.id} onClick={handleClose} component={Link} href={menu.href}>
                  {menu.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
