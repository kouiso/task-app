/**
 * @vitest-environment jsdom
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTRPCTestUtils } from '../../../test/helpers';
import { TaskCard } from '../task-card';

// Mock the TaskTimer and TimeLogDialog components to avoid tRPC calls
vi.mock('../task-timer', () => ({
  TaskTimer: ({ taskId, isTimerActive, onTimerUpdate }: any) => (
    <div data-testid="task-timer">
      <button
        data-testid={isTimerActive ? 'stop-timer-button' : 'start-timer-button'}
        onClick={() => onTimerUpdate?.()}
        aria-label={isTimerActive ? 'Stop timer' : 'Start timer'}
      >
        {isTimerActive ? 'Stop Timer' : 'Start Timer'}
      </button>
    </div>
  ),
}));

vi.mock('../time-log-dialog', () => ({
  TimeLogDialog: ({ open, onClose, taskId, onSuccess }: any) => (
    <div data-testid="time-log-dialog" style={{ display: open ? 'block' : 'none' }}>
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Add Time</button>
    </div>
  ),
}));

// Create wrapper for tRPC provider
function createWrapper() {
  const { trpcReact, queryClient, trpcClient } = createTRPCTestUtils();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <trpcReact.Provider client={trpcClient} queryClient={queryClient}>
          {children}
        </trpcReact.Provider>
      </QueryClientProvider>
    );
  }

  return Wrapper;
}

describe('TaskCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClick = vi.fn();

  const defaultProps = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as const,
    priority: 'HIGH' as const,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onClick: mockOnClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render task title', () => {
    const Wrapper = createWrapper();
    render(<TaskCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render task description', () => {
    const Wrapper = createWrapper();
    render(<TaskCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', async () => {
    const Wrapper = createWrapper();
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />, { wrapper: Wrapper });

    const card = screen.getByText('Test Task').closest('[role="button"]');
    if (card) {
      await user.click(card);
      expect(mockOnClick).toHaveBeenCalledWith('task-1');
    }
  });

  it('should call onEdit when edit button is clicked', async () => {
    const Wrapper = createWrapper();
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />, { wrapper: Wrapper });

    const editButton = screen.getByLabelText(/edit/i);
    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith('task-1');
  });

  it('should call onDelete when delete button is clicked', async () => {
    const Wrapper = createWrapper();
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />, { wrapper: Wrapper });

    const deleteButton = screen.getByLabelText(/delete/i);
    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('task-1');
  });

  it('should display assignee information when provided', () => {
    const Wrapper = createWrapper();
    const propsWithAssignee = {
      ...defaultProps,
      assignee: {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: null,
      },
    };

    render(<TaskCard {...propsWithAssignee} />, { wrapper: Wrapper });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should display due date when provided', () => {
    const Wrapper = createWrapper();
    const dueDate = new Date('2024-12-31');
    const propsWithDueDate = {
      ...defaultProps,
      dueDate,
    };

    render(<TaskCard {...propsWithDueDate} />, { wrapper: Wrapper });
    // Due date should be visible in some format
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('should render different status chips correctly', () => {
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

    statuses.forEach((status) => {
      const Wrapper = createWrapper();
      const { unmount } = render(<TaskCard {...defaultProps} status={status} />, {
        wrapper: Wrapper,
      });
      // Status is displayed as is (with underscores), not replaced with spaces
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    });
  });
});
