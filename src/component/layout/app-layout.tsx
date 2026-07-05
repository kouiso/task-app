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
  const [hasMounted, setHasMounted] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
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

  // SSR時はqueryが無効(enabled:false)のため isLoading=false, session=undefined
  // ハイドレーション不一致を防ぐため、マウント後にのみ認証チェックを実行
  if (hasMounted && isLoading) {
    return <PageLoadingSpinner />;
  }

  if (hasMounted && !session?.user) {
    return null;
  }

  return (
    <>
      {/* 高さは h-screen(100vh) を土台にしつつ、モバイルのアドレスバー伸縮へ対応するため
          dvh対応ブラウザではインラインの 100dvh で上書きする。dvh非対応時は無効化され h-screen にフォールバック。
          (Tailwind の h-dvh / h-[100dvh] が当環境のビルドで生成されないためインラインで指定) */}
      <div
        className="grid h-screen w-full overflow-hidden md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]"
        style={{ height: '100dvh' }}
      >
        <div className="hidden border-r border-sidebar-border bg-sidebar md:block">
          <div className="flex h-full flex-col gap-2">
            <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <span className="text-sidebar-foreground font-bold text-lg">Task App</span>
              </Link>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.text}
                    href={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                      pathname === item.path
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                    )}
                  >
                    {item.icon}
                    {item.text}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="shrink-0 border-t border-sidebar-border p-4">
              <Link
                href="/profile"
                aria-label="プロフィールを表示"
                className="flex items-center gap-3 mb-3 -mx-2 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-9 w-9">
                  {session?.user?.avatar && (
                    <AvatarImage src={session.user.avatar} alt={session.user.name || ''} />
                  )}
                  <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate text-sidebar-foreground">
                    {session?.user?.name}
                  </span>
                  {session?.user?.role && <UserRoleBadge role={session.user.role} />}
                </div>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => setLogoutDialogOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">ナビゲーションメニューを切り替え</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col bg-sidebar border-sidebar-border">
                <nav className="grid gap-2 text-lg font-medium">
                  <Link
                    href="#"
                    className="flex items-center gap-2 text-lg font-semibold mb-4 text-sidebar-foreground"
                  >
                    Task App
                  </Link>
                  {menuItems.map((item) => (
                    <Link
                      key={item.text}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2',
                        pathname === item.path
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
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
                    {session?.user?.avatar && (
                      <AvatarImage src={session.user.avatar} alt={session.user.name || ''} />
                    )}
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
                <DropdownMenuItem onSelect={() => setLogoutDialogOpen(true)}>
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex flex-1 flex-col overflow-y-auto p-4 lg:p-6">
            {/* 広いモニターでコンテンツが間延びしないよう最大幅を設けて中央寄せする */}
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 lg:gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
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
    </>
  );
}
