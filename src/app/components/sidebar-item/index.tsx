'use client';

import { useState } from 'react';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, List, Typography } from '@mui/material';

type SidebarItemProps = {
  head: {
    title: string;
    menuIcon: React.ReactNode;
  };
  children: React.ReactNode;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ head, children }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };

  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <Accordion
        expanded={expanded}
        onChange={handleChange}
        disableGutters
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          '&:before': {
            display: 'none',
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            p: 0,
            minHeight: 'auto',
            '& .MuiAccordionSummary-content': {
              m: 0,
            },
            '&.Mui-expanded': {
              minHeight: 'auto',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              borderRadius: '6px',
              p: 0.8,
              pl: 5,
              position: 'relative',
              width: '100%',
              bgcolor: expanded ? 'primary.main' : 'transparent',
              color: expanded ? 'common.white' : 'inherit',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'common.white',
                cursor: 'pointer',
                '& svg': {
                  fill: 'white',
                },
              },
              '& svg': {
                fill: expanded ? 'white' : 'inherit',
              },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                width: '24px',
                height: '24px',
              }}
            >
              {head.menuIcon}
            </Box>
            <Typography>{head.title}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <List
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.2,
              mt: 0.8,
              p: 0.8,
              pl: 5,
              '& a': {
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': {
                  color: 'primary.main',
                  fontWeight: 600,
                },
              },
            }}
          >
            {children}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SidebarItem;
