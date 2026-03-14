'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '@/component/layout/app-layout';
import { Alert, AlertDescription, AlertTitle } from '@/component/ui/alert';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { Label } from '@/component/ui/label';
import { PasswordInput } from '@/component/ui/password-input';
import { api } from '@/trpc/react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const changePassword = api.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success('パスワードを変更しました');
      router.push('/profile');
    },
    onError: (error) => {
      toast.error(error.message || 'パスワードの変更に失敗しました');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword.length < 8) {
      toast.error('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('パスワードが一致しません');
      return;
    }

    changePassword.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md mt-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>パスワード変更</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  現在のパスワード <span className="text-destructive">*</span>
                </Label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  disabled={changePassword.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  新しいパスワード <span className="text-destructive">*</span>
                </Label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  disabled={changePassword.isPending}
                />
                <p className="text-sm text-muted-foreground">8文字以上で入力してください</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  新しいパスワード（確認） <span className="text-destructive">*</span>
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={changePassword.isPending}
                />
                {formData.confirmPassword !== '' &&
                  formData.newPassword !== formData.confirmPassword && (
                    <p className="text-sm text-destructive">パスワードが一致しません</p>
                  )}
              </div>

              {changePassword.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>エラー</AlertTitle>
                  <AlertDescription>{changePassword.error.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                  {changePassword.isPending ? '変更中...' : '変更'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/profile')}
                  disabled={changePassword.isPending}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
