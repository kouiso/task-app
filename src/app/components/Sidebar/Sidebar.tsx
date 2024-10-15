'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import SidebarItem from '../SidebarItem/SidebarItem';

import styles from './_sidebar.module.scss';
import AccountBoxIcon from './AccountBox.icon';
import AddToPhotosIcon from './AddToPhotos.icon';
import BarChartIcon from './BarChart.icon';
import EventNoteIcon from './EventNote.icon';

const Sidebar = () => {
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleHamburgerClick = () => {
    setIsActive((prev) => !prev);
  };

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

  return (
    <aside className={styles.sidebar}>
      <button
        type="button"
        className={styles.sidebarHamburger}
        onClick={handleHamburgerClick}
        aria-label="Toggle sidebar"
      >
        <Image
          src={isActive ? '/images/icon_close_white_1.svg' : '/images/icon_hamburger_white_1.svg'}
          alt="ハンバーガーメニュー"
          width={20}
          height={13}
        />
      </button>

      <ul className={`${styles.sidebarList} ${isActive ? styles.sidebarList__active : ''}`}>
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
    </aside>
  );
};

export default Sidebar;
