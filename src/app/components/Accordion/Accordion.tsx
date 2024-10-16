'use client';

import { useState } from 'react';

import classNames from 'classnames';

import styles from './accordion.module.scss';

type AccordionProps = {
  trigger: React.ReactNode;
  content: React.ReactNode;
  onToggle?: (isActive: boolean) => void;
};

const Accordion = ({ trigger, content, onToggle }: AccordionProps) => {
  const [isActive, setIsActive] = useState<boolean>(false);

  const toggleAccordion = (prevState: boolean) => () => {
    setIsActive(!prevState);
    onToggle?.(!prevState);
  };

  const accordionContentActiveStyle = {
    maxHeight: isActive ? '1000px' : '0px',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
  };

  return (
    <div className={styles.accordion}>
      <div
        className={classNames(styles.accordionTrigger, { [styles.open]: isActive })}
        onClick={toggleAccordion(isActive)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && toggleAccordion(isActive)}
      >
        {trigger}
      </div>

      <div
        className={classNames(styles.accordionContent, { [styles.open]: isActive })}
        style={accordionContentActiveStyle}
      >
        {content}
      </div>
    </div>
  );
};
export default Accordion;
