'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-context';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
import {
  LayoutDashboard, FilePlus, Table2, BarChart3, Settings, LogOut, Building2,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardPage from '@/components/dashboard-page';
import EntryForm from '@/components/entry-form';
import EntriesTable from '@/components/entries-table';
import ReportsPage from '@/components/reports-page';
import SettingsPage from '@/components/settings-page';

type Page = 'dashboard' | 'new-entry' | 'entries' | 'reports' | 'settings';

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new-entry', label: 'New Entry', icon: FilePlus },
  { id: 'entries', label: 'Entries', icon: Table2 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'new-entry': return <EntryForm />;
      case 'entries': return <EntriesTable />;
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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-emerald-900 truncate">Al-Falah Traders</h2>
              <p className="text-xs text-muted-foreground truncate">Distribution Management</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        {/* Sidebar Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activePage === item.id}
                      onClick={() => setActivePage(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter className="p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate text-sm">{user?.name || 'User'}</p>
              <p className="text-muted-foreground truncate">{user?.username || ''}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-900">
              {navItems.find((n) => n.id === activePage)?.label || 'Dashboard'}
            </h2>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="flex-1">
          {renderPage()}
        </div>

        {/* Sticky Footer */}
        <footer className="border-t bg-card py-3 px-4 text-center text-xs text-muted-foreground">
          Al-Falah Traders &copy; 2025 — Field Force Automation
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
