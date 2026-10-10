// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectError from './project/error';
import TaskError from './task/error';

afterEach(cleanup);
for (const [name, Boundary] of [
  ['project', ProjectError],
  ['task', TaskError],
] as const) {
  describe(`${name} unexpected error boundary`, () => {
    it('does not expose internal message or digest and gives a retry instruction', () => {
      const error = Object.assign(
        new Error('PRIVATE /srv/database password=PRIVATE_TOKEN SELECT internal_table'),
        { digest: 'PRIVATE_DIGEST' },
      );
      const { container } = render(<Boundary error={error} reset={vi.fn()} />);
      expect(container.textContent).not.toContain('PRIVATE');
      expect(container.textContent).not.toContain('internal_table');
      expect(screen.getByRole('heading', { name: 'エラーが発生しました' })).toBeTruthy();
      expect(
        screen.getByText('予期しないエラーが発生しました。もう一度お試しください。'),
      ).toBeTruthy();
    });
    it('keeps the accessible retry button and invokes the supplied reset once', () => {
      const reset = vi.fn();
      render(<Boundary error={new Error('internal failure')} reset={reset} />);
      fireEvent.click(screen.getByRole('button', { name: 'もう一度試す' }));
      expect(reset).toHaveBeenCalledTimes(1);
    });
  });
}
