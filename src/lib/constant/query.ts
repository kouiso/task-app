import { TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

export const taskStatusSchema = z.nativeEnum(TaskStatus);

export const taskPrioritySchema = z.nativeEnum(TaskPriority);
