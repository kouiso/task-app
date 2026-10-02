'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/component/ui/alert-dialog';

type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // このコンポーネントはクリック時点では閉じない。削除の成否が分かるまで
  // 開いたままにするため、成功時に閉じる判断は呼び出し側が持つ
  onConfirm: () => void;
  isPending: boolean;
  title?: string;
  description?: string;
};

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  title = '本当に削除しますか？',
  description = 'この操作は取り消せません。',
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // AlertDialogAction は既定でクリック時に閉じる。失敗時に
              // 「消えたように見えて実は残っている」状態にしないため、
              // 成功を確認した呼び出し側が閉じるまで開いたままにする
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? '削除中...' : '削除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
