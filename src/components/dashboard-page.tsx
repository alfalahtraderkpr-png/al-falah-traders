'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, PieChart as PieChartIcon,
  CalendarIcon, RefreshCw, ArrowUpRight, ArrowDownRight, Activity, Wallet, CreditCard, Percent,
  Plus, X, Trophy, AlertCircle, ArrowRight, CheckCircle2, Clock, Table2,
  Zap, Eye, FileDown,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, formatDistanceToNow } from 'date-fns';
import { DateRange } from 'react-day-picker';
import EntryForm from '@/components/entry-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DashboardAPIResponse {
  summary: {
    totalSales: number;
    totalRecovery: number;
    totalCredit: number;
    totalStockReturn: number;
    totalOldRecovery: number;
    entryCount: number;
  };
  orderBookerBreakdown: {
    id: string;
    name: string;
    totalSales: number;
    totalRecovery: number;
    totalCredit: number;
    totalStockReturn: number;
    totalOldRecovery: number;
    entryCount: number;
  }[];
  companyBreakdown: {
    id: string;
    name: string;
    totalSales: number;
    totalRecovery: number;
    totalCredit: number;
    totalStockReturn: number;
    entryCount: number;
  }[];
  dailyTrend: {
    date: string;
    totalSales: number;
    totalRecovery: number;
    totalCredit: number;
    totalStockReturn: number;
    entryCount: number;
  }[];
}

