'use client';

import { useState } from 'react';

import MenuIcon from '@mui/icons-material/Menu';
import { Box, Drawer, IconButton, List, styled, useMediaQuery, useTheme } from '@mui/material';
import Link from 'next/link';

import SidebarItem from '../sidebar-item';
import ToggleTheme from '../toggle-theme';

import menus from './constants';

const drawerWidth = 280; // ~28remに相当

const SidebarContainer = styled(Box)(({ theme }) => ({
  [theme.breakpoints.up('sm')]: {
    width: drawerWidth,
    flexShrink: 0,
  },
}));

const Sidebar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: { xs: '24px 16px', sm: '32px 24px' },
        overflowY: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <List
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.8,
          mb: 8,
          mt: 0,
          width: '100%',
        }}
      >
        {menus.map((menu) => (
          <SidebarItem
            key={menu.id}
            head={{
              title: menu.title,
              menuIcon: menu.icon,
            }}
          >
            {menu.subMenus.map((subMenu) => (
              <Link key={subMenu.id} href={subMenu.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                {subMenu.label}
              </Link>
            ))}
          </SidebarItem>
        ))}
      </List>
      <Box mt="auto">
        <ToggleTheme />
      </Box>
    </Box>
  );

  return (
    <SidebarContainer>
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            left: 16,
            top: 18,
            zIndex: 9999,
            width: '30px',
            height: '30px',
            borderRadius: '6px',
            '&:hover': {
              bgcolor: 'primary.main',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: { xs: 'min(320px, 80%)', sm: drawerWidth },
              top: { xs: '56px', sm: '64px' }, // ヘッダーの高さに合わせる
              height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Box
          component="aside"
          sx={{
            width: drawerWidth,
            height: '100%',
          }}
        >
          {sidebarContent}
        </Box>
      )}
    </SidebarContainer>
  );
};

export default Sidebar;
