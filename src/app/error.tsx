'use client';

import { useEffect } from 'react';
import { Button } from '@/component/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">ページを表示できませんでした</h2>
        <p className="text-muted-foreground">もう一度お試しください。</p>
        <Button onClick={reset}>もう一度試す</Button>
      </div>
    </div>
  );
}
