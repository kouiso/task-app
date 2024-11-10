'use client';

import { useState } from 'react';

import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';

import Accordion from '../Accordion';

import ArrowDownWhiteIcon from './Icon/arrow-down-white.icon';
import LinkPrimaryIcon from './Icon/link-primary.icon';
import RingPrimaryIcon from './Icon/ring-primary.icon';
import SearchPrimaryIcon from './Icon/search-primary.icon';
import SettingPrimaryIcon from './Icon/setting-primary.icon';
import styles from './style.module.scss';

const headerIconMenus = [
  {
    id: 'link',
    image: <LinkPrimaryIcon />,
    alt: 'リンクのアイコン',
    class: '',
  },
  {
    id: 'bell',
    image: <RingPrimaryIcon />,
    alt: 'ベルのアイコン',
    class: `${styles.headerRightIconListItem__ringIcon}`,
  },
  {
    id: 'setting',
    image: <SettingPrimaryIcon />,
    alt: '歯車のアイコン',
    class: '',
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
  const [isAccordionActive, setIsAccordionActive] = useState<boolean>(false);

  const handleAccordionToggle = (accordionIsActive: boolean) => {
    setIsAccordionActive(accordionIsActive);
  };

  const headerProfileAccordionTrigger = (
    <div
      className={classNames(styles.headerRightProfileFlex, {
        [styles.headerRightProfileFlex__active]: isAccordionActive,
      })}
    >
      <figure className={styles.headerRightProfileFlexFigure}>
        <Image src="/Test/test_image_profile_icon_1.png" alt="__TBD__" width={44} height={44} />
      </figure>
      <div className={styles.headerRightProfileFlexDesc}>
        <p className={styles.headerRightProfileFlexDescUserame}>Kousuke</p>
        <p className={styles.headerRightProfileFlexDescUserrole}>Lead Developer</p>
      </div>
      <ArrowDownWhiteIcon />
    </div>
  );

  const headerProfileAccordionContent = (
    <ul
      className={classNames(
        styles.headerRightProfileMenu,
        isAccordionActive ? styles.headerRightProfileLinkList__active : '',
      )}
    >
      {headerProfMenus.map((headerProfMenu) => (
        <li key={headerProfMenu.id} className={styles.headerRightProfileMenuItem}>
          <Link href={headerProfMenu.href} className={styles.headerRightProfileMenuItemLink}>
            {headerProfMenu.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <article className={styles.headerSearchWrap}>
          <form className={styles.headerSearch}>
            <button type="submit" className={styles.headerSearchButton}>
              <SearchPrimaryIcon />
            </button>
            <input className={styles.headerSearchInput} type="text" placeholder="Search..." />
          </form>
        </article>

        <div className={styles.headerRight}>
          <ul className={styles.headerRightIconList}>
            {headerIconMenus.map((menu) => (
              <li key={menu.id} className={`${styles.headerRightIconListItem} ${menu.class}`}>
                <button type="button">{menu.image}</button>
              </li>
            ))}
          </ul>

          <article className={styles.headerRightProfile}>
            <Accordion trigger={headerProfileAccordionTrigger} onToggle={handleAccordionToggle}>
              {headerProfileAccordionContent}
            </Accordion>
          </article>
        </div>
      </div>
    </header>
  );
};

export default Header;
