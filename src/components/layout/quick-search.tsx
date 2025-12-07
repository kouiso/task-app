'use client';

import SearchIcon from '@mui/icons-material/Search';
import { InputBase, alpha, styled } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

/**
 * クイック検索コンポーネント
 * ナビゲーションバーに統合可能な簡易検索機能
 * 条件分岐を最小限に抑えたスマートな実装
 */

// スタイル定義
const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}));

interface QuickSearchProps {
  placeholder?: string;
  onSearchComplete?: () => void;
}

export function QuickSearch({
  placeholder = 'タスク・プロジェクトを検索...',
  onSearchComplete,
}: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  /**
   * 検索実行ハンドラー（早期リターンパターン）
   */
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();

    const trimmedQuery = query.trim();

    // 早期リターン: 空の検索クエリは処理しない
    if (!trimmedQuery) return;

    // 検索ページへナビゲート
    router.push(`/search?keyword=${encodeURIComponent(trimmedQuery)}`);

    // 検索後の処理
    setQuery('');
    onSearchComplete?.();
  };

  return (
    <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
      <SearchContainer>
        <SearchIconWrapper>
          <SearchIcon />
        </SearchIconWrapper>
        <StyledInputBase
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputProps={{ 'aria-label': 'search' }}
        />
      </SearchContainer>
    </form>
  );
}
