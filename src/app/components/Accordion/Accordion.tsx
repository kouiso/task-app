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

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      toggleAccordion(isActive);
    }
  };

  return (
    <div className={styles.accordion}>
      <div
        className={classNames(styles.accordionTrigger, { [styles.open]: isActive })}
        onClick={toggleAccordion(isActive)}
        role="button"
        tabIndex={0}
        onKeyUp={handleKeyPress}
      >
        {trigger}
      </div>

      <div className={classNames(styles.accordionContent, { [styles.open]: isActive })}>{content}</div>
    </div>
  );
};
export default Accordion;
