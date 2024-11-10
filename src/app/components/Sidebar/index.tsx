'use client';

import { useState } from 'react';

import classNames from 'classnames';
import Link from 'next/link';

import HamburgerIcon from '../Hamburger/index.icon';
import SidebarItem from '../SidebarItem';
import ToggleTheme from '../ToggleTheme';

import menus from './constants';
import styles from './style.module.scss';

const Sidebar = () => {
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleHamburgerClick = () => {
    setIsActive((prev) => !prev);
  };

  return (
    <aside className={styles.sidebar}>
      <button
        type="button"
        className={styles.sidebarHamburger}
        onClick={handleHamburgerClick}
        aria-label="Toggle sidebar"
      >
        <HamburgerIcon isHamburgerActive={isActive} />
      </button>

      <div className={classNames(styles.sidebar_content, isActive ? styles.sidebar_content__active : '')}>
        <ul className={styles.sidebarList}>
          {menus.map((menu) => (
            <SidebarItem
              key={menu.id}
              head={{
                title: menu.title,
                menuIcon: menu.icon,
              }}
            >
              {menu.subMenus.map((subMenu) => (
                <Link key={subMenu.id} className={styles.sidebarListChildrenItemLink} href={subMenu.href}>
                  {subMenu.label}
                </Link>
              ))}
            </SidebarItem>
          ))}
        </ul>

        <ToggleTheme />
      </div>
    </aside>
  );
};

export default Sidebar;
