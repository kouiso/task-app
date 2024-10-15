'use client';

import { useState } from 'react';

import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';

import Accordion from '../Accordion/Accordion';

import styles from './_header.module.scss';

const Header = () => {
  const [isAccordionActive, setIsAccordionActive] = useState<boolean>(false);

  const handleAccordionToggle = (accordionIsActive: boolean) => {
    setIsAccordionActive(accordionIsActive);
  };

  const headerProfileAccordionTrigger = (
    <div
      className={classNames(
        styles.headerRightProfileFlex,
        isAccordionActive ? styles.headerRightProfileFlex__active : '',
      )}
    >
      <figure className={styles.headerRightProfileFlexFigure}>
        <Image src="/images/test/test_image_profile_icon_1.png" alt="__TBD__" width={44} height={44} />
      </figure>
      <div className={styles.headerRightProfileFlexDesc}>
        <p className={styles.headerRightProfileFlexDescUserame}>Kousuke</p>
        <p className={styles.headerRightProfileFlexDescUserrole}>Lead Developer</p>
      </div>
      <Image
        className={styles.headerRightProfileFlexArrow}
        src="/images/icon_arrow_down_white_1.svg"
        alt="白い下向きの矢印"
        width={44}
        height={44}
      />
    </div>
  );

  const headerProfileAccordionContent = (
    <ul
      className={classNames(
        styles.headerRightProfileMenu,
        isAccordionActive ? styles.headerRightProfileLinkList__active : '',
      )}
    >
      <li className={styles.headerRightProfileMenuItem}>
        <Link href="__TBD__" className={styles.headerRightProfileMenuItemLink}>
          メニュー1
        </Link>
      </li>
      <li className={styles.headerRightProfileMenuItem}>
        <Link href="__TBD__" className={styles.headerRightProfileMenuItemLink}>
          メニュー2
        </Link>
      </li>
      <li className={styles.headerRightProfileMenuItem}>
        <Link href="__TBD__" className={styles.headerRightProfileMenuItemLink}>
          メニュー3
        </Link>
      </li>
    </ul>
  );

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <article className={styles.headerSearchWrap}>
          <form className={styles.headerSearch}>
            <button type="submit" className={styles.headerSearchButton}>
              <Image src="/images/icon_search_primary_1.svg" alt="虫眼鏡のアイコン" width={24} height={24} />
            </button>
            <input className={styles.headerSearchInput} type="text" placeholder="Search..." />
          </form>
        </article>

        <div className={styles.headerRight}>
          <ul className={styles.headerRightIconList}>
            <li className={`${styles.headerRightIconListItem}`}>
              <button type="button">
                <Image src="/images/icon_links_primary_1.svg" alt="リンクのアイコン" width={24} height={24} />
              </button>
            </li>
            <li className={`${styles.headerRightIconListItem} ${styles.headerRightIconListItem__ringIcon}`}>
              <button type="button">
                <Image src="/images/icon_ring_primary_1.svg" alt="ベルのアイコン" width={24} height={24} />
              </button>
            </li>
            <li className={`${styles.headerRightIconListItem}`}>
              <button type="button">
                <Image src="/images/icon_setting_primary_1.svg" alt="歯車のアイコン" width={24} height={24} />
              </button>
            </li>
          </ul>

          <article className={styles.headerRightProfile}>
            <Accordion
              trigger={headerProfileAccordionTrigger}
              content={headerProfileAccordionContent}
              onToggle={handleAccordionToggle}
            />
          </article>
        </div>
      </div>
    </header>
  );
};

export default Header;
