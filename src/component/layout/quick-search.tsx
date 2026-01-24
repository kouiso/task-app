'use client';

import { Input } from '@/component/ui/input';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

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

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    router.push(`/search?keyword=${encodeURIComponent(trimmedQuery)}`);

    setQuery('');
    onSearchComplete?.();
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          className="w-full bg-background pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </form>
  );
}
