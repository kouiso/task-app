import { describe, expect, it } from 'vitest';

import { render, screen } from '../test/utils';

import HomePage from './page';

describe('HomePageコンポーネント', () => {
  it('Next.jsのロゴが表示されること', () => {
    render(<HomePage />);

    // Next.jsのロゴの代替テキストが表示されていることを確認
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Next.js logo');
  });

  it('ロゴが正しいURLを参照していること', () => {
    render(<HomePage />);

    // ロゴのURLが正しいことを確認
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://nextjs.org/icons/next.svg');
  });
});
