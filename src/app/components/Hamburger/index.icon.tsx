import React from 'react';

import classNames from 'classnames';

import styles from './style.module.scss';

type HamburgerIconProps = {
  isHamburgerActive?: boolean;
};

const hamburgerLines = (
  <svg width="20" height="14" viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg">
    <path d="M0.25 13.5H19.75V11.3333H0.25V13.5ZM0.25 8.08333H19.75V5.91667H0.25V8.08333ZM0.25 0.5V2.66667H19.75V0.5H0.25Z" />
  </svg>
);

const hamburgerClose = (
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2 L18 18" strokeWidth="2" />
    <path d="M2 18 L18 2" strokeWidth="2" />
  </svg>
);

const HamburgerIcon: React.FC<HamburgerIconProps> = ({ isHamburgerActive = false }) => {
  const hamburgerIcon = !isHamburgerActive ? hamburgerLines : hamburgerClose;

  return (
    <figure className={classNames(styles.hamburgerIcon, { [styles.hamburgerIcon__active]: isHamburgerActive })}>
      {hamburgerIcon}
    </figure>
  );
};

export default HamburgerIcon;