const COLORS = ['#059669', '#d97706', '#0284c7', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#65a30d'];

function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

interface RecentEntry {
  id: string;
  date: string;
  orderBookerName: string;
  companyName: string;
  summaryAmount: number;
  cashReceived: number;
  creditPosted: number;
  closingBalance: number;
}

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps = {}) {
  const [data, setData] = useState<DashboardAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: now };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Quick Entry FAB
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  // Data refresh timestamp
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chart type toggle
  const [trendChartType, setTrendChartType] = useState<'line' | 'area'>('line');

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  // Daily Summary Banner
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [todaySummary, setTodaySummary] = useState<{ sales: number; recovery: number; credit: number; entries: number } | null>(null);

  // MoM comparison data
  const [lastMonthData, setLastMonthData] = useState<{ totalSales: number; totalRecovery: number; totalCredit: number } | null>(null);

  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [prevPeriodData, setPrevPeriodData] = useState<{ totalSales: number; totalRecovery: number; totalCredit: number; entryCount: number } | null>(null);

  // Fetch recent entries
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/entries');
        if (res.ok) {
          const json = await res.json();
          setRecentEntries((json.entries || []).slice(0, 10));
        }
      } catch { /* silent */ }
    };
    fetchRecent();
  }, []);

  // fetchData MUST be defined before the useEffect that references it (fixes TDZ violation)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set('dateFrom', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.set('dateTo', format(dateRange.to, 'yyyy-MM-dd'));
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Auto-refresh countdown (MUST come after fetchData definition)
  useEffect(() => {
    if (!autoRefresh) {
      setCountdown(60);
      return;
    }
    autoRefreshRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, fetchData]);

  // Fetch today's summary for banner
  useEffect(() => {
    const fetchTodaySummary = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const params = new URLSearchParams({ dateFrom: today, dateTo: today });
        const res = await fetch(`/api/dashboard?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const s = json.summary;
          if (s && s.entryCount > 0) {
            setTodaySummary({ sales: s.totalSales, recovery: s.totalRecovery, credit: s.totalCredit, entries: s.entryCount });
          }
        }
      } catch { /* silent */ }
    };
    fetchTodaySummary();
  }, []);

  // Fetch last month data for MoM comparison
  useEffect(() => {
    const fetchLastMonth = async () => {
      try {
        const lastMonth = subMonths(new Date(), 1);
        const params = new URLSearchParams({
          dateFrom: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          dateTo: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        });
        const res = await fetch(`/api/dashboard?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setLastMonthData({
            totalSales: json.summary?.totalSales || 0,
            totalRecovery: json.summary?.totalRecovery || 0,
            totalCredit: json.summary?.totalCredit || 0,
          });
        }
      } catch { /* silent */ }
    };
    fetchLastMonth();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch previous period data when compare mode is on
  useEffect(() => {
    if (!compareMode || !dateRange?.from || !dateRange?.to) {
      setPrevPeriodData(null);
      return;
    }
    const fetchPrevPeriod = async () => {
      try {
        const periodLength = dateRange.to!.getTime() - dateRange.from!.getTime();
        const prevTo = new Date(dateRange.from!.getTime() - 1);
        const prevFrom = new Date(prevTo.getTime() - periodLength);
        const params = new URLSearchParams({
          dateFrom: format(prevFrom, 'yyyy-MM-dd'),
          dateTo: format(prevTo, 'yyyy-MM-dd'),
        });
        const res = await fetch(`/api/dashboard?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setPrevPeriodData({
            totalSales: json.summary?.totalSales || 0,
            totalRecovery: json.summary?.totalRecovery || 0,
            totalCredit: json.summary?.totalCredit || 0,
            entryCount: json.summary?.entryCount || 0,
          });
        }
      } catch { /* silent */ }
    };
    fetchPrevPeriod();
  }, [compareMode, dateRange]);

  const totalSales = data?.summary?.totalSales || 0;
  const totalRecovery = data?.summary?.totalRecovery || 0;
  const totalCredit = data?.summary?.totalCredit || 0;
  const totalStockReturn = data?.summary?.totalStockReturn || 0;
  const totalOldRecovery = data?.summary?.totalOldRecovery || 0;
  const netRecoveryRate = totalSales > 0 ? (totalRecovery / totalSales) * 100 : 0;
  const creditToSalesRatio = totalSales > 0 ? (totalCredit / totalSales) * 100 : 0;

  // MoM calculations
  const momSalesChange = lastMonthData && lastMonthData.totalSales > 0
    ? ((totalSales - lastMonthData.totalSales) / lastMonthData.totalSales) * 100
    : null;
  const momRecoveryChange = lastMonthData && lastMonthData.totalRecovery > 0
    ? ((totalRecovery - lastMonthData.totalRecovery) / lastMonthData.totalRecovery) * 100
    : null;
  const momCreditChange = lastMonthData && lastMonthData.totalCredit > 0
    ? ((totalCredit - lastMonthData.totalCredit) / lastMonthData.totalCredit) * 100
    : null;

  // Top performers: OBs sorted by recovery rate
  const topPerformers = [...(data?.orderBookerBreakdown || [])]
    .map(ob => ({
      ...ob,
      recoveryRate: ob.totalSales > 0 ? (ob.totalRecovery / ob.totalSales) * 100 : 0,
    }))
    .sort((a, b) => b.recoveryRate - a.recoveryRate)
    .slice(0, 3);

  // Attention needed: OBs with high outstanding
  const attentionNeeded = [...(data?.orderBookerBreakdown || [])]
    .filter(ob => ob.totalCredit > 0)
    .sort((a, b) => b.totalCredit - a.totalCredit)
    .slice(0, 3);

  // Comparison period calculations
  const compSalesChange = prevPeriodData && prevPeriodData.totalSales > 0
    ? ((totalSales - prevPeriodData.totalSales) / prevPeriodData.totalSales) * 100
    : null;
  const compRecoveryChange = prevPeriodData && prevPeriodData.totalRecovery > 0
    ? ((totalRecovery - prevPeriodData.totalRecovery) / prevPeriodData.totalRecovery) * 100
    : null;
  const compCreditChange = prevPeriodData && prevPeriodData.totalCredit > 0
    ? ((totalCredit - prevPeriodData.totalCredit) / prevPeriodData.totalCredit) * 100
    : null;

  const kpiCards = [
    {
      title: 'Total Sales',
      subtitle: 'Posted Summary Total',
      value: formatPKR(totalSales),
      compact: formatCompact(totalSales),
      icon: DollarSign,
      trend: 'up' as const,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      kpiClass: 'kpi-sales',
      progressValue: 100,
      momChange: momSalesChange,
      prevValue: prevPeriodData?.totalSales,
      compChange: compSalesChange,
    },
    {
      title: 'Total Recovery',
      subtitle: 'Cash Received',
      value: formatPKR(totalRecovery),
      compact: formatCompact(totalRecovery),
      icon: Wallet,
      trend: 'up' as const,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/50',
      borderColor: 'border-sky-200 dark:border-sky-800',
      kpiClass: 'kpi-recovery',
      progressValue: netRecoveryRate,
      momChange: momRecoveryChange,
      prevValue: prevPeriodData?.totalRecovery,
      compChange: compRecoveryChange,
    },
    {
      title: 'Credit Outstanding',
      subtitle: 'Pending Amount',
      value: formatPKR(totalCredit),
      compact: formatCompact(totalCredit),
      icon: CreditCard,
      trend: 'down' as const,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/50',
      borderColor: 'border-red-200 dark:border-red-800',
      kpiClass: 'kpi-credit',
      progressValue: creditToSalesRatio,
      momChange: momCreditChange,
      prevValue: prevPeriodData?.totalCredit,
      compChange: compCreditChange,
    },
    {
      title: 'Recovery Rate',
      subtitle: 'Net Collection %',
      value: `${netRecoveryRate.toFixed(1)}%`,
      compact: `${netRecoveryRate.toFixed(0)}%`,
      icon: Percent,
      trend: netRecoveryRate >= 70 ? 'up' as const : 'down' as const,
      color: netRecoveryRate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
      bg: netRecoveryRate >= 70 ? 'bg-amber-50 dark:bg-amber-950/50' : 'bg-red-50 dark:bg-red-950/50',
      borderColor: netRecoveryRate >= 70 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800',
      kpiClass: 'kpi-rate',
      progressValue: netRecoveryRate,
      momChange: null,
      prevValue: undefined,
      compChange: null,
    },
  ];

  const trendChartConfig = {
    totalSales: { label: 'Sales', color: '#059669' },
    totalRecovery: { label: 'Recovery', color: '#0284c7' },
  };

  const obChartConfig = {
    totalSales: { label: 'Sales', color: '#059669' },
    totalRecovery: { label: 'Recovery', color: '#0284c7' },
  };

  const pieChartConfig = data?.companyBreakdown?.reduce((acc, item, i) => {
    acc[item.name] = { label: item.name, color: COLORS[i % COLORS.length] };
    return acc;
  }, {} as Record<string, { label: string; color: string }>) || {};

  // Build indicators from OB breakdown
  const indicators = (data?.orderBookerBreakdown || []).map((ob) => {
    const rate = ob.totalSales > 0 ? (ob.totalRecovery / ob.totalSales) * 100 : 0;
    if (rate >= 70) {
      return { obName: ob.name, type: 'growth' as const, detail: `${rate.toFixed(0)}% recovery rate`, rate, credit: ob.totalCredit, sales: ob.totalSales };
    }
    if (ob.totalCredit > 0) {
      return { obName: ob.name, type: 'risk' as const, detail: `PKR ${ob.totalCredit.toLocaleString()} outstanding`, rate, credit: ob.totalCredit, sales: ob.totalSales };
    }
    return null;
  }).filter(Boolean) as { obName: string; type: 'growth' | 'risk'; detail: string; rate: number; credit: number; sales: number }[];

  return (
    <div className="space-y-6 p-4 md:p-6 relative section-gradient-dashboard min-h-screen bg-grid-pattern">
      {/* Daily Summary Notification Banner */}
      {todaySummary && !bannerDismissed && (
        <div className="animate-fade-in-up bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl p-4 flex items-center justify-between shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Today&apos;s Summary</p>
              <p className="text-xs text-emerald-100">
                PKR {todaySummary.sales.toLocaleString()} sales, PKR {todaySummary.recovery.toLocaleString()} recovery, PKR {todaySummary.credit.toLocaleString()} credit across {todaySummary.entries} {todaySummary.entries === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20 shrink-0"
            onClick={() => setBannerDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Welcome Banner with Live Clock */}
      <div className="welcome-banner rounded-2xl p-5 animate-fade-in-up mesh-gradient">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              <h2 className="text-lg font-bold gradient-text-emerald">
                {currentTime.getHours() < 12 ? 'Good Morning' : currentTime.getHours() < 17 ? 'Good Afternoon' : 'Good Evening'} 👋
              </h2>
            </div>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-300/70">
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Health Score */}
            {!loading && data && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-black/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="health-score-ring health-score-ring-gradient">
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <defs>
                      <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <linearGradient id="healthGradientAmber" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                      <linearGradient id="healthGradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="100%" stopColor="#f87171" />
                      </linearGradient>
                    </defs>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-200 dark:text-emerald-800" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={`url(#${netRecoveryRate >= 70 ? 'healthGradient' : netRecoveryRate >= 40 ? 'healthGradientAmber' : 'healthGradientRed'})`} strokeWidth="3" strokeDasharray={`${(netRecoveryRate / 100) * 88} 88`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-[8px] font-bold text-emerald-800 dark:text-emerald-200">{netRecoveryRate.toFixed(0)}%</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">Health</p>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{netRecoveryRate >= 70 ? 'Excellent' : netRecoveryRate >= 40 ? 'Fair' : 'Needs Attention'}</p>
                </div>
              </div>
            )}
            {/* Live Clock */}
            <div className="text-right bg-white/60 dark:bg-black/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-emerald-200/50 dark:border-emerald-800/50">
              <p className="text-2xl font-mono font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
                {format(currentTime, 'hh:mm:ss')}
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase">
                {format(currentTime, 'a')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Date Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your distribution performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 text-xs h-9">
                <CalendarIcon className="w-3.5 h-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM dd, yyyy')
                  )
                ) : (
                  'Pick a date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                autoFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.to) setCalendarOpen(false);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            className={`h-9 gap-1.5 text-xs ${compareMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-200 dark:border-emerald-800'}`}
            onClick={() => setCompareMode(!compareMode)}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Compare
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { fetchData(); setCountdown(60); }} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {/* Auto-refresh toggle with countdown */}
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1 h-9 border border-emerald-200/50 dark:border-emerald-800/50">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${autoRefresh ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
              aria-label={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
            </button>
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums min-w-[18px]">
              {autoRefresh ? `${countdown}s` : 'Off'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-fade-in-up">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-36 mb-2" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi, i) => (
              <Card key={kpi.title} className={`kpi-card-v2 ${kpi.kpiClass} card-hover border ${kpi.borderColor} animate-fade-in-up stagger-${i + 1}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-muted-foreground">{kpi.title}</span>
                      <span className="text-[10px] text-muted-foreground/70 block">{kpi.subtitle}</span>
                    </div>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight mb-2 kpi-value-pulse animate-count-up">{kpi.value}</div>
                  {compareMode && kpi.prevValue !== undefined && kpi.compChange !== null && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground">Prev:</span>
                      <span className="text-xs font-mono font-medium text-muted-foreground">{formatPKR(kpi.prevValue)}</span>
                      <span className={`text-[11px] font-bold flex items-center gap-0.5 ${kpi.compChange >= 0 ? (kpi.title === 'Credit Outstanding' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400') : (kpi.title === 'Credit Outstanding' ? 'text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400')}`}>
                        {kpi.compChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.compChange >= 0 ? '+' : ''}{kpi.compChange.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <Progress
                    value={Math.min(kpi.progressValue, 100)}
                    className="h-1.5 mb-2"
                  />
                  <div className="flex items-center gap-1">
                    {kpi.momChange !== null ? (
                      <>
                        {kpi.momChange >= 0 ? (
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`text-[11px] font-medium ${kpi.momChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {kpi.momChange >= 0 ? '+' : ''}{kpi.momChange.toFixed(1)}% vs last month
                        </span>
                      </>
                    ) : (
                      <>
                        {kpi.trend === 'up' ? (
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`text-[11px] font-medium ${kpi.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {kpi.trend === 'up' ? 'Positive' : 'Attention needed'}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions Panel */}
      {!loading && (
        <Card className="glass-card-v2 card-hover border border-emerald-200/50 dark:border-emerald-800/50 animate-fade-in-up">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-2 h-9 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 btn-glow font-semibold"
                onClick={() => setQuickEntryOpen(true)}
              >
                <Plus className="w-4 h-4" /> Add Entry
              </Button>
              {onNavigate && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => onNavigate('balances')}
                  >
                    <Eye className="w-4 h-4" /> View Balances
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => onNavigate('reports')}
                  >
                    <FileDown className="w-4 h-4" /> Export Report
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => onNavigate('entries')}
                  >
                    <Table2 className="w-4 h-4" /> View Entries
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => onNavigate('daily-summary')}
                  >
                    <CalendarIcon className="w-4 h-4" /> Daily Summary
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Refresh Indicator */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'} ring-2 ${loading ? 'ring-amber-400/20' : 'ring-emerald-400/20'}`} />
          <span className="text-[11px] text-muted-foreground">
            Data as of <span className="font-mono font-semibold text-foreground/80">{format(lastRefreshed, 'hh:mm:ss a')}</span>
          </span>
          {autoRefresh && (
            <span className="text-[10px] text-muted-foreground/60 border-l border-border/50 pl-2 ml-1">
              Auto-refresh in <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{countdown}s</span>
            </span>
          )}
        </div>
        {!loading && data && (
          <span className="text-[10px] text-muted-foreground/50">
            {data.summary?.entryCount ?? 0} entries in range
          </span>
        )}
      </div>

      {/* Top Performers + Attention Needed */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up">
          {/* Top Performers */}
          <Card className="card-hover border border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {topPerformers.map((ob, i) => (
                    <div key={ob.id} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50/50 to-amber-100/30 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        i === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                        i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                        'bg-gradient-to-br from-orange-400 to-orange-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ob.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatPKR(ob.totalRecovery)} recovered of {formatPKR(ob.totalSales)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{ob.recoveryRate.toFixed(0)}%</p>
                        <Progress value={ob.recoveryRate} className="h-1 w-16 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attention Needed */}
          <Card className="card-hover border border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Attention Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attentionNeeded.length > 0 ? (
                <div className="space-y-3">
                  {attentionNeeded.map((ob) => {
                    const rate = ob.totalSales > 0 ? (ob.totalRecovery / ob.totalSales) * 100 : 0;
                    return (
                      <div key={ob.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50/50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ob.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Outstanding: <span className="text-red-600 dark:text-red-400 font-medium">{formatPKR(ob.totalCredit)}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400">{rate.toFixed(0)}%</p>
                          <p className="text-[10px] text-muted-foreground">recovery</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                  <p className="text-sm">All OBs are in good standing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Stats Bar */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entries</p>
              <p className="text-sm font-bold">{data.summary?.entryCount ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Old Recovery</p>
              <p className="text-sm font-bold">{formatCompact(totalOldRecovery)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stock Returns</p>
              <p className="text-sm font-bold">{formatCompact(totalStockReturn)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border hover-lift">
            <BarChart3 className="w-4 h-4 text-sky-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Recovery/OB</p>
              <p className="text-sm font-bold">{formatCompact(data.orderBookerBreakdown?.length ? totalRecovery / data.orderBookerBreakdown.length : 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* OB Performance Overview - New Feature */}
      {!loading && data && data.orderBookerBreakdown && data.orderBookerBreakdown.length > 0 && (
        <Card className="glass-card-v2 card-hover border border-emerald-200/50 dark:border-emerald-800/50 animate-fade-in-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 section-header-enhanced">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Order Booker Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.orderBookerBreakdown.map((ob) => {
                const rate = ob.totalSales > 0 ? (ob.totalRecovery / ob.totalSales) * 100 : 0;
                const avgPerEntry = ob.entryCount > 0 ? ob.totalSales / ob.entryCount : 0;
                const isHealthy = rate >= 70;
                return (
                  <div
                    key={ob.id}
                    className={`p-3 rounded-xl border transition-all duration-200 hover:shadow-md hover-lift ${
                      isHealthy
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50'
                        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 ${
                          isHealthy ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-amber-600'
                        }`}>
                          {ob.name.charAt(0)}
                        </div>
                        <p className="text-sm font-semibold truncate">{ob.name}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 font-mono shrink-0 ${
                        isHealthy ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300' : 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300'
                      }`}>
                        {rate.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Sales</span>
                        <span className="font-mono font-medium">{formatCompact(ob.totalSales)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Recovery</span>
                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatCompact(ob.totalRecovery)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Outstanding</span>
                        <span className={`font-mono font-medium ${ob.totalCredit > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCompact(ob.totalCredit)}</span>
                      </div>
                      <Progress value={Math.min(rate, 100)} className={`h-1.5 ${isHealthy ? '' : '[&>div]:bg-amber-500'}`} />
                      <div className="flex justify-between text-[9px] text-muted-foreground/60">
                        <span>{ob.entryCount} entries</span>
                        <span>Avg {formatCompact(avgPerEntry)}/entry</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Trend with Toggle */}
        <Card className="card-hover chart-hover-zoom">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Daily Sales vs Recovery
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
                <button
                  className={`chart-toggle-btn ${trendChartType === 'line' ? 'active' : ''}`}
                  onClick={() => setTrendChartType('line')}
                >
                  Line
                </button>
                <button
                  className={`chart-toggle-btn ${trendChartType === 'area' ? 'active' : ''}`}
                  onClick={() => setTrendChartType('area')}
                >
                  Area
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full shimmer" />
            ) : (
              <ChartContainer config={trendChartConfig} className="h-64 w-full">
                {trendChartType === 'line' ? (
                  <LineChart data={data?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="totalRecovery" stroke="#0284c7" strokeWidth={2.5} dot={false} />
                  </LineChart>
                ) : (
                  <AreaChart data={data?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2} fill="url(#salesGradient)" />
                    <Area type="monotone" dataKey="totalRecovery" stroke="#0284c7" strokeWidth={2} fill="url(#recoveryGradient)" />
                  </AreaChart>
                )}
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Company Comparison Stacked Bar Chart */}
        <Card className="card-hover chart-hover-zoom">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Company Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full shimmer" />
            ) : (data?.companyBreakdown || []).length > 0 ? (
              <ChartContainer config={obChartConfig} className="h-64 w-full">
                <BarChart data={data?.companyBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="totalSales" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} name="Sales" />
                  <Bar dataKey="totalRecovery" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} name="Recovery" />
                  <Bar dataKey="totalCredit" stackId="a" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Credit" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No company data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OB Performance Bar Chart */}
      {!loading && data && (data?.orderBookerBreakdown || []).length > 0 && (
        <Card className="card-hover chart-hover-zoom animate-fade-in-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Order Booker Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={obChartConfig} className="h-64 w-full">
              <BarChart data={data?.orderBookerBreakdown || []}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="totalSales" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalRecovery" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Company Distribution + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Company Pie Chart */}
        <Card className="card-hover chart-hover-zoom">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Company-wise Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full shimmer" />
            ) : (data?.companyBreakdown || []).length > 0 ? (
              <ChartContainer config={pieChartConfig} className="h-64 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={(data?.companyBreakdown || []).map((c) => ({ name: c.name, value: c.totalSales }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {(data?.companyBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No company data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Indicators */}
        <Card className="card-hover chart-hover-zoom">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full shimmer" />
                ))}
              </div>
            ) : indicators.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {indicators.map((ind, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      ind.type === 'growth'
                        ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                        : 'bg-red-50/50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      ind.type === 'growth' ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'
                    }`}>
                      {ind.type === 'growth' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{ind.obName}</span>
                        <Badge
                          variant={ind.type === 'growth' ? 'default' : 'destructive'}
                          className={`text-[10px] px-1.5 py-0 h-4 ${ind.type === 'growth' ? 'bg-emerald-600' : ''}`}
                        >
                          {ind.type === 'growth' ? 'Growth' : 'Risk'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ind.detail}</p>
                      {ind.type === 'risk' && (
                        <Progress value={ind.rate} className="h-1 mt-1.5" />
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold">{ind.rate.toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">recovery</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No performance indicators</p>
                <p className="text-xs mt-1">Available for this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Timeline */}
      {!loading && (
        <Card className="card-hover border border-emerald-200/50 dark:border-emerald-800/50 animate-fade-in-up">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Recent Activity
              </CardTitle>
              {onNavigate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  onClick={() => onNavigate('entries')}
                >
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                  <Table2 className="w-8 h-8 text-emerald-300 dark:text-emerald-700" />
                </div>
                <p className="text-sm font-medium">No entries yet</p>
                <p className="text-xs mt-1 text-muted-foreground">Start by adding your first daily entry</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  onClick={() => setQuickEntryOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Entry
                </Button>
              </div>
            ) : (
              <div className="relative max-h-96 overflow-y-auto custom-scrollbar">
                {/* Timeline connecting line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-200 to-emerald-100 dark:from-emerald-700 dark:via-emerald-800 dark:to-emerald-900" />
                <div className="space-y-0">
                  {recentEntries.slice(0, 5).map((entry, i) => (
                    <div key={entry.id} className="relative flex items-start gap-4 py-3 group">
                      {/* Timeline dot */}
                      <div className="relative z-10 shrink-0">
                        <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-900 ${
                          i === 0
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                            : 'bg-gradient-to-br from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-700'
                        }`}>
                          <span className={`text-[9px] font-bold ${i === 0 ? 'text-white' : 'text-emerald-700 dark:text-emerald-200'}`}>
                            {entry.orderBookerName?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      {/* Timeline content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{entry.orderBookerName}</span>
                            <span className="text-[10px] text-muted-foreground">→</span>
                            <span className="text-xs text-muted-foreground truncate">{entry.companyName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              PKR {entry.summaryAmount.toLocaleString()}
                            </span>
                            {entry.creditPosted > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 font-mono">
                                +{entry.creditPosted.toLocaleString()} cr
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {(() => { try { return format(new Date(entry.date), 'MMM dd, yyyy'); } catch { return String(entry.date); } })()}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                            {(() => { try { return formatDistanceToNow(new Date(entry.date), { addSuffix: true }); } catch { return ''; } })()}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                            Cash: PKR {entry.cashReceived.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dashboard Empty State - Enhanced with decorative illustration and getting started cards */}
      {!loading && !data?.summary?.entryCount && (
        <Card className="animate-fade-in-up border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden">
          <CardContent className="py-10 px-6">
            {/* Decorative SVG illustration */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Animated background circles */}
                <div className="absolute -inset-4 bg-gradient-to-br from-emerald-100/60 to-sky-100/40 dark:from-emerald-900/30 dark:to-sky-900/20 rounded-full animate-float-slow" />
                <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-50/40 to-emerald-100/20 dark:from-emerald-950/20 dark:to-emerald-900/10 rounded-full animate-float-delayed" />
                {/* Main illustration */}
                <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="relative z-10 animate-float">
                  {/* Dashboard screen */}
                  <rect x="20" y="15" width="120" height="80" rx="8" fill="currentColor" className="text-emerald-100 dark:text-emerald-900/60" />
                  <rect x="24" y="19" width="112" height="72" rx="6" fill="currentColor" className="text-white dark:text-emerald-950" />
                  {/* Top bar */}
                  <rect x="24" y="19" width="112" height="14" rx="6" fill="currentColor" className="text-emerald-200 dark:text-emerald-800/60" />
                  <circle cx="33" cy="26" r="2" fill="currentColor" className="text-red-400" />
                  <circle cx="40" cy="26" r="2" fill="currentColor" className="text-amber-400" />
                  <circle cx="47" cy="26" r="2" fill="currentColor" className="text-emerald-400" />
                  {/* KPI mini cards */}
                  <rect x="30" y="38" width="22" height="16" rx="2" fill="currentColor" className="text-emerald-50 dark:text-emerald-900/40" />
                  <rect x="55" y="38" width="22" height="16" rx="2" fill="currentColor" className="text-sky-50 dark:text-sky-900/40" />
                  <rect x="80" y="38" width="22" height="16" rx="2" fill="currentColor" className="text-red-50 dark:text-red-900/40" />
                  <rect x="105" y="38" width="22" height="16" rx="2" fill="currentColor" className="text-amber-50 dark:text-amber-900/40" />
                  {/* Mini bar lines inside KPI cards */}
                  <rect x="33" y="42" width="16" height="2" rx="1" fill="currentColor" className="text-emerald-300 dark:text-emerald-700" />
                  <rect x="33" y="48" width="10" height="2" rx="1" fill="currentColor" className="text-emerald-200 dark:text-emerald-800" />
                  <rect x="58" y="42" width="16" height="2" rx="1" fill="currentColor" className="text-sky-300 dark:text-sky-700" />
                  <rect x="58" y="48" width="10" height="2" rx="1" fill="currentColor" className="text-sky-200 dark:text-sky-800" />
                  {/* Mini chart area */}
                  <path d="M30 72 L40 66 L55 70 L70 62 L85 64 L100 58 L115 60 L125 55" stroke="currentColor" className="text-emerald-400 dark:text-emerald-600" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M30 72 L40 66 L55 70 L70 62 L85 64 L100 58 L115 60 L125 55 L125 75 L30 75 Z" fill="currentColor" className="text-emerald-100 dark:text-emerald-900/30" />
                  {/* Stand/base */}
                  <rect x="65" y="95" width="30" height="4" rx="2" fill="currentColor" className="text-emerald-200 dark:text-emerald-800" />
                  <rect x="75" y="91" width="10" height="6" rx="1" fill="currentColor" className="text-emerald-200 dark:text-emerald-800" />
                  {/* Sparkle dots */}
                  <circle cx="145" cy="20" r="1.5" fill="currentColor" className="text-amber-400 animate-gentle-pulse" />
                  <circle cx="15" cy="40" r="1" fill="currentColor" className="text-emerald-400 animate-gentle-pulse" />
                  <circle cx="150" cy="55" r="1.5" fill="currentColor" className="text-sky-400 animate-gentle-pulse" />
                </svg>
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-foreground mb-2 gradient-text-emerald">No data for this period</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Add entries to see your dashboard come alive with insights, charts, and performance metrics.</p>
            </div>

            {/* Getting Started Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="getting-started-card p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md animate-fade-in-up stagger-1">
                  <span className="text-sm font-bold">1</span>
                </div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Add Order Bookers</p>
                <p className="text-[10px] text-muted-foreground">Set up your sales team first</p>
                {onNavigate && (
                  <Button variant="link" size="sm" className="text-emerald-600 dark:text-emerald-400 text-[10px] h-6 mt-1" onClick={() => onNavigate('settings')}>
                    Go to Settings →
                  </Button>
                )}
              </div>
              <div className="getting-started-card p-4 rounded-xl bg-gradient-to-br from-sky-50/80 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20 border border-sky-200/50 dark:border-sky-800/50 text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md animate-fade-in-up stagger-2">
                  <span className="text-sm font-bold">2</span>
                </div>
                <p className="text-xs font-semibold text-sky-800 dark:text-sky-200 mb-1">Add Companies</p>
                <p className="text-[10px] text-muted-foreground">Register distribution companies</p>
                {onNavigate && (
                  <Button variant="link" size="sm" className="text-sky-600 dark:text-sky-400 text-[10px] h-6 mt-1" onClick={() => onNavigate('settings')}>
                    Go to Settings →
                  </Button>
                )}
              </div>
              <div className="getting-started-card p-4 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md animate-fade-in-up stagger-3">
                  <span className="text-sm font-bold">3</span>
                </div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">Record Entries</p>
                <p className="text-[10px] text-muted-foreground">Start tracking daily sales</p>
                <Button variant="link" size="sm" className="text-amber-600 dark:text-amber-400 text-[10px] h-6 mt-1" onClick={() => setQuickEntryOpen(true)}>
                  Add Entry →
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 btn-glow font-semibold"
                onClick={() => setQuickEntryOpen(true)}
              >
                <Plus className="w-4 h-4" /> Add Entry
              </Button>
              {onNavigate && (
                <Button
                  variant="outline"
                  className="gap-1.5 border-emerald-200 dark:border-emerald-800"
                  onClick={() => onNavigate('entries')}
                >
                  <Table2 className="w-4 h-4" /> View Entries
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Entry FAB */}
      <button
        onClick={() => setQuickEntryOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-xl shadow-emerald-300/50 dark:shadow-emerald-900/50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 no-print fab-pulse"
        aria-label="Quick Add Entry"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Entry Dialog */}
      <Dialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Quick Add Entry
            </DialogTitle>
            <DialogDescription>
              Add a new distribution entry without leaving the dashboard
            </DialogDescription>
          </DialogHeader>
          <EntryForm
            onSuccess={() => {
              setQuickEntryOpen(false);
              fetchData();
            }}
            onCancel={() => setQuickEntryOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
