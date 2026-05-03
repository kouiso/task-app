import { z } from 'zod';
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { TASK_STATUS } from '@/lib/constant/status';

export const taskStatusSchema = z.nativeEnum(TASK_STATUS);

export const taskPrioritySchema = z.nativeEnum(TASK_PRIORITY);
