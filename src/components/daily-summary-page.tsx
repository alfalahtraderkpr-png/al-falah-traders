'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CalendarDays, ChevronLeft, ChevronRight, TrendingUp, Wallet,
  CreditCard, AlertTriangle, Activity, RefreshCw, ArrowUpRight, ArrowDownRight,
  DollarSign, BarChart3, Package,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

interface DailySummaryItem {
  date: string;
  totalSales: number;
  totalRecovery: number;
  totalCredit: number;
  totalStockReturn: number;
  entryCount: number;
  recoveryRate: number;
}

interface MonthlySummary {
  totalSales: number;
  totalRecovery: number;
  totalCredit: number;
  totalStockReturn: number;
  totalEntries: number;
  activeDays: number;
  avgDailySales: number;
  avgDailyRecovery: number;
  recoveryRate: number;
}

function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function getRecoveryColor(rate: number): { bg: string; border: string; text: string; dot: string } {
  if (rate >= 70) return {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  };
  if (rate >= 40) return {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  };
  return {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  };
}

export default function DailySummaryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dailySummary, setDailySummary] = useState<DailySummaryItem[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const res = await fetch(`/api/daily-summary?dateFrom=${from}&dateTo=${to}`);
      if (res.ok) {
        const json = await res.json();
        setDailySummary(json.dailySummary || []);
        setMonthlySummary(json.monthlySummary || null);
      }
    } catch (err) {
      console.error('Daily summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToCurrentMonth = () => setCurrentMonth(new Date());

  const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  // Build a map of dates for quick lookup
  const summaryMap = new Map(dailySummary.map(d => [d.date, d]));

  // Get all days in the month for the calendar view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth: { date: Date; dateStr: string; dayOfWeek: number; isCurrentMonth: boolean }[] = [];

  // Add padding days from previous month
  const firstDayOfWeek = monthStart.getDay(); // 0=Sun
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - i - 1);
    daysInMonth.push({
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      dayOfWeek: d.getDay(),
      isCurrentMonth: false,
    });
  }

  // Add current month days
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    daysInMonth.push({
      date: new Date(d),
      dateStr: format(d, 'yyyy-MM-dd'),
      dayOfWeek: d.getDay(),
      isCurrentMonth: true,
    });
  }

  // Add padding days for next month
  const remaining = 42 - daysInMonth.length; // 6 rows * 7 = 42
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(monthEnd);
    d.setDate(d.getDate() + i);
    daysInMonth.push({
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      dayOfWeek: d.getDay(),
      isCurrentMonth: false,
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Daily Summary</h1>
          <p className="text-muted-foreground text-sm">Day-wise performance overview with recovery tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-2 font-semibold min-w-[180px]"
            onClick={goToCurrentMonth}
            disabled={isCurrentMonth}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {format(currentMonth, 'MMMM yyyy')}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToNextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      {!loading && monthlySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in-up stagger-1">
          <Card className="border-emerald-200 dark:border-emerald-800 card-hover">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/50">
                  <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sales</span>
              </div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCompact(monthlySummary.totalSales)}</p>
              <p className="text-[9px] text-muted-foreground">Avg {formatCompact(monthlySummary.avgDailySales)}/day</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200 dark:border-sky-800 card-hover">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-sky-100 dark:bg-sky-900/50">
                  <Wallet className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Recovery</span>
              </div>
              <p className="text-sm font-bold text-sky-700 dark:text-sky-300">{formatCompact(monthlySummary.totalRecovery)}</p>
              <p className="text-[9px] text-muted-foreground">Avg {formatCompact(monthlySummary.avgDailyRecovery)}/day</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800 card-hover">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-red-100 dark:bg-red-900/50">
                  <CreditCard className="w-3 h-3 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Credit</span>
              </div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">{formatCompact(monthlySummary.totalCredit)}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800 card-hover">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/50">
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Stock Return</span>
              </div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatCompact(monthlySummary.totalStockReturn)}</p>
            </CardContent>
          </Card>
          <Card className="border-teal-200 dark:border-teal-800 card-hover">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-teal-100 dark:bg-teal-900/50">
                  <Activity className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Days</span>
              </div>
              <p className="text-sm font-bold text-teal-700 dark:text-teal-300">{monthlySummary.activeDays}</p>
              <p className="text-[9px] text-muted-foreground">{monthlySummary.totalEntries} entries</p>
            </CardContent>
          </Card>
          <Card className={`card-hover ${monthlySummary.recoveryRate >= 70 ? 'border-emerald-200 dark:border-emerald-800' : monthlySummary.recoveryRate >= 40 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1 rounded ${monthlySummary.recoveryRate >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/50' : monthlySummary.recoveryRate >= 40 ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                  <TrendingUp className={`w-3 h-3 ${monthlySummary.recoveryRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : monthlySummary.recoveryRate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Recovery Rate</span>
              </div>
              <p className={`text-sm font-bold ${monthlySummary.recoveryRate >= 70 ? 'text-emerald-700 dark:text-emerald-300' : monthlySummary.recoveryRate >= 40 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>
                {monthlySummary.recoveryRate.toFixed(1)}%
              </p>
              <Progress value={monthlySummary.recoveryRate} className="h-1 mt-1" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State for Summary */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar View */}
      <Card className="animate-fade-in-up stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Calendar View — {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <CardDescription className="text-xs">
            Color-coded by recovery rate: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Green (≥70%)</span>,{' '}
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Amber (40-69%)</span>,{' '}
            <span className="text-red-600 dark:text-red-400 font-semibold">Red (&lt;40%)</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, idx) => {
              const data = summaryMap.get(day.dateStr);
              const colors = data ? getRecoveryColor(data.recoveryRate) : null;

              return (
                <div
                  key={idx}
                  className={`relative rounded-lg border p-1.5 min-h-[70px] sm:min-h-[85px] transition-all ${
                    !day.isCurrentMonth
                      ? 'opacity-30 border-transparent'
                      : colors
                        ? `${colors.bg} ${colors.border}`
                        : 'border-dashed border-muted-foreground/20 bg-muted/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[10px] font-semibold ${
                      day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {format(day.date, 'd')}
                    </span>
                    {data && colors && (
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    )}
                  </div>
                  {data && day.isCurrentMonth ? (
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        Sales: <span className="font-semibold text-foreground">{formatCompact(data.totalSales)}</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        Rec: <span className={`font-semibold ${colors?.text}`}>{formatCompact(data.totalRecovery)}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <Progress value={data.recoveryRate} className="h-0.5 flex-1" />
                        <span className={`text-[8px] font-bold ${colors?.text}`}>{data.recoveryRate.toFixed(0)}%</span>
                      </div>
                      <p className="text-[8px] text-muted-foreground">{data.entryCount} {data.entryCount === 1 ? 'entry' : 'entries'}</p>
                    </div>
                  ) : day.isCurrentMonth ? (
                    <p className="text-[9px] text-muted-foreground/50 mt-1">No data</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Daily Breakdown
          </CardTitle>
          <CardDescription className="text-xs">Detailed day-by-day totals for {format(currentMonth, 'MMMM yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full shimmer" />
              ))}
            </div>
          ) : dailySummary.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">No entries this month</p>
              <p className="text-sm mt-1">Start adding entries to see daily summaries</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sales</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recovery</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Credit</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stock Return</th>
                    <th className="text-center py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Entries</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummary.map((day) => {
                    const colors = getRecoveryColor(day.recoveryRate);
                    return (
                      <tr key={day.date} className={`border-b transition-colors hover:bg-muted/30 ${colors.bg}/50`}>
                        <td className="py-2.5 px-3 font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
                            {format(new Date(day.date + 'T00:00:00'), 'EEE, MMM dd')}
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-3 font-mono text-xs">{day.totalSales.toLocaleString()}</td>
                        <td className="text-right py-2.5 px-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">{day.totalRecovery.toLocaleString()}</td>
                        <td className="text-right py-2.5 px-3 font-mono text-xs text-red-600 dark:text-red-400">{day.totalCredit.toLocaleString()}</td>
                        <td className="text-right py-2.5 px-3 font-mono text-xs text-amber-600 dark:text-amber-400">({day.totalStockReturn.toLocaleString()})</td>
                        <td className="text-center py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {day.entryCount}
                          </Badge>
                        </td>
                        <td className="text-right py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Progress value={day.recoveryRate} className="h-1 w-12" />
                            <span className={`text-xs font-bold ${colors.text}`}>{day.recoveryRate.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
