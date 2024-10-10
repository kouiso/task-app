'use client';

import { useState } from 'react';

import Image from 'next/image';

import SidebarItem from '../SidebarItem/SidebarItem';

import styles from './_sidebar.module.scss';

const Sidebar = () => {
  const [isActive, setIsActive] = useState(false);

  const handleHamburgerClick = () => {
    setIsActive(!isActive);
  };

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
        <SidebarItem
          head={{
            title: 'アカウント',
            menuIcon: '/images/icon_account_box_grey_1.svg',
            activeMenuIcon: '/images/icon_account_box_white_1.svg',
          }}
        >
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー1
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー2
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー3
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー4
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー5
          </a>
        </SidebarItem>

        <SidebarItem
          head={{
            title: '記録',
            menuIcon: '/images/icon_bar_chart_grey_1.svg',
            activeMenuIcon: '/images/icon_bar_chart_white_1.svg',
          }}
        >
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー1
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー2
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー3
          </a>
        </SidebarItem>

        <SidebarItem
          head={{
            title: '登録',
            menuIcon: '/images/icon_add_to_photos_grey_1.svg',
            activeMenuIcon: '/images/icon_add_to_photos_white_1.svg',
          }}
        >
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー1
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー2
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー3
          </a>
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー4
          </a>
        </SidebarItem>

        <SidebarItem
          head={{
            title: 'その他',
            menuIcon: '/images/icon_event_note_grey_1.svg',
            activeMenuIcon: '/images/icon_event_note_white_1.svg',
          }}
        >
          <a className={styles.sidebarListChildrenItemLink} href="/__TBD__">
            サブメニュー1
          </a>
        </SidebarItem>
      </ul>
    </aside>
  );
};

export default Sidebar;
