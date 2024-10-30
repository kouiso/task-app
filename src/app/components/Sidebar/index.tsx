'use client';

import { useState } from 'react';

import classNames from 'classnames';
import Link from 'next/link';

import HamburgerIcon from '../Hamburger/index.icon';
import SidebarItem from '../SidebarItem';
import ToggleTheme from '../ToggleTheme';

import AccountBoxIcon from './account-box.icon';
import AddToPhotosIcon from './add-to-photo.icon';
import BarChartIcon from './bar-chart.icon';
import EventNoteIcon from './event-note.icon';
import styles from './style.module.scss';

const menus = [
  {
    id: 'account',
    title: 'アカウント',
    icon: <AccountBoxIcon />,
    activeIcon: <AccountBoxIcon fillColor="#fff" />,
    subMenus: [
      { id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' },
      { id: 'sub2', href: '/__TBD__', label: 'サブメニュー2' },
    ],
  },
  {
    id: 'record',
    title: '記録',
    icon: <BarChartIcon />,
    activeIcon: <BarChartIcon fillColor="#fff" />,
    subMenus: [
      { id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' },
      { id: 'sub2', href: '/__TBD__', label: 'サブメニュー2' },
      { id: 'sub3', href: '/__TBD__', label: 'サブメニュー3' },
      { id: 'sub4', href: '/__TBD__', label: 'サブメニュー4' },
    ],
  },
  {
    id: 'register',
    title: '登録',
    icon: <AddToPhotosIcon />,
    activeIcon: <AddToPhotosIcon fillColor="#fff" />,
    subMenus: [{ id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' }],
  },
  {
    id: 'other',
    title: 'その他',
    icon: <EventNoteIcon />,
    activeIcon: <EventNoteIcon fillColor="#fff" />,
    subMenus: [
      { id: 'sub1', href: '/__TBD__', label: 'サブメニュー1' },
      { id: 'sub2', href: '/__TBD__', label: 'サブメニュー2' },
      { id: 'sub3', href: '/__TBD__', label: 'サブメニュー3' },
    ],
  },
] as const;

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
                activeMenuIcon: menu.activeIcon,
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
