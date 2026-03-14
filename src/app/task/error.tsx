'use client';

import { Button } from '@/component/ui/button';

export default function PageError({
  error: err,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-xl font-semibold">エラーが発生しました</h2>
      <p className="text-muted-foreground">{err.message}</p>
      <Button onClick={reset}>もう一度試す</Button>
    </div>
  );
}
