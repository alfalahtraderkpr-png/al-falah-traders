'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Wallet, Search, RefreshCw, ArrowRight, CheckCircle, AlertTriangle, Clock,
  TrendingDown, ChevronDown, ChevronUp, HandCoins, PieChart as PieChartIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface CompanyBalance {
  companyId: string;
  companyName: string;
  category: string | null;
  outstanding: number;
  lastEntryDate: string | null;
  aging: {
    current: number;
    thirtyToSixty: number;
    sixtyToNinety: number;
    overNinety: number;
  };
}

interface OBBalance {
  orderBookerId: string;
  orderBookerName: string;
  phone: string | null;
  companyBalances: CompanyBalance[];
  totalOutstanding: number;
  aging: {
    current: number;
    thirtyToSixty: number;
    sixtyToNinety: number;
    overNinety: number;
  };
}

interface BalancesData {
  obBalances: OBBalance[];
  overallTotal: number;
  overallAging: {
    current: number;
    thirtyToSixty: number;
    sixtyToNinety: number;
    overNinety: number;
  };
  orderBookers: { id: string; name: string }[];
  companies: { id: string; name: string }[];
}

function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

function getOutstandingColor(amount: number): { text: string; bg: string; border: string } {
  if (amount > 50000) return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800' };
  if (amount > 20000) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' };
  return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' };
}

function getOutstandingBadge(amount: number) {
  if (amount > 50000) return <Badge variant="destructive" className="text-[10px]">High</Badge>;
  if (amount > 20000) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] border">Medium</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 text-[10px] border">Low</Badge>;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch {
    return String(date);
  }
}

