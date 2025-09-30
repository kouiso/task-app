'use client';
import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import { TaskPriority } from '@prisma/client';
import { getPriorityLabel, getPriorityColor } from '@/lib/constants/priority';

interface PriorityChipProps extends Omit<ChipProps, 'color'> {
  priority: TaskPriority;
  size?: 'small' | 'medium';
}

const PriorityChip: React.FC<PriorityChipProps> = ({
  priority,
  size = 'small',
  ...props
}) => {
  const label = getPriorityLabel(priority);
  const color = getPriorityColor(priority) as ChipProps['color'];

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant="filled"
      {...props}
    />
  );
};

export default PriorityChip;
