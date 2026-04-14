'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Building2, BarChart3, AlertTriangle } from 'lucide-react';

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

  const [obData, setOBData] = useState<Record<string, unknown> | null>(null);
  const [companyData, setCompanyData] = useState<Record<string, unknown> | null>(null);
  const [trendData, setTrendData] = useState<Record<string, unknown> | null>(null);

  const [obLoading, setOBLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [obRes, coRes] = await Promise.all([
          fetch('/api/order-bookers'),
          fetch('/api/companies'),
        ]);
        if (obRes.ok) setOrderBookers(await obRes.json());
        if (coRes.ok) setCompanies(await coRes.json());
      } catch { /* silent */ }
    };
    fetchRefs();
  }, []);

  const fetchOBAnalysis = useCallback(async () => {
    if (!selectedOB) return;
    setOBLoading(true);
    try {
      const res = await fetch(`/api/reports?type=ob-analysis&orderBookerId=${selectedOB}`);
      if (res.ok) setOBData(await res.json());
    } catch { /* silent */ }
    finally { setOBLoading(false); }
  }, [selectedOB]);

  const fetchCompanyAnalysis = useCallback(async () => {
    if (!selectedCompany) return;
    setCompanyLoading(true);
    try {
      const res = await fetch(`/api/reports?type=company-analysis&companyId=${selectedCompany}`);
      if (res.ok) setCompanyData(await res.json());
    } catch { /* silent */ }
    finally { setCompanyLoading(false); }
  }, [selectedCompany]);

  const fetchTrendAnalysis = useCallback(async () => {
    setTrendLoading(true);
    try {
      const res = await fetch('/api/reports?type=trend');
      if (res.ok) setTrendData(await res.json());
    } catch { /* silent */ }
    finally { setTrendLoading(false); }
  }, []);

  useEffect(() => { fetchOBAnalysis(); }, [fetchOBAnalysis]);
  useEffect(() => { fetchCompanyAnalysis(); }, [fetchCompanyAnalysis]);
  useEffect(() => { fetchTrendAnalysis(); }, [fetchTrendAnalysis]);

  const obChartConfig = { totalSales: { label: 'Closing Balance', color: '#059669' } };
  const companyBarConfig = { totalSales: { label: 'Sales', color: '#059669' }, totalRecovery: { label: 'Recovery', color: '#0284c7' } };
  const trendChartConfig = { totalSales: { label: 'Sales', color: '#059669' }, totalRecovery: { label: 'Recovery', color: '#d97706' }, totalCredit: { label: 'Credit', color: '#dc2626' } };

  const riskLevelMap: Record<string, { label: string; color: string; emoji: string }> = {
    low: { label: 'Safe', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', emoji: '🟢' },
    medium: { label: 'Watch', color: 'bg-amber-100 text-amber-800 border-amber-300', emoji: '🟡' },
    high: { label: 'Danger', color: 'bg-red-100 text-red-800 border-red-300', emoji: '🔴' },
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Reports & Analysis</h1>
        <p className="text-muted-foreground text-sm">Detailed analysis and performance insights</p>
      </div>

      <Tabs defaultValue="ob" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ob" className="gap-1.5">
            <TrendingUp className="w-4 h-4" /> OB Analysis
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5">
            <Building2 className="w-4 h-4" /> Company-wise
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Trends
          </TabsTrigger>
        </TabsList>

        {/* OB Analysis Tab */}
        <TabsContent value="ob" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Select Order Booker:</span>
                <Select value={selectedOB} onValueChange={setSelectedOB}>
                  <SelectTrigger className="w-60">
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
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : obStats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-xl font-bold text-emerald-700">{formatPKR(obStats.totalSales)}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Recovery</p>
                    <p className="text-xl font-bold text-emerald-700">{formatPKR(obStats.totalRecovery)}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Credit</p>
                    <p className="text-xl font-bold text-red-700">{formatPKR(obStats.totalCredit)}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Recovery Rate</p>
                    <p className="text-xl font-bold text-emerald-700">{obStats.recoveryRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={obChartConfig} className="h-64 w-full">
                    <LineChart data={obDailyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company-wise Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Recovery</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {obCompanyBreakdown.map((c) => (
                          <TableRow key={c.companyId}>
                            <TableCell className="font-medium">{c.companyName}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{c.totalSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-emerald-600">{c.totalRecovery.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-red-600">{c.totalCredit.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <Badge variant={c.currentBalance > 0 ? 'destructive' : 'default'} className="text-xs">
                                {c.currentBalance.toLocaleString()}
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
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select an Order Booker to view their analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Company-wise Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Select Company:</span>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-60">
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
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : coStats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-xl font-bold text-emerald-700">{formatPKR(coStats.totalSales)}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Recovery</p>
                    <p className="text-xl font-bold text-emerald-700">{formatPKR(coStats.totalRecovery)}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Credit</p>
                    <p className="text-xl font-bold text-red-700">{formatPKR(coStats.totalCredit)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">OB Comparison within Company</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={companyBarConfig} className="h-64 w-full">
                    <BarChart data={coOBBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="orderBookerName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="totalSales" fill="#059669" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalRecovery" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">OB Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <Table>
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
                          <TableRow key={ob.orderBookerId}>
                            <TableCell className="font-medium">{ob.orderBookerName}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{ob.totalSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-emerald-600">{ob.totalRecovery.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-red-600">{ob.totalCredit.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <Badge variant={ob.currentBalance > 0 ? 'destructive' : 'default'} className="text-xs">
                                {ob.currentBalance.toLocaleString()}
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
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a Company to view its analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trend" className="space-y-4">
          {trendLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : trendData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    Overall Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={trendChartConfig} className="h-64 w-full">
                    <LineChart data={trendDaily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="totalSales" stroke="#059669" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="totalRecovery" stroke="#d97706" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="totalCredit" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-emerald-600" />
                    Credit Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Booker</TableHead>
                          <TableHead className="text-right">Total Credit</TableHead>
                          <TableHead className="text-right">Recovery Rate</TableHead>
                          <TableHead>Risk Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {obRiskAnalysis.map((r) => {
                          const risk = riskLevelMap[r.riskLevel] || riskLevelMap.medium;
                          return (
                            <TableRow key={r.orderBookerId}>
                              <TableCell className="font-medium">{r.orderBookerName}</TableCell>
                              <TableCell className="text-right font-mono">{r.totalCredit.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono">{r.recoveryRate.toFixed(1)}%</TableCell>
                              <TableCell>
                                <Badge className={`${risk.color} border`}>
                                  {risk.emoji} {risk.label}
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
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No trend data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
