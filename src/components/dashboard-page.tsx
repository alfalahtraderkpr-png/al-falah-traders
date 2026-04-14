'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, PieChart as PieChartIcon,
  CalendarIcon, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';

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

const COLORS = ['#059669', '#d97706', '#0284c7', '#dc2626', '#7c3aed', '#db2777'];

function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: now };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

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
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSales = data?.summary?.totalSales || 0;
  const totalRecovery = data?.summary?.totalRecovery || 0;
  const totalCredit = data?.summary?.totalCredit || 0;
  const netRecoveryRate = totalSales > 0 ? (totalRecovery / totalSales) * 100 : 0;

  const kpiCards = [
    {
      title: 'Total Sales',
      value: formatPKR(totalSales),
      icon: DollarSign,
      trend: 'up' as const,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Total Recovery',
      value: formatPKR(totalRecovery),
      icon: TrendingUp,
      trend: 'up' as const,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Credit Outstanding',
      value: formatPKR(totalCredit),
      icon: AlertTriangle,
      trend: 'down' as const,
      color: 'text-red-600',
      bg: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      title: 'Net Recovery Rate',
      value: `${netRecoveryRate.toFixed(1)}%`,
      icon: BarChart3,
      trend: netRecoveryRate >= 70 ? 'up' as const : 'down' as const,
      color: netRecoveryRate >= 70 ? 'text-emerald-600' : 'text-red-600',
      bg: netRecoveryRate >= 70 ? 'bg-emerald-50' : 'bg-red-50',
      borderColor: netRecoveryRate >= 70 ? 'border-emerald-200' : 'border-red-200',
    },
  ];

  const trendChartConfig = {
    totalSales: { label: 'Sales', color: '#059669' },
    totalRecovery: { label: 'Recovery', color: '#d97706' },
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
      return { obName: ob.name, type: 'growth' as const, detail: `${rate.toFixed(0)}% recovery rate` };
    }
    if (ob.totalCredit > 0) {
      return { obName: ob.name, type: 'risk' as const, detail: `PKR ${ob.totalCredit.toLocaleString()} credit outstanding` };
    }
    return null;
  }).filter(Boolean) as { obName: string; type: 'growth' | 'risk'; detail: string }[];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with Date Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your distribution performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
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
                initialFocus
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
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-36 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Card key={kpi.title} className={`border ${kpi.borderColor}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`text-xs ${kpi.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {kpi.trend === 'up' ? 'Positive' : 'Attention needed'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Daily Sales vs Recovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer config={trendChartConfig} className="h-64 w-full">
                <LineChart data={data?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="totalRecovery" stroke="#d97706" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* OB Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Order Booker Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer config={obChartConfig} className="h-64 w-full">
                <BarChart data={data?.orderBookerBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="totalSales" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalRecovery" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Distribution + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Company Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-emerald-600" />
              Company-wise Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer config={pieChartConfig} className="h-64 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={(data?.companyBreakdown || []).map((c) => ({ name: c.name, value: c.totalSales }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(data?.companyBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emerald-600" />
              Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : indicators.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {indicators.map((ind, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      ind.type === 'growth'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ind.type === 'growth' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{ind.obName}</span>
                    </div>
                    <Badge
                      variant={ind.type === 'growth' ? 'default' : 'destructive'}
                      className={ind.type === 'growth' ? 'bg-emerald-600' : ''}
                    >
                      {ind.type === 'growth' ? 'Growth' : 'Risk'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No performance indicators available for this period
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
