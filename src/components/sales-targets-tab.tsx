'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Save, RefreshCw, Edit, Trash2, TrendingUp, TrendingDown, Minus, Loader2, BarChart3, Package, Weight, DollarSign, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface OrderBooker {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Company {
  id: string;
  name: string;
  category?: string;
  isActive?: boolean;
}

interface SalesTargetWithAchievement {
  id: string;
  orderBookerId: string;
  companyId: string;
  month: number;
  year: number;
  targetCtns: number;
  targetTonnage: number;
  targetValue: number;
  notes?: string;
  orderBooker: { id: string; name: string };
  company: { id: string; name: string; category?: string };
  achievement: {
    achievedValue: number;
    achievedCash: number;
    achievedCredit: number;
    totalRecovery: number;
    valueAchievementPct: number;
    ctnsAchievementPct: number;
    tonnageAchievementPct: number;
    daysWorked: number;
  };
}

interface Props {
  orderBookers: OrderBooker[];
  companies: Company[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalesTargetsTab({ orderBookers, companies }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<SalesTargetWithAchievement[]>([]);

  // Grid data for new entries: { [obId_companyId]: { targetCtns, targetTonnage, targetValue } }
  const [gridData, setGridData] = useState<Record<string, { ctns: string; tonnage: string; value: string }>>({});

  // Expanded rows for achievement
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const activeOBs = orderBookers.filter(ob => ob.isActive !== false);
  const activeCos = companies.filter(co => co.isActive !== false);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/targets?month=${selectedMonth}&year=${selectedYear}&includeAchievement=true`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || []);

        // Populate grid from existing targets
        const newGrid: Record<string, { ctns: string; tonnage: string; value: string }> = {};
        (data.targets || []).forEach((t: SalesTargetWithAchievement) => {
          const key = `${t.orderBookerId}_${t.companyId}`;
          newGrid[key] = {
            ctns: String(t.targetCtns || ''),
            tonnage: String(t.targetTonnage || ''),
            value: String(t.targetValue || ''),
          };
        });
        setGridData(prev => ({ ...newGrid, ...prev }));
      }
    } catch {
      toast.error('Failed to load targets');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadTargets(); }, [loadTargets]);

  const handleGridChange = (obId: string, coId: string, field: 'ctns' | 'tonnage' | 'value', val: string) => {
    const key = `${obId}_${coId}`;
    setGridData(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { ctns: '', tonnage: '', value: '' },
        [field]: val,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const targetList = Object.entries(gridData)
        .filter(([, v]) => v.ctns || v.tonnage || v.value)
        .map(([key, v]) => {
          const [obId, coId] = key.split('_');
          return {
            orderBookerId: obId,
            companyId: coId,
            month: selectedMonth,
            year: selectedYear,
            targetCtns: parseFloat(v.ctns) || 0,
            targetTonnage: parseFloat(v.tonnage) || 0,
            targetValue: parseFloat(v.value) || 0,
          };
        });

      if (targetList.length === 0) {
        toast.error('No targets to save. Enter values in the grid first.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Saved ${data.saved} sales targets`, {
          description: `${MONTHS[selectedMonth - 1]} ${selectedYear}`,
        });
        loadTargets();
      } else {
        toast.error('Failed to save targets');
      }
    } catch {
      toast.error('Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/targets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Target deleted');
        loadTargets();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatPKR = (n: number | null | undefined) => {
    return (n ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatNum = (n: number | null | undefined, decimals = 1) => {
    return (n ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  };

  const getAchievementBadge = (pct: number) => {
    if (pct >= 100) return { color: 'bg-emerald-500', text: 'Achieved', icon: <TrendingUp className="w-3 h-3" /> };
    if (pct >= 70) return { color: 'bg-amber-500', text: 'On Track', icon: <Minus className="w-3 h-3" /> };
    return { color: 'bg-red-500', text: 'Behind', icon: <TrendingDown className="w-3 h-3" /> };
  };

  const getAchievementBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Calculate summary
  const totalTargetValue = targets.reduce((s, t) => s + (t.targetValue || 0), 0);
  const totalAchievedValue = targets.reduce((s, t) => s + (t.achievement?.achievedValue || 0), 0);
  const overallPct = totalTargetValue > 0 ? Math.round((totalAchievedValue / totalTargetValue) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50">
            <Target className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          Sales Targets
          <Badge variant="outline" className="text-[10px] ml-1 border-rose-200 dark:border-rose-800">
            {targets.length} targets
          </Badge>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="h-9 w-[130px] border-rose-200 dark:border-rose-800 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="h-9 w-[90px] border-rose-200 dark:border-rose-800 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTargets}
            className="h-9 border-rose-200 dark:border-rose-800 gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 gap-1.5 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 font-semibold"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Overall Achievement Card */}
      {targets.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200 dark:border-rose-800 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                {MONTHS[selectedMonth - 1]} {selectedYear} — Overall Achievement
              </span>
            </div>
            <Badge className={`${overallPct >= 100 ? 'bg-emerald-500' : overallPct >= 70 ? 'bg-amber-500' : 'bg-red-500'} text-white`}>
              {overallPct}% Achieved
            </Badge>
          </div>
          <div className="w-full h-3 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getAchievementBarColor(overallPct)}`}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>Target: PKR {formatPKR(totalTargetValue)}</span>
            <span>Achieved: PKR {formatPKR(totalAchievedValue)}</span>
          </div>
        </div>
      )}

      {/* Target Entry Grid */}
      <Card className="card-hover animate-fade-in-up stagger-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-600" />
            Set Targets — {MONTHS[selectedMonth - 1]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-rose-50/80 to-pink-50/80 dark:from-rose-950/30 dark:to-pink-950/30">
                  <th className="sticky left-0 z-10 bg-white dark:bg-gray-950 px-3 py-2.5 text-left font-semibold text-rose-700 dark:text-rose-300 border-b border-r border-rose-200 dark:border-rose-800 min-w-[120px]">
                    Order Booker
                  </th>
                  <th className="sticky left-[120px] z-10 bg-white dark:bg-gray-950 px-2 py-2.5 text-left font-semibold text-rose-700 dark:text-rose-300 border-b border-r border-rose-200 dark:border-rose-800 min-w-[100px]">
                    Company
                  </th>
                  <th className="px-2 py-2.5 text-center font-semibold text-rose-700 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800 min-w-[100px]">
                    <div className="flex items-center justify-center gap-1"><Package className="w-3 h-3" /> CTNs</div>
                  </th>
                  <th className="px-2 py-2.5 text-center font-semibold text-rose-700 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800 min-w-[100px]">
                    <div className="flex items-center justify-center gap-1"><Weight className="w-3 h-3" /> Tonnage</div>
                  </th>
                  <th className="px-2 py-2.5 text-center font-semibold text-rose-700 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800 min-w-[110px]">
                    <div className="flex items-center justify-center gap-1"><DollarSign className="w-3 h-3" /> Value (PKR)</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeOBs.map((ob, obIdx) =>
                  activeCos.map((co, coIdx) => {
                    const key = `${ob.id}_${co.id}`;
                    const data = gridData[key] || { ctns: '', tonnage: '', value: '' };
                    const isFirstCo = coIdx === 0;
                    return (
                      <tr key={key} className={`${obIdx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/30'}`}>
                        {isFirstCo && (
                          <td
                            className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium border-r border-rose-200/50 dark:border-rose-800/50"
                            rowSpan={activeCos.length}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                {ob.name.charAt(0)}
                              </div>
                              <span className="truncate max-w-[90px]" title={ob.name}>{ob.name}</span>
                            </div>
                          </td>
                        )}
                        <td className="sticky left-[120px] z-10 bg-inherit px-2 py-1.5 border-r border-rose-200/50 dark:border-rose-800/50">
                          <span className="text-muted-foreground truncate max-w-[90px] block" title={co.name}>{co.name}</span>
                        </td>
                        <td className="px-1.5 py-1">
                          <Input
                            type="number"
                            value={data.ctns}
                            onChange={(e) => handleGridChange(ob.id, co.id, 'ctns', e.target.value)}
                            placeholder="0"
                            className="h-7 text-[11px] text-center border-rose-200/50 dark:border-rose-800/50 focus:border-rose-400 dark:focus:border-rose-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <Input
                            type="number"
                            value={data.tonnage}
                            onChange={(e) => handleGridChange(ob.id, co.id, 'tonnage', e.target.value)}
                            placeholder="0"
                            className="h-7 text-[11px] text-center border-rose-200/50 dark:border-rose-800/50 focus:border-rose-400 dark:focus:border-rose-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <Input
                            type="number"
                            value={data.value}
                            onChange={(e) => handleGridChange(ob.id, co.id, 'value', e.target.value)}
                            placeholder="0"
                            className="h-7 text-[11px] text-center border-rose-200/50 dark:border-rose-800/50 focus:border-rose-400 dark:focus:border-rose-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Target Achievement Table */}
      <Card className="card-hover animate-fade-in-up stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-600" />
            Target Achievement — {MONTHS[selectedMonth - 1]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full shimmer" />)}
              </div>
            ) : targets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No targets set for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                <p className="text-xs mt-1">Use the grid above to set targets</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-rose-50/80 to-pink-50/80 dark:from-rose-950/30 dark:to-pink-950/30">
                    <th className="px-3 py-2.5 text-left font-semibold text-rose-700 dark:text-rose-300">OB / Company</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">Target CTNs</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">Target Ton</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">Target Value</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">Achieved</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-rose-700 dark:text-rose-300">Progress</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-rose-700 dark:text-rose-300">Status</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target, idx) => {
                    const ach = target.achievement || {} as any;
                    const pct = ach.valueAchievementPct || 0;
                    const badge = getAchievementBadge(pct);
                    const isExpanded = expandedRows.has(target.id);

                    return (
                      <React.Fragment key={target.id}>
                        <tr
                          className={`${idx % 2 === 0 ? '' : 'bg-muted/20'} cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/20`}
                          onClick={() => toggleExpand(target.id)}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              <div>
                                <p className="font-semibold">{target.orderBooker.name}</p>
                                <p className="text-[10px] text-muted-foreground">{target.company.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{formatNum(target.targetCtns, 0)}</td>
                          <td className="px-2 py-2 text-right font-mono">{formatNum(target.targetTonnage)}</td>
                          <td className="px-2 py-2 text-right font-mono font-semibold">{formatPKR(target.targetValue)}</td>
                          <td className="px-2 py-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatPKR(ach.achievedValue || 0)}
                          </td>
                          <td className="px-2 py-2">
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getAchievementBarColor(pct)}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <p className="text-center text-[10px] text-muted-foreground mt-0.5">{pct}%</p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Badge className={`${badge.color} text-white text-[9px] gap-0.5 h-5`}>
                              {badge.icon} {badge.text}
                            </Badge>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Target</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete target for {target.orderBooker.name} — {target.company.name} ({MONTHS[target.month - 1]} {target.year})?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(target.id)} className="bg-red-600 hover:bg-red-700">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-rose-50/30 dark:bg-rose-950/10">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Days Worked</p>
                                  <p className="text-sm font-bold">{ach.daysWorked || 0}</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Cash Recovery</p>
                                  <p className="text-sm font-bold text-emerald-600">PKR {formatPKR(ach.achievedCash || 0)}</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Credit Posted</p>
                                  <p className="text-sm font-bold text-amber-600">PKR {formatPKR(ach.achievedCredit || 0)}</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Total Recovery</p>
                                  <p className="text-sm font-bold text-sky-600">PKR {formatPKR(ach.totalRecovery || 0)}</p>
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-3">
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">CTNs Progress</p>
                                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${getAchievementBarColor(ach.ctnsAchievementPct || 0)}`} style={{ width: `${Math.min(ach.ctnsAchievementPct || 0, 100)}%` }} />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{ach.ctnsAchievementPct || 0}%</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Tonnage Progress</p>
                                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${getAchievementBarColor(ach.tonnageAchievementPct || 0)}`} style={{ width: `${Math.min(ach.tonnageAchievementPct || 0, 100)}%` }} />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{ach.tonnageAchievementPct || 0}%</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Value Progress</p>
                                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${getAchievementBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{pct}%</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200 dark:border-rose-800 animate-fade-in-up">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 dark:text-rose-300">
            <strong>Sales Targets</strong> — For CBL and other companies, set monthly targets in CTNs, Tonnage, and Values. The system will automatically track achievement against these targets based on daily entries.
          </p>
        </div>
      </div>
    </div>
  );
}
