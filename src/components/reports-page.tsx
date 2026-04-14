'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, Building2, BarChart3, AlertTriangle, Printer, Download, DollarSign, Wallet, CreditCard, Target, Sparkles, CalendarIcon, RotateCcw, FileText, AreaChart as AreaChartIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface OrderBooker { id: string; name: string; }
interface Company { id: string; name: string; category?: string; }

function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

export default function ReportsPage() {
  const [orderBookers, setOrderBookers] = useState<OrderBooker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [selectedOB, setSelectedOB] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ob');

  const [obData, setOBData] = useState<Record<string, unknown> | null>(null);
  const [companyData, setCompanyData] = useState<Record<string, unknown> | null>(null);
  const [trendData, setTrendData] = useState<Record<string, unknown> | null>(null);

  const [obLoading, setOBLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  // Chart type toggle for trend analysis
  const [trendChartType, setTrendChartType] = useState<'line' | 'area'>('line');

  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: now };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getDateParams = () => {
    const params: string[] = [];
    if (dateRange?.from) params.push(`dateFrom=${format(dateRange.from, 'yyyy-MM-dd')}`);
    if (dateRange?.to) params.push(`dateTo=${format(dateRange.to, 'yyyy-MM-dd')}`);
    return params.length > 0 ? `&${params.join('&')}` : '';
  };

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [obRes, coRes] = await Promise.all([
          fetch('/api/order-bookers'),
          fetch('/api/companies'),
        ]);
        if (obRes.ok) {
          const obJson = await obRes.json();
          setOrderBookers(obJson.orderBookers || []);
        }
        if (coRes.ok) {
          const coJson = await coRes.json();
          setCompanies(coJson.companies || []);
        }
      } catch {
        // silent - will show empty dropdowns
      }
    };
    fetchRefs();
  }, []);

  const fetchOBAnalysis = useCallback(async () => {
    if (!selectedOB) return;
    setOBLoading(true);
    try {
      const res = await fetch(`/api/reports?type=ob-analysis&orderBookerId=${selectedOB}${getDateParams()}`);
      if (res.ok) {
        setOBData(await res.json());
      } else {
        setOBData(null);
      }
    } catch {
      setOBData(null);
    } finally { setOBLoading(false); }
  }, [selectedOB, dateRange]);

  const fetchCompanyAnalysis = useCallback(async () => {
    if (!selectedCompany) return;
    setCompanyLoading(true);
    try {
      const res = await fetch(`/api/reports?type=company-analysis&companyId=${selectedCompany}${getDateParams()}`);
      if (res.ok) {
        setCompanyData(await res.json());
      } else {
        setCompanyData(null);
      }
    } catch {
      setCompanyData(null);
    } finally { setCompanyLoading(false); }
  }, [selectedCompany, dateRange]);

  const fetchTrendAnalysis = useCallback(async () => {
    setTrendLoading(true);
    try {
      const res = await fetch(`/api/reports?type=trend${getDateParams()}`);
      if (res.ok) {
        setTrendData(await res.json());
      } else {
        setTrendData(null);
      }
    } catch {
      setTrendData(null);
    } finally { setTrendLoading(false); }
  }, [dateRange]);

  useEffect(() => { fetchOBAnalysis(); }, [fetchOBAnalysis]);
  useEffect(() => { fetchCompanyAnalysis(); }, [fetchCompanyAnalysis]);

  useEffect(() => {
    if (activeTab === 'trend') {
      setTrendData(null);
      fetchTrendAnalysis();
    }
  }, [activeTab, fetchTrendAnalysis]);

  const obChartConfig = { totalSales: { label: 'Sales', color: '#059669' }, totalRecovery: { label: 'Recovery', color: '#0284c7' } };
  const companyBarConfig = { totalSales: { label: 'Sales', color: '#059669' }, totalRecovery: { label: 'Recovery', color: '#0284c7' } };
  const trendChartConfig = { totalSales: { label: 'Sales', color: '#059669' }, totalRecovery: { label: 'Recovery', color: '#d97706' }, totalCredit: { label: 'Credit', color: '#dc2626' } };

  const riskLevelMap: Record<string, { label: string; color: string; bgClass: string; dotClass: string }> = {
    low: { label: 'Safe', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700', bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/30', dotClass: 'active' },
    medium: { label: 'Watch', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700', bgClass: 'bg-amber-50/50 dark:bg-amber-950/30', dotClass: 'warning' },
    high: { label: 'Danger', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', bgClass: 'bg-red-50/50 dark:bg-red-950/30', dotClass: 'risk' },
  };

  // Extract OB analysis data
  const obStats = obData?.stats as { totalSales: number; totalRecovery: number; totalCredit: number; recoveryRate: number; entryCount: number } | undefined;
  const obDailyPerformance = (obData?.dailyPerformance as { date: string; totalSales: number; totalRecovery: number; totalCredit: number }[]) || [];
  const obCompanyBreakdown = (obData?.companyBreakdown as { companyId: string; companyName: string; totalSales: number; totalRecovery: number; totalCredit: number; currentBalance: number }[]) || [];

  // Extract Company analysis data
  const coStats = companyData?.stats as { totalSales: number; totalRecovery: number; totalCredit: number; recoveryRate: number; entryCount: number } | undefined;
  const coOBBreakdown = (companyData?.orderBookerBreakdown as { orderBookerId: string; orderBookerName: string; totalSales: number; totalRecovery: number; totalCredit: number; currentBalance: number }[]) || [];

  // Extract Trend analysis data
  const trendDaily = (trendData?.dailyTrend as { date: string; totalSales: number; totalRecovery: number; totalCredit: number }[]) || [];
  const obRiskAnalysis = (trendData?.obRiskAnalysis as { orderBookerId: string; orderBookerName: string; totalSales: number; totalRecovery: number; totalCredit: number; recoveryRate: number; riskLevel: string }[]) || [];
  const companyRiskAnalysis = (trendData?.companyRiskAnalysis as { companyId: string; companyName: string; totalSales: number; totalRecovery: number; totalCredit: number; recoveryRate: number; riskLevel: string }[]) || [];

  // Summary metrics for banner
  const totalTrendSales = trendDaily.reduce((s, d) => s + d.totalSales, 0);
  const totalTrendRecovery = trendDaily.reduce((s, d) => s + d.totalRecovery, 0);
  const totalTrendCredit = trendDaily.reduce((s, d) => s + d.totalCredit, 0);
  const avgRecoveryRate = totalTrendSales > 0 ? (totalTrendRecovery / totalTrendSales) * 100 : 0;
  const highRiskOBs = obRiskAnalysis.filter(r => r.riskLevel === 'high').length;
  const highRiskCompanies = companyRiskAnalysis.filter(c => c.riskLevel === 'high').length;

  const handlePrint = () => {
    window.print();
    toast.success('Print/PDF dialog opened');
  };

  const handleExportPDF = () => {
    // Use window.print() with print-optimized CSS for PDF export
    window.print();
    toast.success('Use Save as PDF in the print dialog');
  };

  const StatCard = ({ title, value, color = 'emerald', subtext, icon: Icon }: { title: string; value: string; color?: string; subtext?: string; icon?: React.ElementType }) => {
    const colorMap: Record<string, string> = {
      emerald: 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
      red: 'border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
      sky: 'border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50/80 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20',
      amber: 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
    };
    const textMap: Record<string, string> = {
      emerald: 'text-emerald-700 dark:text-emerald-300',
      red: 'text-red-700 dark:text-red-300',
      sky: 'text-sky-700 dark:text-sky-300',
      amber: 'text-amber-700 dark:text-amber-300',
    };
    const iconBgMap: Record<string, string> = {
      emerald: 'bg-emerald-100 dark:bg-emerald-900/50',
      red: 'bg-red-100 dark:bg-red-900/50',
      sky: 'bg-sky-100 dark:bg-sky-900/50',
      amber: 'bg-amber-100 dark:bg-amber-900/50',
    };
    return (
      <Card className={`border ${colorMap[color]} card-hover`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{title}</p>
              <p className={`text-xl font-bold ${textMap[color]} mt-1`}>{value}</p>
              {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
            </div>
            {Icon && (
              <div className={`p-1.5 rounded-lg ${iconBgMap[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Reports & Analysis</h1>
          <p className="text-muted-foreground text-sm">Detailed analysis and performance insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 text-xs h-9 border-emerald-200 dark:border-emerald-800">
                <CalendarIcon className="w-3.5 h-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}</>
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-emerald-200 dark:border-emerald-800 text-xs"
            onClick={() => {
              const now = new Date();
              setDateRange({ from: startOfMonth(now), to: now });
            }}
          >
            <RotateCcw className="w-3 h-3" />
            This Month
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 no-print border-emerald-200 dark:border-emerald-800" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 no-print border-emerald-200 dark:border-emerald-800 btn-glow" onClick={handleExportPDF}>
            <FileText className="w-3.5 h-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Banner */}
      {trendData && (
        <div className="summary-banner rounded-2xl p-5 animate-fade-in-up stagger-1">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <h3 className="text-sm font-semibold text-emerald-100">Performance Summary</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Total Sales</p>
                <p className="text-lg font-bold text-white mt-0.5">{formatPKR(totalTrendSales)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Total Recovery</p>
                <p className="text-lg font-bold text-white mt-0.5">{formatPKR(totalTrendRecovery)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Avg Recovery Rate</p>
                <p className="text-lg font-bold text-white mt-0.5">{avgRecoveryRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Risk Alerts</p>
                <p className="text-lg font-bold text-white mt-0.5">{highRiskOBs + highRiskCompanies} <span className="text-sm font-normal text-emerald-200">items</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 no-print">
          <TabsTrigger value="ob" className="gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> OB Analysis
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" /> Company-wise
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Trends
          </TabsTrigger>
        </TabsList>

        {/* OB Analysis Tab */}
        <TabsContent value="ob" className="space-y-4">
          <Card className="no-print animate-fade-in-up glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Select Order Booker:</span>
                <Select value={selectedOB} onValueChange={setSelectedOB}>
                  <SelectTrigger className="w-60 h-9 border-emerald-200 dark:border-emerald-800">
                    <SelectValue placeholder="Choose an OB" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderBookers.map((ob) => (
                      <SelectItem key={ob.id} value={ob.id}>{ob.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {obLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 shimmer" />)}
            </div>
          ) : obStats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
                <StatCard title="Total Sales" value={formatPKR(obStats.totalSales)} color="emerald" subtext={`${obStats.entryCount} entries`} icon={DollarSign} />
                <StatCard title="Total Recovery" value={formatPKR(obStats.totalRecovery)} color="sky" icon={Wallet} />
                <StatCard title="Total Credit" value={formatPKR(obStats.totalCredit)} color="red" icon={CreditCard} />
                <StatCard title="Recovery Rate" value={`${obStats.recoveryRate.toFixed(1)}%`} color={obStats.recoveryRate >= 70 ? 'emerald' : 'amber'} icon={Target} />
              </div>

              {obDailyPerformance.length > 0 && (
                <Card className="card-hover animated-border animate-fade-in-up stagger-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Daily Performance Trend
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">Sales vs recovery performance over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="chart-container-rounded">
                      <ChartContainer config={obChartConfig} className="h-64 w-full">
                        <LineChart data={obDailyPerformance}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2} name="Sales" />
                          <Line type="monotone" dataKey="totalRecovery" stroke="#0284c7" strokeWidth={2} name="Recovery" />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {obCompanyBreakdown.length > 0 && (
                <Card className="card-hover animate-fade-in-up stagger-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                        <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      Company-wise Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">Performance breakdown across companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <Table className="table-enhanced">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Sales</TableHead>
                            <TableHead className="text-right">Recovery</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Recovery %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {obCompanyBreakdown.map((c) => {
                            const rate = c.totalSales > 0 ? (c.totalRecovery / c.totalSales) * 100 : 0;
                            return (
                              <TableRow key={c.companyId} className="transition-all duration-200">
                                <TableCell className="font-medium text-sm">{c.companyName}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{c.totalSales.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{c.totalRecovery.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-red-600 dark:text-red-400">{c.totalCredit.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  <Badge variant={c.currentBalance > 0 ? 'destructive' : 'default'} className={`text-[10px] px-1.5 py-0 h-4 font-mono badge-animated ${c.currentBalance <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0' : ''}`}>
                                    <span className={`status-dot ${c.currentBalance > 0 ? 'risk' : 'active'}`}>
                                      {c.currentBalance.toLocaleString()}
                                    </span>
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={rate} className="h-1.5 w-14" />
                                    <span className="text-xs font-mono font-medium">{rate.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="animate-fade-in-up glass-card">
              <CardContent className="p-12 text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">Select an Order Booker</p>
                <p className="text-sm mt-1">Choose an Order Booker from the dropdown to view their analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Company-wise Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card className="no-print animate-fade-in-up glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Select Company:</span>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-60 h-9 border-sky-200 dark:border-sky-800">
                    <SelectValue placeholder="Choose a Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((co) => (
                      <SelectItem key={co.id} value={co.id}>{co.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {companyLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 shimmer" />)}
            </div>
          ) : coStats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
                <StatCard title="Total Sales" value={formatPKR(coStats.totalSales)} color="emerald" subtext={`${coStats.entryCount} entries`} icon={DollarSign} />
                <StatCard title="Total Recovery" value={formatPKR(coStats.totalRecovery)} color="sky" icon={Wallet} />
                <StatCard title="Total Credit" value={formatPKR(coStats.totalCredit)} color="red" icon={CreditCard} />
              </div>

              {coOBBreakdown.length > 0 && (
                <>
                  <Card className="card-hover animated-border animate-fade-in-up stagger-1">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          OB Comparison within Company
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs">Comparing order booker performance for this company</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="chart-container-rounded">
                        <ChartContainer config={companyBarConfig} className="h-64 w-full">
                          <BarChart data={coOBBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                            <XAxis dataKey="orderBookerName" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="totalSales" fill="#059669" radius={[4, 4, 0, 0]} name="Sales" />
                            <Bar dataKey="totalRecovery" fill="#0284c7" radius={[4, 4, 0, 0]} name="Recovery" />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover animate-fade-in-up stagger-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                          <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        OB Breakdown
                      </CardTitle>
                      <CardDescription className="text-xs">Detailed breakdown by order booker</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <Table className="table-enhanced">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order Booker</TableHead>
                              <TableHead className="text-right">Sales</TableHead>
                              <TableHead className="text-right">Recovery</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {coOBBreakdown.map((ob) => (
                              <TableRow key={ob.orderBookerId} className="transition-all duration-200">
                                <TableCell className="font-medium text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                      {ob.orderBookerName.charAt(0)}
                                    </div>
                                    {ob.orderBookerName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{ob.totalSales.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{ob.totalRecovery.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-red-600 dark:text-red-400">{ob.totalCredit.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  <Badge variant={ob.currentBalance > 0 ? 'destructive' : 'default'} className={`text-[10px] px-1.5 py-0 h-4 font-mono badge-animated ${ob.currentBalance <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0' : ''}`}>
                                    <span className={`status-dot ${ob.currentBalance > 0 ? 'risk' : 'active'}`}>
                                      {ob.currentBalance.toLocaleString()}
                                    </span>
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          ) : (
            <Card className="animate-fade-in-up glass-card">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">Select a Company</p>
                <p className="text-sm mt-1">Choose a Company from the dropdown to view its analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trend" className="space-y-4">
          {trendLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full shimmer" />
              <Skeleton className="h-48 w-full shimmer" />
            </div>
          ) : trendData ? (
            <>
              {trendDaily.length > 0 && (
                <Card className="card-hover animated-border animate-fade-in-up">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                          <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Overall Performance Trend
                      </CardTitle>
                      <div className="flex items-center gap-2 no-print">
                        <div className="flex items-center rounded-lg border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                          <button
                            className={`chart-toggle-btn ${trendChartType === 'line' ? 'active' : ''}`}
                            onClick={() => setTrendChartType('line')}
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px]">Line</span>
                          </button>
                          <button
                            className={`chart-toggle-btn ${trendChartType === 'area' ? 'active' : ''}`}
                            onClick={() => setTrendChartType('area')}
                          >
                            <AreaChartIcon className="w-3 h-3" />
                            <span className="text-[10px]">Area</span>
                          </button>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                          <Sparkles className="w-3 h-3 mr-1" /> All Data
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-xs">Sales, recovery, and credit trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="chart-container-rounded">
                      <ChartContainer config={trendChartConfig} className="h-64 w-full">
                        {trendChartType === 'area' ? (
                          <AreaChart data={trendDaily}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="totalSales" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2} name="Sales" />
                            <Area type="monotone" dataKey="totalRecovery" stroke="#d97706" fill="#d97706" fillOpacity={0.15} strokeWidth={2} name="Recovery" />
                            <Area type="monotone" dataKey="totalCredit" stroke="#dc2626" fill="#dc2626" fillOpacity={0.15} strokeWidth={2} name="Credit" />
                          </AreaChart>
                        ) : (
                          <LineChart data={trendDaily}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2} dot={false} name="Sales" />
                            <Line type="monotone" dataKey="totalRecovery" stroke="#d97706" strokeWidth={2} dot={false} name="Recovery" />
                            <Line type="monotone" dataKey="totalCredit" stroke="#dc2626" strokeWidth={2} dot={false} name="Credit" />
                          </LineChart>
                        )}
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* OB Risk Assessment */}
              {obRiskAnalysis.length > 0 && (
                <Card className="card-hover animate-fade-in-up stagger-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        OB Credit Risk Assessment
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        {highRiskOBs > 0 && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700 border text-[10px]">
                            <span className="status-dot risk">{highRiskOBs} High Risk</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-xs">Risk levels based on recovery rates and credit outstanding</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <Table className="table-enhanced">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order Booker</TableHead>
                            <TableHead className="text-right">Total Sales</TableHead>
                            <TableHead className="text-right">Total Credit</TableHead>
                            <TableHead className="text-right">Recovery Rate</TableHead>
                            <TableHead>Risk Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {obRiskAnalysis.map((r) => {
                            const risk = riskLevelMap[r.riskLevel] || riskLevelMap.medium;
                            return (
                              <TableRow key={r.orderBookerId} className={`${risk.bgClass} transition-all duration-200`}>
                                <TableCell className="font-medium text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                      {r.orderBookerName.charAt(0)}
                                    </div>
                                    {r.orderBookerName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{r.totalSales.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-red-600 dark:text-red-400">{r.totalCredit.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={r.recoveryRate} className="h-1.5 w-14" />
                                    <span className="text-xs font-mono font-medium">{r.recoveryRate.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${risk.color} border text-[10px] badge-animated`}>
                                    <span className={`status-dot ${risk.dotClass}`}>{risk.label}</span>
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Risk Assessment */}
              {companyRiskAnalysis.length > 0 && (
                <Card className="card-hover animate-fade-in-up stagger-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                          <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        Company Credit Risk Assessment
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        {highRiskCompanies > 0 && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700 border text-[10px]">
                            <span className="status-dot risk">{highRiskCompanies} High Risk</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-xs">Company risk assessment based on credit exposure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <Table className="table-enhanced">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Total Sales</TableHead>
                            <TableHead className="text-right">Total Credit</TableHead>
                            <TableHead className="text-right">Recovery Rate</TableHead>
                            <TableHead>Risk Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyRiskAnalysis.map((c) => {
                            const risk = riskLevelMap[c.riskLevel] || riskLevelMap.medium;
                            return (
                              <TableRow key={c.companyId} className={`${risk.bgClass} transition-all duration-200`}>
                                <TableCell className="font-medium text-sm">{c.companyName}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{c.totalSales.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-red-600 dark:text-red-400">{c.totalCredit.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={c.recoveryRate} className="h-1.5 w-14" />
                                    <span className="text-xs font-mono font-medium">{c.recoveryRate.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${risk.color} border text-[10px] badge-animated`}>
                                    <span className={`status-dot ${risk.dotClass}`}>{risk.label}</span>
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {trendDaily.length === 0 && obRiskAnalysis.length === 0 && (
                <Card className="animate-fade-in-up glass-card">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium">No data available yet</p>
                    <p className="text-sm mt-1">Add some entries first to see trend analysis</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="animate-fade-in-up glass-card">
              <CardContent className="p-12 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">No trend data available</p>
                <p className="text-sm mt-1">Add some entries first to see trend analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
