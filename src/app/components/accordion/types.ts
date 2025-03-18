import type { ReactNode } from 'react';

export type AccordionProps = {
  trigger: ReactNode;
  children: ReactNode;
  onToggle?: (isActive: boolean) => void;
};
