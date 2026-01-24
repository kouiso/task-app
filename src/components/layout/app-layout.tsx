'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { BarChart, ClipboardList, FolderOpen, LayoutDashboard, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QuickSearch } from './quick-search';

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/dashboard' },
  { text: 'Tasks', icon: <ClipboardList className="h-5 w-5" />, path: '/task' },
  { text: 'Projects', icon: <FolderOpen className="h-5 w-5" />, path: '/project' },
  { text: 'Reports', icon: <BarChart className="h-5 w-5" />, path: '/report' },
  { text: 'Search', icon: <Search className="h-5 w-5" />, path: '/search' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => {
      router.push('/login');
      router.refresh();
    },
  });

  const handleLogout = async () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar for Desktop */}
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
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
                  <AvatarImage src={session.user.avatar || ''} alt={session.user.name || ''} />
                  <AvatarFallback>{session.user.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
