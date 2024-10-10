'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import classNames from 'classnames';

import styles from './accordion.module.scss';

interface AccordionProps {
  trigger: ReactNode;
  content: ReactNode;
  onToggle?: (isActive: boolean) => void;
}

const Accordion = ({ trigger, content, onToggle }: AccordionProps) => {
  const [isActive, setIsActive] = useState(false);

  const toggleAccordion = () => {
    setIsActive(!isActive);
    if (onToggle) {
      onToggle(!isActive);
    }
  };

  return (
    <div className={styles.accordion}>
      <div
        className={classNames(styles.accordionTrigger, { [styles.open]: isActive })}
        onClick={toggleAccordion}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && toggleAccordion()}
      >
        {trigger}
      </div>

      <div
        className={classNames(styles.accordionContent, { [styles.open]: isActive })}
        style={{
          maxHeight: isActive ? '1000px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        {content}
      </div>
    </div>
  );
};
export default Accordion;
