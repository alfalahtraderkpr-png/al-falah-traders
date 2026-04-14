'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, TrendingDown, Clock, AlertCircle, Info, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Notification {
  id: string;
  type: 'overdue' | 'high-outstanding' | 'low-recovery' | 'no-entries' | 'monthly-warning';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  relatedOB?: string;
  amount?: number;
  timestamp: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  return time.toLocaleDateString();
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'overdue':
      return AlertCircle;
    case 'high-outstanding':
      return AlertTriangle;
    case 'low-recovery':
      return TrendingDown;
    case 'no-entries':
      return Clock;
    case 'monthly-warning':
      return AlertTriangle;
    default:
      return Info;
  }
}

function getSeverityColors(severity: Notification['severity']) {
  switch (severity) {
    case 'critical':
      return {
        icon: 'text-red-500 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800/50',
        dot: 'bg-red-500',
      };
    case 'warning':
      return {
        icon: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800/50',
        dot: 'bg-amber-500',
      };
    case 'info':
      return {
        icon: 'text-blue-500 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800/50',
        dot: 'bg-blue-500',
      };
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data: NotificationsResponse = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = () => {
    const newReadIds = new Set(readIds);
    for (const n of notifications) {
      newReadIds.add(n.id);
    }
    setReadIds(newReadIds);
    setUnreadCount(0);
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setReadIds(new Set());
  };

  const effectiveUnread = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {effectiveUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-sm shadow-red-200/50 dark:shadow-red-900/30 animate-in zoom-in-50 fade-in-0 duration-200">
              {effectiveUnread > 9 ? '9+' : effectiveUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-xl border-emerald-200/50 dark:border-emerald-800/50 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Bell className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Notifications</h3>
            {effectiveUnread > 0 && (
              <Badge className="h-5 px-1.5 text-[9px] font-bold bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700">
                {effectiveUnread}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 gap-1"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                  onClick={handleClearAll}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </Button>
              </>
            )}
          </div>
        </div>

        <Separator className="bg-emerald-100 dark:bg-emerald-800/50" />

        {/* Notification List */}
        <ScrollArea className="max-h-96">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">All caught up!</p>
                <p className="text-[10px] text-muted-foreground/70">No notifications right now</p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colors = getSeverityColors(notification.severity);
                const isRead = readIds.has(notification.id);

                return (
                  <div
                    key={notification.id}
                    className={`group relative p-2.5 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                      isRead
                        ? 'bg-muted/20 border-transparent opacity-60'
                        : `${colors.bg} ${colors.border}`
                    }`}
                    onClick={() => {
                      setReadIds((prev) => new Set(prev).add(notification.id));
                    }}
                  >
                    <div className="flex gap-2.5">
                      {/* Icon */}
                      <div className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {notification.title}
                          </p>
                          {!isRead && (
                            <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed mt-0.5 ${isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-muted-foreground/60">
                            {getRelativeTime(notification.timestamp)}
                          </span>
                          {notification.relatedOB && (
                            <Badge
                              variant="outline"
                              className="h-3.5 px-1 text-[8px] border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                            >
                              {notification.relatedOB}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator className="bg-emerald-100 dark:bg-emerald-800/50" />
            <div className="p-2">
              <p className="text-[9px] text-center text-muted-foreground/50">
                Auto-refreshes every 60 seconds
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
