'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-context';
import { useTheme } from 'next-themes';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, FilePlus, Table2, BarChart3, Settings, LogOut, Building2,
  Sun, Moon, Clock, ChevronRight, Users, Database, Activity, Wallet, CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardPage from '@/components/dashboard-page';
import EntryForm from '@/components/entry-form';
import EntriesTable from '@/components/entries-table';
import ReportsPage from '@/components/reports-page';
import SettingsPage from '@/components/settings-page';
import BalancesPage from '@/components/balances-page';
import DailySummaryPage from '@/components/daily-summary-page';
import NotificationBell from '@/components/notification-bell';

type Page = 'dashboard' | 'new-entry' | 'entries' | 'balances' | 'daily-summary' | 'reports' | 'settings';

const navItems: { id: Page; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & KPIs' },
  { id: 'new-entry', label: 'New Entry', icon: FilePlus, description: 'Add daily data' },
  { id: 'entries', label: 'Entries', icon: Table2, description: 'View & manage' },
  { id: 'balances', label: 'Balances', icon: Wallet, description: 'Outstanding dues' },
  { id: 'daily-summary', label: 'Daily Summary', icon: CalendarDays, description: 'Day-wise totals' },
  { id: 'reports', label: 'Reports', icon: BarChart3, description: 'Analysis & trends' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Manage OBs & Cos' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [miniStats, setMiniStats] = useState({ obCount: 0, coCount: 0, entryCount: 0 });

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const now = new Date();
  const timeGreeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  // Fetch mini stats for sidebar footer
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [obRes, coRes, dashRes] = await Promise.all([
          fetch('/api/order-bookers'),
          fetch('/api/companies'),
          fetch('/api/dashboard'),
        ]);
        if (obRes.ok) {
          const obData = await obRes.json();
          setMiniStats(prev => ({ ...prev, obCount: obData.orderBookers?.length || 0 }));
        }
        if (coRes.ok) {
          const coData = await coRes.json();
          setMiniStats(prev => ({ ...prev, coCount: coData.companies?.length || 0 }));
        }
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setMiniStats(prev => ({ ...prev, entryCount: dashData.summary?.entryCount || 0 }));
        }
      } catch {
        // silent
      }
    };
    fetchStats();
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage onNavigate={(page) => setActivePage(page as Page)} />;
      case 'new-entry': return <EntryForm />;
      case 'entries': return <EntriesTable />;
      case 'balances': return <BalancesPage />;
      case 'daily-summary': return <DailySummaryPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="offcanvas" side="left">
        {/* Sidebar Header */}
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate">Al-Falah Traders</h2>
              <p className="text-[11px] text-muted-foreground truncate">Distribution Management</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        {/* Quick Greeting */}
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              {timeGreeting}, <span className="font-semibold">{user?.name || 'Admin'}</span>
            </p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setActivePage(item.id)}
                        tooltip={item.label}
                        className="group relative"
                      >
                        {isActive && <div className="sidebar-active-indicator" />}
                        <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-emerald-500" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter className="p-3 space-y-3">
          {/* Mini Stats */}
          <div className="grid grid-cols-3 gap-1.5 px-1">
            <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
              <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mb-0.5" />
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200">{miniStats.obCount}</span>
              <span className="text-[8px] text-muted-foreground uppercase">OBs</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100/50 dark:border-sky-800/30">
              <Database className="w-3 h-3 text-sky-600 dark:text-sky-400 mb-0.5" />
              <span className="text-[10px] font-bold text-sky-800 dark:text-sky-200">{miniStats.coCount}</span>
              <span className="text-[8px] text-muted-foreground uppercase">Cos</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-800/30">
              <Activity className="w-3 h-3 text-amber-600 dark:text-amber-400 mb-0.5" />
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200">{miniStats.entryCount}</span>
              <span className="text-[8px] text-muted-foreground uppercase">Entries</span>
            </div>
          </div>

          <Separator />

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Appearance</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-100 dark:hover:bg-emerald-900/50" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </Button>
          </div>

          <Separator />

          {/* User Profile Section */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/30 ring-2 ring-white/50 dark:ring-emerald-800/30">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate text-sm">{user?.name || 'Admin'}</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">
                Administrator
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-card/80 backdrop-blur-md px-4 sticky top-0 z-30 no-print">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/50 dark:to-emerald-800/30 border border-emerald-200/50 dark:border-emerald-700/50">
                {(() => {
                  const activeItem = navItems.find((n) => n.id === activePage);
                  if (!activeItem) return null;
                  const Icon = activeItem.icon;
                  return <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
                })()}
              </div>
              <div>
                <div className="breadcrumb-nav" key={activePage}>
                  <span className="text-muted-foreground/60">Al-Falah</span>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-current">
                    {navItems.find((n) => n.id === activePage)?.label || 'Dashboard'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
                  {navItems.find((n) => n.id === activePage)?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </Button>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 animate-page-slide-in pb-16 md:pb-0" key={activePage}>
          {renderPage()}
        </div>

        {/* Enhanced Footer */}
        <footer className="border-t bg-gradient-to-r from-emerald-50/80 via-card to-emerald-50/80 dark:from-emerald-950/20 dark:via-card dark:to-emerald-950/20 py-3 px-4 no-print hidden md:block">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center text-white shrink-0">
                <Building2 className="w-3 h-3" />
              </div>
              <span className="font-medium text-emerald-800 dark:text-emerald-200">Al-Falah Traders</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {miniStats.obCount} Order Bookers
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" /> {miniStats.coCount} Companies
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" /> {miniStats.entryCount} Entries
              </span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="hidden sm:inline">Field Force Automation v1.0</span>
            </div>
          </div>
        </footer>
      </SidebarInset>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-emerald-200/50 dark:border-emerald-800/50 safe-area-bottom no-print mobile-nav-slide">
        <div className="grid grid-cols-5 gap-0.5 px-1 py-1">
          {[
            { id: 'dashboard' as Page, label: 'Home', icon: LayoutDashboard },
            { id: 'new-entry' as Page, label: 'Add', icon: FilePlus },
            { id: 'entries' as Page, label: 'Entries', icon: Table2 },
            { id: 'balances' as Page, label: 'Dues', icon: Wallet },
            { id: 'reports' as Page, label: 'Reports', icon: BarChart3 },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`mobile-nav-item flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'active text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <item.icon className="w-4.5 h-4.5" />
                <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </SidebarProvider>
  );
}
