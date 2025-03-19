'use client';

import { useState } from 'react';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box } from '@mui/material';
import MuiAccordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';

import type { AccordionProps } from './types';

const CustomAccordion: React.FC<AccordionProps> = ({ trigger, children, onToggle }) => {
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleChange = (_event: React.SyntheticEvent, expanded: boolean) => {
    setIsActive(expanded);
    onToggle?.(expanded);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <MuiAccordion expanded={isActive} onChange={handleChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="accordion-content"
          id="accordion-header"
          sx={{
            borderBottom: isActive ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
          }}
        >
          {trigger}
        </AccordionSummary>
        <AccordionDetails>{children}</AccordionDetails>
      </MuiAccordion>
    </Box>
  );
};

export default CustomAccordion;
