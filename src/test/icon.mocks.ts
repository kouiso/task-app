import { vi } from 'vitest';

// SVGアイコンのモック
vi.mock('../../public/icons', () => ({
  __esModule: true,
  default: {
    // 必要なアイコンがあればここに追加
  },
}));
