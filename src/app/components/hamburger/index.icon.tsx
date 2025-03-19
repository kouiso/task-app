import React from 'react';

import { IconButton, SvgIcon } from '@mui/material';

type HamburgerIconProps = {
  isHamburgerActive?: boolean;
  onHamburgerClick?: () => void;
};

const OPACITY = {
  ACTIVE: 1,
  INACTIVE: 0.7,
} as const;

const hamburgerLines = (
  <SvgIcon viewBox="0 0 20 14">
    <path d="M0.25 13.5H19.75V11.3333H0.25V13.5ZM0.25 8.08333H19.75V5.91667H0.25V8.08333ZM0.25 0.5V2.66667H19.75V0.5H0.25Z" />
  </SvgIcon>
);

const hamburgerClose = (
  <SvgIcon viewBox="0 0 20 20">
    <path d="M2 2 L18 18" strokeWidth="2" />
    <path d="M2 18 L18 2" strokeWidth="2" />
  </SvgIcon>
);

const HamburgerIcon: React.FC<HamburgerIconProps> = ({ isHamburgerActive = false, onHamburgerClick }) => {
  const hamburgerIcon = !isHamburgerActive ? hamburgerLines : hamburgerClose;

  return (
    <IconButton
      sx={{
        opacity: isHamburgerActive ? OPACITY.INACTIVE : OPACITY.ACTIVE,
        transition: 'opacity 0.3s',
      }}
      onClick={onHamburgerClick}
      aria-label="メニュー"
    >
      {hamburgerIcon}
    </IconButton>
  );
};

export default HamburgerIcon;
