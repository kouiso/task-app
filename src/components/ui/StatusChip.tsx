'use client';
import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import { TaskStatus } from '@prisma/client';
import { getStatusLabel, getStatusColor } from '@/lib/constants/status';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: TaskStatus;
  size?: 'small' | 'medium';
}

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'small',
  ...props
}) => {
  const label = getStatusLabel(status);
  const color = getStatusColor(status) as ChipProps['color'];

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

export default StatusChip;