export default function BalancesPage() {
  const [data, setData] = useState<BalancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOBs, setExpandedOBs] = useState<Set<string>>(new Set());

  // Settle dialog
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleOB, setSettleOB] = useState<OBBalance | null>(null);
  const [settleCompany, setSettleCompany] = useState<CompanyBalance | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleSaving, setSettleSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/balances?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Balances fetch error:', err);
      toast.error('Failed to load balances');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleOB = (obId: string) => {
    setExpandedOBs(prev => {
      const next = new Set(prev);
      if (next.has(obId)) next.delete(obId);
      else next.add(obId);
      return next;
    });
  };

  const openSettleDialog = (ob: OBBalance, company: CompanyBalance) => {
    setSettleOB(ob);
    setSettleCompany(company);
    setSettleAmount('');
    setSettleNotes('');
    setSettleDialogOpen(true);
  };

  const handleSettle = async () => {
    if (!settleOB || !settleCompany) return;
    const amount = parseFloat(settleAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > settleCompany.outstanding) {
      toast.error('Amount cannot exceed outstanding balance');
      return;
    }

    setSettleSaving(true);
    try {
      // Create a settlement entry - a daily entry with cash received = settle amount
      const payload = {
        date: format(new Date(), 'yyyy-MM-dd'),
        orderBookerId: settleOB.orderBookerId,
        companyId: settleCompany.companyId,
        summaryAmount: 0,
        stockReturn: 0,
        cashReceived: amount,
        oldRecovery: amount,
        notes: settleNotes || `Payment settlement - ${formatPKR(amount)}`,
      };

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Settled ${formatPKR(amount)} for ${settleOB.orderBookerName} - ${settleCompany.companyName}`);
        setSettleDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to record settlement');
      }
    } catch {
      toast.error('Failed to record settlement');
    } finally {
      setSettleSaving(false);
    }
  };

  const filteredBalances = data?.obBalances.filter(ob => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ob.orderBookerName.toLowerCase().includes(q) ||
      ob.companyBalances.some(cb => cb.companyName.toLowerCase().includes(q))
    );
  }) || [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Outstanding Balances</h1>
          <p className="text-muted-foreground text-sm">Track and settle outstanding dues across all order bookers</p>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      <Card className="animate-fade-in-up stagger-1">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by OB or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      {!loading && data && (
        <>
          {/* Overall Total + Aging Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className={`lg:col-span-2 card-hover animate-fade-in-up stagger-2 border ${getOutstandingColor(data.overallTotal).border}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Total Outstanding</h3>
                      <p className="text-[10px] text-muted-foreground">Across all order bookers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getOutstandingColor(data.overallTotal).text}`}>
                      {formatPKR(data.overallTotal)}
                    </p>
                    {getOutstandingBadge(data.overallTotal)}
                  </div>
                </div>

                {/* Aging Analysis */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current (0-30d)</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{formatPKR(data.overallAging.current)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">30-60 Days</p>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">{formatPKR(data.overallAging.thirtyToSixty)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">60-90 Days</p>
                    <p className="text-sm font-bold text-orange-700 dark:text-orange-300 mt-0.5">{formatPKR(data.overallAging.sixtyToNinety)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-50/80 dark:bg-red-950/40 border border-red-200/50 dark:border-red-800/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">90+ Days</p>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300 mt-0.5">{formatPKR(data.overallAging.overNinety)}</p>
                  </div>
                </div>

                {/* Recovery Progress */}
                {data.overallTotal > 0 && (() => {
                  const totalAging = data.overallAging.current + data.overallAging.thirtyToSixty + data.overallAging.sixtyToNinety + data.overallAging.overNinety;
                  const currentPct = totalAging > 0 ? (data.overallAging.current / totalAging) * 100 : 0;
                  const thirtySixtyPct = totalAging > 0 ? (data.overallAging.thirtyToSixty / totalAging) * 100 : 0;
                  const sixtyNinetyPct = totalAging > 0 ? (data.overallAging.sixtyToNinety / totalAging) * 100 : 0;
                  const overNinetyPct = totalAging > 0 ? (data.overallAging.overNinety / totalAging) * 100 : 0;
                  return (
                    <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Aging Distribution</p>
                        <span className="text-[10px] text-muted-foreground">{formatPKR(totalAging)} total</span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                        {currentPct > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${currentPct}%` }} title={`Current: ${currentPct.toFixed(0)}%`} />}
                        {thirtySixtyPct > 0 && <div className="bg-amber-500 transition-all duration-500" style={{ width: `${thirtySixtyPct}%` }} title={`30-60d: ${thirtySixtyPct.toFixed(0)}%`} />}
                        {sixtyNinetyPct > 0 && <div className="bg-orange-500 transition-all duration-500" style={{ width: `${sixtyNinetyPct}%` }} title={`60-90d: ${sixtyNinetyPct.toFixed(0)}%`} />}
                        {overNinetyPct > 0 && <div className="bg-red-500 transition-all duration-500" style={{ width: `${overNinetyPct}%` }} title={`90+d: ${overNinetyPct.toFixed(0)}%`} />}
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Current {currentPct.toFixed(0)}%</span>
                        <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full bg-amber-500" /> 30-60d {thirtySixtyPct.toFixed(0)}%</span>
                        <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full bg-orange-500" /> 60-90d {sixtyNinetyPct.toFixed(0)}%</span>
                        <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full bg-red-500" /> 90+d {overNinetyPct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Aging Distribution Pie Chart */}
            <Card className="card-hover animate-fade-in-up stagger-3 border border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Aging Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {data.overallTotal > 0 ? (() => {
                  const agingData = [
                    { name: 'Current (0-30d)', value: data.overallAging.current, color: '#059669' },
                    { name: '30-60 Days', value: data.overallAging.thirtyToSixty, color: '#d97706' },
                    { name: '60-90 Days', value: data.overallAging.sixtyToNinety, color: '#ea580c' },
                    { name: '90+ Days', value: data.overallAging.overNinety, color: '#dc2626' },
                  ].filter(d => d.value > 0);
                  const agingConfig: Record<string, { label: string; color: string }> = {};
                  agingData.forEach(d => { agingConfig[d.name] = { label: d.name, color: d.color }; });
                  return (
                    <ChartContainer config={agingConfig} className="h-52 w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie
                          data={agingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }: { name: string; percent: number }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={{ strokeWidth: 1 }}
                          strokeWidth={2}
                        >
                          {agingData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  );
                })() : (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                    No outstanding balances
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* OB Balance Cards */}
          <div className="space-y-3">
            {filteredBalances.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-lg font-medium">No outstanding balances</p>
                  <p className="text-sm mt-1">All accounts are settled or no entries exist yet</p>
                </CardContent>
              </Card>
            ) : (
              filteredBalances.map((ob, i) => {
                const isExpanded = expandedOBs.has(ob.orderBookerId);
                const color = getOutstandingColor(ob.totalOutstanding);

                return (
                  <Card key={ob.orderBookerId} className={`card-hover animate-fade-in-up border ${color.border} stagger-${Math.min(i + 1, 4)}`}>
                    <CardContent className="p-0">
                      {/* OB Header */}
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                        onClick={() => toggleOB(ob.orderBookerId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {ob.orderBookerName.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{ob.orderBookerName}</span>
                              {getOutstandingBadge(ob.totalOutstanding)}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {ob.companyBalances.length} compan{ob.companyBalances.length === 1 ? 'y' : 'ies'} with dues
                              </span>
                              {ob.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {ob.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-bold ${color.text}`}>{formatPKR(ob.totalOutstanding)}</p>
                            <p className="text-[10px] text-muted-foreground">total outstanding</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Company Breakdown */}
                      {isExpanded && ob.companyBalances.length > 0 && (
                        <div className="border-t">
                          <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {ob.companyBalances.map((cb) => {
                              const cbColor = getOutstandingColor(cb.outstanding);
                              return (
                                <div
                                  key={cb.companyId}
                                  className={`flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                        {cb.companyName.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{cb.companyName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            Last: {formatDate(cb.lastEntryDate)}
                                          </span>
                                          {cb.category && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                              {cb.category}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Aging for this company */}
                                    <div className="flex items-center gap-2 mt-1.5 ml-9">
                                      {cb.aging.current > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                          {formatPKR(cb.aging.current)} current
                                        </span>
                                      )}
                                      {cb.aging.thirtyToSixty > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                          {formatPKR(cb.aging.thirtyToSixty)} 30-60d
                                        </span>
                                      )}
                                      {cb.aging.sixtyToNinety > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                                          {formatPKR(cb.aging.sixtyToNinety)} 60-90d
                                        </span>
                                      )}
                                      {cb.aging.overNinety > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                                          {formatPKR(cb.aging.overNinety)} 90+d
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <p className={`font-mono font-bold text-sm ${cbColor.text}`}>
                                        {formatPKR(cb.outstanding)}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openSettleDialog(ob, cb);
                                      }}
                                    >
                                      <HandCoins className="w-3 h-3" />
                                      Settle
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isExpanded && ob.companyBalances.length === 0 && (
                        <div className="p-4 border-t text-center text-muted-foreground text-sm">
                          No outstanding balances for this order booker
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Settle Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Record Payment Settlement
            </DialogTitle>
            <DialogDescription>
              Record a payment to reduce the outstanding balance. This will create a new entry with cash received.
            </DialogDescription>
          </DialogHeader>

          {settleOB && settleCompany && (
            <div className="space-y-4">
              {/* Info Card */}
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Order Booker</span>
                  <span className="text-sm font-medium">{settleOB.orderBookerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Company</span>
                  <span className="text-sm font-medium">{settleCompany.companyName}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Current Outstanding</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {formatPKR(settleCompany.outstanding)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settleAmount" className="text-xs font-medium">
                  Payment Amount (PKR) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    PKR
                  </span>
                  <Input
                    id="settleAmount"
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="0"
                    className="pl-12 font-mono h-10"
                    max={settleCompany.outstanding}
                  />
                </div>
                {settleAmount && parseFloat(settleAmount) > settleCompany.outstanding && (
                  <p className="text-[10px] text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Amount exceeds outstanding balance
                  </p>
                )}
                {/* Quick amounts */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setSettleAmount(String(settleCompany.outstanding))}
                  >
                    Full Amount
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setSettleAmount(String(Math.round(settleCompany.outstanding / 2)))}
                  >
                    Half
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setSettleAmount(String(Math.round(settleCompany.outstanding * 0.25)))}
                  >
                    25%
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settleNotes" className="text-xs font-medium">
                  Notes (optional)
                </Label>
                <Input
                  id="settleNotes"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Payment reference, cheque #, etc."
                  className="h-9"
                />
              </div>

              {/* Preview */}
              {settleAmount && parseFloat(settleAmount) > 0 && (
                <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Settlement Preview</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-600 dark:text-red-400 font-mono">{formatPKR(settleCompany.outstanding)}</span>
                    <ArrowRight className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {formatPKR(settleCompany.outstanding - parseFloat(settleAmount))}
                    </span>
                    <span className="text-xs text-muted-foreground">remaining</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button
              onClick={handleSettle}
              disabled={settleSaving || !settleAmount || parseFloat(settleAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 h-9 gap-1.5"
            >
              {settleSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
