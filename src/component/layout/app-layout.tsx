'use client';

import {
  BarChart,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/component/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Button } from '@/component/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/component/ui/dropdown-menu';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import { Sheet, SheetContent, SheetTrigger } from '@/component/ui/sheet';
import { UserRoleBadge } from '@/component/ui/user-badges';
import { USER_ROLE } from '@/lib/constant/roles';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { QuickSearch } from './quick-search';

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const baseMenuItems: MenuItem[] = [
  { text: 'ダッシュボード', icon: <LayoutDashboard className="h-5 w-5" />, path: '/dashboard' },
  { text: 'タスク', icon: <ClipboardList className="h-5 w-5" />, path: '/task' },
  { text: 'マイタスク', icon: <ListTodo className="h-5 w-5" />, path: '/my-task' },
  { text: 'プロジェクト', icon: <FolderOpen className="h-5 w-5" />, path: '/project' },
  { text: 'レポート', icon: <BarChart className="h-5 w-5" />, path: '/report' },
  { text: '検索', icon: <Search className="h-5 w-5" />, path: '/search' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // ハイドレーションミスマッチを防止するため、useState+useEffectで
  // 初回レンダリングはSSRと一致させ、マウント後にクライアントモードに切り替える
  const [hasMounted, setHasMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !isLoading && !session) {
      router.push('/login');
    }
  }, [hasMounted, isLoading, session, router]);

  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => {
      router.push('/login');
      router.refresh();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const menuItems: MenuItem[] = [
    ...baseMenuItems,
    ...(session?.user?.role === USER_ROLE.ADMIN
      ? [{ text: 'ユーザー管理', icon: <Users className="h-5 w-5" />, path: '/user' }]
      : []),
  ];

  // マウント後（クライアント）のみローディング・未認証チェックを実行
  // SSR時・初回ハイドレーション時はmiddleware.tsが認証チェック済みのため、レイアウトを描画する
  if (hasMounted && isLoading) {
    return <PageLoadingSpinner />;
  }

  if (hasMounted && !session?.user) {
    return null;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="">Task App</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {menuItems.map((item) => (
                <Link
                  key={item.text}
                  href={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                    pathname === item.path ? 'bg-muted text-primary' : 'text-muted-foreground',
                  )}
                >
                  {item.icon}
                  {item.text}
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.avatar || ''} alt={session?.user?.name || ''} />
                <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{session?.user?.name}</span>
                {session?.user?.role && <UserRoleBadge role={session.user.role} />}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    ログアウトすると、再度ログインが必要になります。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>ログアウト</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">ナビゲーションメニューを切り替え</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  Task App
                </Link>
                {menuItems.map((item) => (
                  <Link
                    key={item.text}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground',
                      pathname === item.path ? 'bg-muted text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.icon}
                    {item.text}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <QuickSearch />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.avatar || ''} alt={session?.user?.name || ''} />
                  <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">ユーザーメニューを切り替え</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                プロフィール
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>ログアウト</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
