/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskCard } from '../task-card';

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
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render task description', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />);
    
    const card = screen.getByText('Test Task').closest('[role="button"]');
    if (card) {
      await user.click(card);
      expect(mockOnClick).toHaveBeenCalledWith('task-1');
    }
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />);
    
    const editButton = screen.getByLabelText(/edit/i);
    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith('task-1');
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCard {...defaultProps} />);
    
    const deleteButton = screen.getByLabelText(/delete/i);
    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('task-1');
  });

  it('should display assignee information when provided', () => {
    const propsWithAssignee = {
      ...defaultProps,
      assignee: {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: null,
      },
    };
    
    render(<TaskCard {...propsWithAssignee} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should display due date when provided', () => {
    const dueDate = new Date('2024-12-31');
    const propsWithDueDate = {
      ...defaultProps,
      dueDate,
    };
    
    render(<TaskCard {...propsWithDueDate} />);
    // Due date should be visible in some format
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('should render different status chips correctly', () => {
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
    
    statuses.forEach((status) => {
      const { unmount } = render(<TaskCard {...defaultProps} status={status} />);
      expect(screen.getByText(status.replace('_', ' '))).toBeInTheDocument();
      unmount();
    });
  });
});
