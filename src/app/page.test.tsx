import { describe, expect, it } from 'vitest';

import { render, screen } from '../test/utils';

import HomePage from './page';

describe('HomePageコンポーネント', () => {
  it('Hello Worldが表示されること', () => {
    render(<HomePage />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('説明文が表示されること', () => {
    render(<HomePage />);

    expect(screen.getByText('Material-UI × Next.js × TypeScript')).toBeInTheDocument();
  });

  it('Get Startedボタンが表示されること', () => {
    render(<HomePage />);

    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });
});
