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
import { Wallet, Save, RefreshCw, Plus, Edit, Trash2, Calendar, AlertTriangle, Loader2, ArrowDown, ArrowRight } from 'lucide-react';
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

interface OpeningCredit {
  id: string;
  orderBookerId: string;
  companyId: string;
  amount: number;
  date: string;
  notes?: string;
  orderBooker: { id: string; name: string };
  company: { id: string; name: string; category?: string };
}

interface Props {
  orderBookers: OrderBooker[];
  companies: Company[];
}

export default function OpeningCreditsTab({ orderBookers, companies }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingCredits, setExistingCredits] = useState<OpeningCredit[]>([]);

  // Grid data: { [obId_companyId]: amount }
  const [gridData, setGridData] = useState<Record<string, number>>({});
  // Notes per cell
  const [gridNotes, setGridNotes] = useState<Record<string, string>>({});

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCredit, setEditCredit] = useState<OpeningCredit | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const activeOBs = orderBookers.filter(ob => ob.isActive !== false);
  const activeCos = companies.filter(co => co.isActive !== false);

  const loadCredits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/opening-credits?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setExistingCredits(data.openingCredits || []);

        // Populate grid from existing credits
        const newGrid: Record<string, number> = {};
        const newNotes: Record<string, string> = {};
        (data.openingCredits || []).forEach((c: OpeningCredit) => {
          const key = `${c.orderBookerId}_${c.companyId}`;
          newGrid[key] = c.amount;
          if (c.notes) newNotes[key] = c.notes;
        });
        setGridData(newGrid);
        setGridNotes(newNotes);
      }
    } catch {
      toast.error('Failed to load opening credits');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  const handleCellChange = (obId: string, coId: string, value: string) => {
    const key = `${obId}_${coId}`;
    setGridData(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const credits = Object.entries(gridData)
        .filter(([key, amount]) => amount > 0)
        .map(([key, amount]) => {
          const [obId, coId] = key.split('_');
          return {
            orderBookerId: obId,
            companyId: coId,
            amount,
            date: selectedDate,
            notes: gridNotes[key] || null,
          };
        });

      if (credits.length === 0) {
        toast.error('No credits to save. Enter amounts in the grid first.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/opening-credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Saved ${data.saved} opening credits`, {
          description: `Effective date: ${selectedDate}`,
        });
        loadCredits();
      } else {
        toast.error('Failed to save opening credits');
      }
    } catch {
      toast.error('Failed to save opening credits');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/opening-credits?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Opening credit deleted');
        loadCredits();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openEditDialog = (credit: OpeningCredit) => {
    setEditCredit(credit);
    setEditAmount(String(credit.amount));
    setEditNotes(credit.notes || '');
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editCredit) return;
    try {
      const res = await fetch('/api/opening-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderBookerId: editCredit.orderBookerId,
          companyId: editCredit.companyId,
          amount: parseFloat(editAmount) || 0,
          date: editCredit.date,
          notes: editNotes || null,
        }),
      });
      if (res.ok) {
        toast.success('Opening credit updated');
        setEditDialogOpen(false);
        loadCredits();
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const formatPKR = (n: number | null | undefined) => {
    return (n ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Calculate totals
  const obTotals: Record<string, number> = {};
  const coTotals: Record<string, number> = {};
  let grandTotal = 0;

  Object.entries(gridData).forEach(([key, amount]) => {
    if (amount > 0) {
      const [obId, coId] = key.split('_');
      obTotals[obId] = (obTotals[obId] || 0) + amount;
      coTotals[coId] = (coTotals[coId] || 0) + amount;
      grandTotal += amount;
    }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
            <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          Opening Credits
          <Badge variant="outline" className="text-[10px] ml-1 border-amber-200 dark:border-amber-800">
            {Object.values(gridData).filter(v => v > 0).length} entries
          </Badge>
        </h2>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 w-[160px] border-amber-200 dark:border-amber-800 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={loadCredits}
            className="h-9 border-amber-200 dark:border-amber-800 gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Load
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

      {/* Info Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 animate-fade-in-up">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Opening Credits</strong> are used when shifting your existing business data to this system. Enter each Order Booker&apos;s outstanding credit per company. These will be used as the opening balance for calculations going forward.
          </p>
        </div>
      </div>

      {/* OB × Company Grid */}
      <Card className="card-hover animate-fade-in-up stagger-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            Credit Entry Grid — {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30">
                  <th className="sticky left-0 z-10 bg-white dark:bg-gray-950 px-3 py-2.5 text-left font-semibold text-amber-700 dark:text-amber-300 border-b border-r border-amber-200 dark:border-amber-800 min-w-[120px]">
                    Order Booker
                  </th>
                  {activeCos.map(co => (
                    <th key={co.id} className="px-2 py-2.5 text-center font-semibold text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 min-w-[110px]">
                      <div className="truncate" title={co.name}>{co.name}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 min-w-[100px] bg-amber-50/50 dark:bg-amber-950/20">
                    OB Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeOBs.map((ob, obIdx) => (
                  <tr key={ob.id} className={obIdx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/30'}>
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium border-r border-amber-200/50 dark:border-amber-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {ob.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[90px]" title={ob.name}>{ob.name}</span>
                      </div>
                    </td>
                    {activeCos.map(co => {
                      const key = `${ob.id}_${co.id}`;
                      return (
                        <td key={co.id} className="px-1.5 py-1.5">
                          <Input
                            type="number"
                            value={gridData[key] || ''}
                            onChange={(e) => handleCellChange(ob.id, co.id, e.target.value)}
                            placeholder="0"
                            className="h-8 text-xs text-center border-amber-200/50 dark:border-amber-800/50 focus:border-amber-400 dark:focus:border-amber-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                      {formatPKR(obTotals[ob.id] || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-amber-100/80 to-orange-100/80 dark:from-amber-900/30 dark:to-orange-900/30 font-bold">
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 text-amber-700 dark:text-amber-300 border-r border-t border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" />
                      Co Total
                    </div>
                  </td>
                  {activeCos.map(co => (
                    <td key={co.id} className="px-2 py-2.5 text-center text-amber-700 dark:text-amber-300 border-t border-amber-200 dark:border-amber-800">
                      {formatPKR(coTotals[co.id] || 0)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-amber-800 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/40 border-t border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-end gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {formatPKR(grandTotal)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grand Total Summary Card */}
      {grandTotal > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Opening Credits</span>
            </div>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">PKR {formatPKR(grandTotal)}</span>
          </div>
        </div>
      )}

      {/* Previously Saved Opening Credits */}
      <Card className="card-hover animate-fade-in-up stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-600" />
            Saved Opening Credits
            <Badge variant="outline" className="text-[10px] border-amber-200 dark:border-amber-800">
              {existingCredits.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full shimmer" />)}
              </div>
            ) : existingCredits.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No opening credits saved for this date</p>
                <p className="text-xs mt-1">Use the grid above to add opening credits</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold">Order Booker</th>
                    <th className="px-3 py-2 text-left font-semibold">Company</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount (PKR)</th>
                    <th className="px-3 py-2 text-left font-semibold">Notes</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {existingCredits.map((credit, idx) => (
                    <tr key={credit.id} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                      <td className="px-3 py-2 font-medium">{credit.orderBooker.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{credit.company.name}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatPKR(credit.amount)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate" title={credit.notes || ''}>
                        {credit.notes || '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-amber-50 dark:hover:bg-amber-900/30" onClick={() => openEditDialog(credit)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Opening Credit</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete PKR {formatPKR(credit.amount)} opening credit for {credit.orderBooker.name} — {credit.company.name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(credit.id)} className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-600" />
              Edit Opening Credit
            </DialogTitle>
          </DialogHeader>
          {editCredit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-[10px] text-muted-foreground uppercase">Order Booker</Label>
                  <p className="text-sm font-semibold">{editCredit.orderBooker.name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-[10px] text-muted-foreground uppercase">Company</Label>
                  <p className="text-sm font-semibold">{editCredit.company.name}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Amount (PKR)</Label>
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="mt-1 h-9 border-amber-200 dark:border-amber-800"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Notes (optional)</Label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="mt-1 h-9 border-amber-200 dark:border-amber-800"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={saveEdit} className="h-9 bg-gradient-to-r from-emerald-600 to-emerald-500 gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
