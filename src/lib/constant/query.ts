export const QUERY_LIMITS = {
  DEFAULT: 50,
  MAX: 200,
  SEARCH_DEFAULT: 20,
  SEARCH_ASSIGNEES: 10,
} as const;

// タイマー計算でミリ秒→分変換に使用
export const MILLISECONDS_PER_MINUTE = 60000;
