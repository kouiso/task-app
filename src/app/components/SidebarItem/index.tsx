'use client';

import { useState } from 'react';

import classNames from 'classnames';

import Accordion from '../Accordion';

import ArrowDownIcon from './arrow-down.icon';
import styles from './style.module.scss';

type SidebarItemProps = {
  head: {
    title: string;
    menuIcon: React.ReactNode;
    activeMenuIcon: React.ReactNode;
  };
  children: React.ReactNode;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ head, children }) => {
  const [isAccordionActive, setIsAccordionActive] = useState<boolean>(false);

  const handleToggle = (accordionActive: boolean) => {
    setIsAccordionActive(accordionActive);
  };

  const sidebarItemAccordionTrigger = (
    <div
      className={classNames(styles.sidebarItemText, {
        [styles.sidebarItemText__active]: isAccordionActive,
      })}
    >
      <figure className={classNames(styles.sidebarItemTextIcon, styles.sidebarItemTextIcon__menu)}>
        {isAccordionActive ? head.activeMenuIcon : head.menuIcon}
      </figure>
      {head.title}

      <figure className={classNames(styles.sidebarItemTextIcon, styles.sidebarItemTextIcon__arrow)}>
        <ArrowDownIcon fillColor={isAccordionActive ? '#fff' : '#495D68'} />
      </figure>
    </div>
  );

  const sidebarItemAccordionContent = <ul className={styles.sidebarListChildren}>{children}</ul>;

  return (
    <li className={styles.sidebarItem}>
      <Accordion trigger={sidebarItemAccordionTrigger} content={sidebarItemAccordionContent} onToggle={handleToggle} />
    </li>
  );
};

export default SidebarItem;
