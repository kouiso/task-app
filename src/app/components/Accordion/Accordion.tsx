'use client';

import { useState } from 'react';

import classNames from 'classnames';

import styles from './accordion.module.scss';

type AccordionProps = {
  trigger: React.ReactNode;
  content: React.ReactNode;
  onToggle?: (isActive: boolean) => void;
};

const Accordion: React.FC<AccordionProps> = ({ trigger, content, onToggle }) => {
  const [isActive, setIsActive] = useState<boolean>(false);

  const toggleAccordion = (currentActiveState: boolean) => () => {
    const newActiveState = !currentActiveState;
    setIsActive(newActiveState);
    onToggle?.(newActiveState);
  };

  const handleClick = () => {
    toggleAccordion(isActive);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return;
    toggleAccordion(isActive);
  };

  return (
    <div className={styles.accordion}>
      <div
        className={classNames(styles.accordionTrigger, { [styles.open]: isActive })}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyUp={handleKeyUp}
      >
        {trigger}
      </div>

      <div className={classNames(styles.accordionContent, { [styles.open]: isActive })}>{content}</div>
    </div>
  );
};
export default Accordion;
