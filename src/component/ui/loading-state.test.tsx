// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoadingSpinner } from './loading-spinner';
import { PageSkeleton } from './page-skeleton';

describe('共通ローディング表示', () => {
  it.each([
    ['PageLoadingSpinner', <PageLoadingSpinner key="spinner" />],
    ['PageSkeleton', <PageSkeleton key="skeleton" />],
  ])('%s は読み込み中であることを支援技術へ伝える', (_name, component) => {
    render(component);

    const status = screen.getByRole('status');
    expect(within(status).getByText('読み込んでいます')).toHaveClass('sr-only');
  });
});
