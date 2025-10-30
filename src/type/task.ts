export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Status = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TaskWithRelations {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  assigneeId?: string;
  createdById: string;
  projectId?: string;
  dueDate?: Date;
  estimatedTime?: number;
  actualTime?: number;
  timeSpentMinutes?: number;
  isTimerActive?: boolean;
  timerStartedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
  timeEntries: {
    id: string;
    minutes: number;
    description?: string;
    createdAt: Date;
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

export interface FormattedTime {
  hours: number;
  minutes: number;
  formatted: string;
  display: string;
}

export function formatMinutesToTime(minutes: number): FormattedTime {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const formatted = `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
  const display = formatted;

  return {
    hours,
    minutes: remainingMinutes,
    formatted,
    display,
  };
}
