'use client';

import { Button } from '@/component/ui/button';

export default function PageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-xl font-semibold">エラーが発生しました</h2>
      <p className="text-muted-foreground">
        予期しないエラーが発生しました。もう一度お試しください。
      </p>
      <Button onClick={reset}>もう一度試す</Button>
    </div>
  );
}
