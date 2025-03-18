import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '../test/utils';

import HomePage from './page';

// Next/Imageコンポーネントをモック
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

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
