'use client';

import { useState } from 'react';

import classNames from 'classnames';

import Accordion from '../Accordion/Accordion';

import styles from './_sidebarItem.module.scss';

interface SidebarItemProps {
  head: {
    title: string;
    menuIcon: string;
    activeMenuIcon: string;
  };
  children: React.ReactNode; // ReactNodeを使用して子要素を定義
}

const SidebarItem = ({ head, children }: SidebarItemProps) => {
  const [isAccordionActive, setIsAccordionActive] = useState(false);

  const handleToggle = (accordionActive: boolean) => {
    setIsAccordionActive(accordionActive);
  };

  const sidebarItemAccordionTrigger = (
    <p
      className={classNames(styles.sidebarItemText, {
        [styles.sidebarItemText__active]: isAccordionActive,
      })}
    >
      <object
        className={classNames(styles.sidebarItemTextIcon, styles.sidebarItemTextIcon__menu)}
        type="image/svg+xml"
        data={isAccordionActive ? head.activeMenuIcon : head.menuIcon}
      />
      {head.title}

      <object
        className={classNames(styles.sidebarItemTextIcon, styles.sidebarItemTextIcon__arrow)}
        type="image/svg+xml"
        data={isAccordionActive ? '/images/icon_arrow_down_white_1.svg' : '/images/icon_arrow_down_grey_1.svg'}
      />
    </p>
  );

  const sidebarItemAccordionContent = <ul className={styles.sidebarListChildren}>{children}</ul>;

  return (
    <li className={styles.sidebarItem}>
      <Accordion trigger={sidebarItemAccordionTrigger} content={sidebarItemAccordionContent} onToggle={handleToggle} />
    </li>
  );
};

export default SidebarItem;
