'use client';

import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '@/component/layout/app-layout';
import { Alert, AlertDescription, AlertTitle } from '@/component/ui/alert';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { api } from '@/trpc/react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
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

  const toggleShowPassword = (field: keyof typeof showPassword) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
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
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPassword.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    disabled={changePassword.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => toggleShowPassword('current')}
                  >
                    {showPassword.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  新しいパスワード <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    disabled={changePassword.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => toggleShowPassword('new')}
                  >
                    {showPassword.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">8文字以上で入力してください</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  新しいパスワード（確認） <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={changePassword.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => toggleShowPassword('confirm')}
                  >
                    {showPassword.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.confirmPassword !== '' &&
                  formData.newPassword !== formData.confirmPassword && (
                    <p className="text-sm text-destructive">パスワードが一致しません</p>
                  )}
              </div>

              {changePassword.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
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
