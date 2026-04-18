'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2, CalendarIcon, Lock, Calculator, Save, RotateCcw, Info, ArrowRight,
  CheckCircle2, ClipboardList, Wallet, Scale, Layers, FilePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderBooker {
  id: string;
  name: string;
  phone?: string;
}

interface Company {
  id: string;
  name: string;
  category?: string;
}

interface EntryFormProps {
  editEntry?: {
    id: string;
    date: string;
    orderBookerId: string;
    companyId: string;
    openingBalance: number;
    summaryAmount: number;
    stockReturn: number;
    postedSummary: number;
    cashReceived: number;
    creditPosted: number;
    claimCleared: number;
    oldRecovery: number;
    returnStockClaimByOB: number;
    totalRecovery: number;
    closingBalance: number;
    notes?: string;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

interface BulkEntryRow {
  companyId: string;
  companyName: string;
  category?: string;
  summaryAmount: number;
  stockReturn: number;
  cashReceived: number;
  claimCleared: number;
  oldRecovery: number;
  returnStockClaimByOB: number;
}

export default function EntryForm({ editEntry, onSuccess, onCancel }: EntryFormProps) {
  const [orderBookers, setOrderBookers] = useState<OrderBooker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  const [date, setDate] = useState<Date>(editEntry ? new Date(editEntry.date) : new Date());
  const [orderBookerId, setOrderBookerId] = useState(editEntry?.orderBookerId || '');
  const [companyId, setCompanyId] = useState(editEntry?.companyId || '');
  const [openingBalance, setOpeningBalance] = useState(editEntry?.openingBalance || 0);
  const [summaryAmount, setSummaryAmount] = useState(editEntry?.summaryAmount || 0);
  const [stockReturn, setStockReturn] = useState(editEntry?.stockReturn || 0);
  const [cashReceived, setCashReceived] = useState(editEntry?.cashReceived || 0);
  const [claimCleared, setClaimCleared] = useState(editEntry?.claimCleared || 0);
  const [oldRecovery, setOldRecovery] = useState(editEntry?.oldRecovery || 0);
  const [returnStockClaimByOB, setReturnStockClaimByOB] = useState(editEntry?.returnStockClaimByOB || 0);
  const [notes, setNotes] = useState(editEntry?.notes || '');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkEntryRow[]>([]);

  // Computed values (single mode) — NEW FORMULA
  // Credit Posted = Summary - Stock Return - Cash Received
  // Closing Balance = Opening - Old Recovery - Claim Cleared - Return Stock/Claim by OB + Credit Posted
  const postedSummary = summaryAmount - stockReturn;
  const creditPosted = postedSummary - cashReceived;
  const totalRecovery = cashReceived + oldRecovery + claimCleared + returnStockClaimByOB;
  const closingBalance = openingBalance - oldRecovery - claimCleared - returnStockClaimByOB + creditPosted;

  // Step completion logic
  const step1Complete = !!(orderBookerId && companyId);
  const step2Complete = !!(summaryAmount > 0 || stockReturn > 0 || cashReceived > 0);
  const step3Complete = step1Complete && step2Complete;

  const fetchRefs = useCallback(async () => {
    setLoadingRefs(true);
    try {
      const [obRes, coRes] = await Promise.all([
        fetch('/api/order-bookers'),
        fetch('/api/companies'),
      ]);
      if (obRes.ok) {
        const obData = await obRes.json();
        setOrderBookers(obData.orderBookers || []);
      }
      if (coRes.ok) {
        const coData = await coRes.json();
        setCompanies(coData.companies || []);
      }
    } catch {
      toast.error('Failed to load reference data');
    } finally {
      setLoadingRefs(false);
    }
  }, []);

  useEffect(() => {
    fetchRefs();
  }, [fetchRefs]);

  // Initialize bulk rows when companies are loaded or when entering bulk mode
  useEffect(() => {
    if (bulkMode && companies.length > 0 && bulkRows.length === 0) {
      setBulkRows(companies.map(co => ({
        companyId: co.id,
        companyName: co.name,
        category: co.category,
        summaryAmount: 0,
        stockReturn: 0,
        cashReceived: 0,
        claimCleared: 0,
        oldRecovery: 0,
        returnStockClaimByOB: 0,
      })));
    }
  }, [bulkMode, companies, bulkRows.length]);

  // Auto-fetch opening balance when OB/Company/Date changes (single mode)
  useEffect(() => {
    if (!editEntry && !bulkMode && orderBookerId && companyId) {
      const fetchOpening = async () => {
        try {
          const params = new URLSearchParams({
            dateFrom: format(date, 'yyyy-MM-dd'),
            dateTo: format(date, 'yyyy-MM-dd'),
            orderBookerId,
            companyId,
          });
          const res = await fetch(`/api/entries?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const entries = data.entries || [];
            if (entries.length > 0) {
              const sorted = [...entries].sort((a: { date: string }, b: { date: string }) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              setOpeningBalance(sorted[0].closingBalance || 0);
            } else {
              setOpeningBalance(0);
            }
          }
        } catch {
          // silently fail
        }
      };
      fetchOpening();
    }
  }, [orderBookerId, companyId, date, editEntry, bulkMode]);

  const handleSave = async () => {
    if (!orderBookerId) {
      toast.error('Please select an Order Booker');
      triggerErrorShake();
      return;
    }

    if (bulkMode) {
      await handleBulkSave();
      return;
    }

    if (!companyId) {
      toast.error('Please select a Company');
      triggerErrorShake();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: format(date, 'yyyy-MM-dd'),
        orderBookerId,
        companyId,
        summaryAmount,
        stockReturn,
        cashReceived,
        claimCleared,
        oldRecovery,
        returnStockClaimByOB,
        notes: notes || undefined,
      };

      let res: Response;
      if (editEntry) {
        res = await fetch(`/api/entries/${editEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1200);
        setErrorShake(false);
        toast.success(editEntry ? 'Entry updated successfully' : 'Entry created successfully');
        if (!editEntry) {
          setSummaryAmount(0);
          setStockReturn(0);
          setCashReceived(0);
          setClaimCleared(0);
          setOldRecovery(0);
          setReturnStockClaimByOB(0);
          setNotes('');
          setOpeningBalance(closingBalance);
        }
        onSuccess?.();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save entry');
        triggerErrorShake();
      }
    } catch {
      toast.error('Failed to save entry');
      triggerErrorShake();
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    const nonZeroRows = bulkRows.filter(r => r.summaryAmount > 0 || r.stockReturn > 0 || r.cashReceived > 0 || r.claimCleared > 0 || r.oldRecovery > 0 || r.returnStockClaimByOB > 0);

    if (nonZeroRows.length === 0) {
      toast.error('Please enter data for at least one company');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of nonZeroRows) {
      try {
        const payload = {
          date: format(date, 'yyyy-MM-dd'),
          orderBookerId,
          companyId: row.companyId,
          summaryAmount: row.summaryAmount,
          stockReturn: row.stockReturn,
          cashReceived: row.cashReceived,
          claimCleared: row.claimCleared,
          oldRecovery: row.oldRecovery,
          returnStockClaimByOB: row.returnStockClaimByOB,
        };

        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          const err = await res.json();
          console.error(`Failed for ${row.companyName}:`, err.error);
        }
      } catch {
        failCount++;
      }
    }

    setSaving(false);

    if (successCount > 0) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1200);
      toast.success(`${successCount} entr${successCount === 1 ? 'y' : 'ies'} created successfully${failCount > 0 ? `, ${failCount} failed (may already exist)` : ''}`);
      // Reset bulk rows
      setBulkRows(prev => prev.map(r => ({ ...r, summaryAmount: 0, stockReturn: 0, cashReceived: 0, claimCleared: 0, oldRecovery: 0, returnStockClaimByOB: 0 })));
      onSuccess?.();
    } else {
      toast.error('Failed to create any entries. They may already exist for this date.');
    }
  };

  const triggerErrorShake = () => {
    setErrorShake(true);
    setTimeout(() => setErrorShake(false), 400);
  };

  const handleReset = () => {
    setSummaryAmount(0);
    setStockReturn(0);
    setCashReceived(0);
    setClaimCleared(0);
    setOldRecovery(0);
    setReturnStockClaimByOB(0);
    setNotes('');
    setOpeningBalance(0);
    setOrderBookerId('');
    setCompanyId('');
    setDate(new Date());
    setBulkRows(prev => prev.map(r => ({ ...r, summaryAmount: 0, stockReturn: 0, cashReceived: 0, claimCleared: 0, oldRecovery: 0, returnStockClaimByOB: 0 })));
  };

  const updateBulkRow = (companyId: string, field: keyof BulkEntryRow, value: number) => {
    setBulkRows(prev => prev.map(r => r.companyId === companyId ? { ...r, [field]: value } : r));
  };

  const numField = (label: string, sublabel: string, value: number, onChange: (v: number) => void, editable = true, hasError = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        {label}
        {!editable && <Lock className="w-3 h-3 text-muted-foreground/50" />}
        <span className="text-[10px] text-muted-foreground font-normal">{sublabel}</span>
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          PKR
        </span>
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          readOnly={!editable}
          className={`${!editable ? 'pl-12 bg-muted/50 border-dashed font-mono text-muted-foreground' : 'pl-12 font-mono'} h-10 transition-colors ${hasError ? 'error-field' : ''}`}
        />
      </div>
    </div>
  );

  // Bulk mode summary
  const bulkTotalSales = bulkRows.reduce((s, r) => s + r.summaryAmount, 0);
  const bulkTotalCash = bulkRows.reduce((s, r) => s + r.cashReceived, 0);
  const bulkTotalStockReturn = bulkRows.reduce((s, r) => s + r.stockReturn, 0);
  const bulkTotalClaimCleared = bulkRows.reduce((s, r) => s + r.claimCleared, 0);
  const bulkTotalOldRecovery = bulkRows.reduce((s, r) => s + r.oldRecovery, 0);
  const bulkTotalReturnByOB = bulkRows.reduce((s, r) => s + r.returnStockClaimByOB, 0);
  const bulkNonZero = bulkRows.filter(r => r.summaryAmount > 0 || r.stockReturn > 0 || r.cashReceived > 0 || r.claimCleared > 0 || r.oldRecovery > 0 || r.returnStockClaimByOB > 0).length;

  if (loadingRefs) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-4 md:p-6 transition-all duration-300 ${saveSuccess ? 'success-flash' : ''} ${errorShake ? 'error-shake' : ''}`}>
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {editEntry ? 'Edit Entry' : 'New Entry'}
          </h1>
          {saveSuccess && (
            <span className="success-checkmark inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {editEntry ? 'Update the distribution entry details' : 'Record a new distribution entry'}
        </p>
      </div>

      {/* Bulk Mode Toggle (only for new entries) */}
      {!editEntry && (
        <Card className="animate-fade-in-up stagger-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bulkMode ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted/50'}`}>
                  <Layers className={`w-4 h-4 ${bulkMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Bulk Mode</p>
                  <p className="text-[10px] text-muted-foreground">Enter data for multiple companies at once for the same OB</p>
                </div>
              </div>
              <Switch
                checked={bulkMode}
                onCheckedChange={(checked) => {
                  setBulkMode(checked);
                  if (checked) {
                    setBulkRows(companies.map(co => ({
                      companyId: co.id,
                      companyName: co.name,
                      category: co.category,
                      summaryAmount: 0,
                      stockReturn: 0,
                      cashReceived: 0,
                      claimCleared: 0,
                      oldRecovery: 0,
                      returnStockClaimByOB: 0,
                    })));
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Indicators (only single mode) */}
      {!bulkMode && (
        <div className="flex items-center gap-0 animate-fade-in-up stagger-1 px-2">
          <div className="flex items-center gap-2">
            <div className={`step-indicator ${step1Complete ? 'active' : 'inactive'}`}>
              {step1Complete ? <CheckCircle2 className="w-4 h-4" /> : <span>1</span>}
            </div>
            <div className="hidden sm:block">
              <p className={`text-xs font-semibold ${step1Complete ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>Identification</p>
              <p className="text-[10px] text-muted-foreground">Date, OB & Company</p>
            </div>
          </div>

          <div className={`step-connector ${step1Complete ? 'active' : ''} mx-3`} />

          <div className="flex items-center gap-2">
            <div className={`step-indicator ${step2Complete ? 'active' : step1Complete ? 'active' : 'inactive'}`}>
              {step2Complete ? <CheckCircle2 className="w-4 h-4" /> : <span>2</span>}
            </div>
            <div className="hidden sm:block">
              <p className={`text-xs font-semibold ${step2Complete ? 'text-emerald-700 dark:text-emerald-300' : step1Complete ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>Transactions</p>
              <p className="text-[10px] text-muted-foreground">Amounts & Recovery</p>
            </div>
          </div>

          <div className={`step-connector ${step2Complete ? 'active' : ''} mx-3`} />

          <div className="flex items-center gap-2">
            <div className={`step-indicator ${step3Complete ? 'active' : 'inactive'}`}>
              {step3Complete ? <CheckCircle2 className="w-4 h-4" /> : <span>3</span>}
            </div>
            <div className="hidden sm:block">
              <p className={`text-xs font-semibold ${step3Complete ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>Review & Save</p>
              <p className="text-[10px] text-muted-foreground">Verify & Submit</p>
            </div>
          </div>
        </div>
      )}

      {/* ============= BULK MODE ============= */}
      {bulkMode ? (
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Bulk Entry - All Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date and OB selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left gap-2 h-10">
                      <CalendarIcon className="w-4 h-4" />
                      {format(date, 'MMMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        if (d) setDate(d);
                        setCalendarOpen(false);
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Order Booker *</Label>
                <Select value={orderBookerId} onValueChange={setOrderBookerId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select OB" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderBookers.map((ob) => (
                      <SelectItem key={ob.id} value={ob.id}>
                        {ob.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Bulk summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Companies</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{bulkNonZero} / {bulkRows.length}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sales</p>
                <p className="text-sm font-bold">{formatPKR(bulkTotalSales)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Cash</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(bulkTotalCash)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stock Return</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">({formatPKR(bulkTotalStockReturn)})</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Claim Cleared</p>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatPKR(bulkTotalClaimCleared)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Old Recovery</p>
                <p className="text-sm font-bold text-sky-600 dark:text-sky-400">{formatPKR(bulkTotalOldRecovery)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Return by OB</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">({formatPKR(bulkTotalReturnByOB)})</p>
              </div>
            </div>

            {/* Bulk entry table */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar border rounded-lg">
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Company</TableHead>
                    <TableHead className="text-right">Summary</TableHead>
                    <TableHead className="text-right">Stock Return</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Claim Clr</TableHead>
                    <TableHead className="text-right">Old Rec.</TableHead>
                    <TableHead className="text-right">Ret by OB</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkRows.map((row) => {
                    const net = row.summaryAmount - row.stockReturn - row.cashReceived - row.claimCleared - row.oldRecovery - row.returnStockClaimByOB;
                    const hasData = row.summaryAmount > 0 || row.stockReturn > 0 || row.cashReceived > 0 || row.claimCleared > 0 || row.oldRecovery > 0 || row.returnStockClaimByOB > 0;
                    return (
                      <TableRow key={row.companyId} className={hasData ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            <span className="truncate">{row.companyName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" value={row.summaryAmount || ''} onChange={(e) => updateBulkRow(row.companyId, 'summaryAmount', Number(e.target.value) || 0)} className="h-8 text-right font-mono text-xs w-24 ml-auto" placeholder="0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" value={row.stockReturn || ''} onChange={(e) => updateBulkRow(row.companyId, 'stockReturn', Number(e.target.value) || 0)} className="h-8 text-right font-mono text-xs w-24 ml-auto" placeholder="0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" value={row.cashReceived || ''} onChange={(e) => updateBulkRow(row.companyId, 'cashReceived', Number(e.target.value) || 0)} className="h-8 text-right font-mono text-xs w-24 ml-auto" placeholder="0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" value={row.claimCleared || ''} onChange={(e) => updateBulkRow(row.companyId, 'claimCleared', Number(e.target.value) || 0)} className="h-8 text-right font-mono text-xs w-20 ml-auto" placeholder="0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" value={row.oldRecovery || ''} onChange={(e) => updateBulkRow(row.companyId, 'oldRecovery', Number(e.target.value) || 0)} className="h-8 text-right font-mono text-xs w-24 ml-auto" placeholder="0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" value={row.returnStockClaimByOB || ''} onChange={(e) => updateBulkRow(row.companyId, 'returnStockClaimByOB', Number(e.target.value) || 0)} className="h-8 text-right font-mono text-xs w-20 ml-auto" placeholder="0" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={net > 0 ? 'destructive' : 'default'}
                            className={`text-[10px] font-mono ${net <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0' : ''}`}
                          >
                            {net.toLocaleString()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="h-9">
                  Cancel
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} disabled={saving} className="h-9 gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !orderBookerId || bulkNonZero === 0}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving {bulkNonZero} entries...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save {bulkNonZero} {bulkNonZero === 1 ? 'Entry' : 'Entries'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ============= SINGLE MODE ============= */
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Entry Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Identification - Date, OB, Company */}
            <div className="section-sales pl-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Step 1: Identification</h3>
                {step1Complete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left gap-2 h-10">
                        <CalendarIcon className="w-4 h-4" />
                        {format(date, 'MMMM dd, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          if (d) setDate(d);
                          setCalendarOpen(false);
                        }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Order Booker {!orderBookerId && errorShake ? <span className="text-red-500">*</span> : ''}</Label>
                  <Select value={orderBookerId} onValueChange={setOrderBookerId}>
                    <SelectTrigger className={`h-10 ${!orderBookerId && errorShake ? 'glow-red border-red-400 dark:border-red-600' : ''}`}>
                      <SelectValue placeholder="Select OB" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderBookers.map((ob) => (
                        <SelectItem key={ob.id} value={ob.id}>
                          {ob.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Company {!companyId && errorShake ? <span className="text-red-500">*</span> : ''}</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className={`h-10 ${!companyId && errorShake ? 'glow-red border-red-400 dark:border-red-600' : ''}`}>
                      <SelectValue placeholder="Select Company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((co) => (
                        <SelectItem key={co.id} value={co.id}>
                          {co.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 2: Sales & Calculation */}
            <div className="section-recovery pl-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-200">Step 2: Sales & Summary</h3>
                {step2Complete && <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {numField('Opening Balance', 'Auto-fetched from previous', openingBalance, setOpeningBalance, false)}
                {numField('Summary Amount', 'Khulasa / Today Supply', summaryAmount, setSummaryAmount)}
                {numField('Stock Return / Claims', 'Wapsi', stockReturn, setStockReturn)}
              </div>

              {/* Calculation arrow: Summary - Stock Return = Posted Summary */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                  <Badge variant="outline" className="font-mono text-[10px]">{formatPKR(summaryAmount)}</Badge>
                  <span className="text-muted-foreground/60">-</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{formatPKR(stockReturn)}</Badge>
                  <ArrowRight className="w-4 h-4 text-emerald-500 flow-arrow" />
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-mono text-[10px] border-0">
                    Posted: {formatPKR(postedSummary)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {numField('Posted Summary', 'Computed', postedSummary, () => {}, false)}
                {numField('Cash Received', 'Naqd Wasooli / Summary Cash', cashReceived, setCashReceived)}
                {numField('Credit Posted', 'Udhaar (Posted - Cash)', creditPosted, () => {}, false)}
              </div>
            </div>

            <Separator />

            {/* Step 3: Balance & Recovery — NEW FIELDS */}
            <div className="section-balance pl-4">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Step 3: Recovery & Adjustments</h3>
                {step3Complete && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {numField('Old Recovery', 'Sabqa Wasooli / Previous Recovery', oldRecovery, setOldRecovery)}
                {numField('Claim Cleared', 'Sabka Wasooli / Daawa Khata', claimCleared, setClaimCleared)}
                {numField('Return/Claim by OB', 'OB ki taraf sy wapsi/claim', returnStockClaimByOB, setReturnStockClaimByOB)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {numField('Total Recovery', 'Cash + Old Rec + Claim Clr + Ret by OB', totalRecovery, () => {}, false)}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="min-h-[40px] resize-none h-10"
                    rows={1}
                  />
                </div>
              </div>
            </div>

            {/* Calculation Summary - Enhanced with new formula */}
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Calculation Summary
              </h4>
              
              {/* Credit Posted Flow */}
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/40 dark:bg-black/10 text-[10px] flex-wrap">
                <span className="font-mono font-medium">{formatPKR(summaryAmount)}</span>
                <span className="text-muted-foreground">summary</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono font-medium">{formatPKR(stockReturn)}</span>
                <span className="text-muted-foreground">returns</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono font-medium">{formatPKR(cashReceived)}</span>
                <span className="text-muted-foreground">cash</span>
                <ArrowRight className="w-3 h-3 text-emerald-500 flow-arrow" />
                <span className="font-mono font-bold text-red-600 dark:text-red-400">Credit: {formatPKR(creditPosted)}</span>
              </div>

              {/* Closing Balance Flow */}
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/40 dark:bg-black/10 text-[10px] flex-wrap">
                <span className="font-mono font-medium">{formatPKR(openingBalance)}</span>
                <span className="text-muted-foreground">opening</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono font-medium">{formatPKR(oldRecovery)}</span>
                <span className="text-muted-foreground">old rec</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono font-medium">{formatPKR(claimCleared)}</span>
                <span className="text-muted-foreground">claim</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono font-medium">{formatPKR(returnStockClaimByOB)}</span>
                <span className="text-muted-foreground">ret by OB</span>
                <span className="text-muted-foreground">+</span>
                <span className="font-mono font-medium text-red-600 dark:text-red-400">{formatPKR(creditPosted)}</span>
                <span className="text-muted-foreground">credit</span>
                <ArrowRight className="w-3 h-3 text-emerald-500 flow-arrow" />
                <span className={`font-mono font-bold ${closingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  Closing: {formatPKR(closingBalance)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="calc-group border-l-[3px] border-emerald-500">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Posted Summary</p>
                  <p className="text-sm font-mono font-bold mt-0.5">{formatPKR(postedSummary)}</p>
                </div>
                <div className="calc-group border-l-[3px] border-red-500">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Credit Posted</p>
                  <p className="text-sm font-mono font-bold mt-0.5 text-red-600 dark:text-red-400">{formatPKR(creditPosted)}</p>
                </div>
                <div className="calc-group border-l-[3px] border-sky-500">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Total Recovery</p>
                  <p className="text-sm font-mono font-bold mt-0.5 text-sky-600 dark:text-sky-400">{formatPKR(totalRecovery)}</p>
                </div>
                <div className="calc-group border-l-[3px] border-orange-500">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Total Deductions</p>
                  <p className="text-sm font-mono font-bold mt-0.5 text-orange-600 dark:text-orange-400">{formatPKR(oldRecovery + claimCleared + returnStockClaimByOB)}</p>
                </div>
                <div className={`calc-group border-l-[3px] ${closingBalance > 0 ? 'border-red-500 glow-red' : 'border-emerald-500 glow-emerald'}`}>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Closing Balance</p>
                  <p className={`text-sm font-mono font-bold mt-0.5 ${closingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatPKR(closingBalance)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Credit = Summary - Stock Return - Cash. Closing = Opening - Old Recovery - Claim Cleared - Return/Claim by OB + Credit. Positive balance means outstanding credit.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="h-9">
                  Cancel
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} disabled={saving} className="h-9 gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !step1Complete}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 btn-glow font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editEntry ? 'Update Entry' : 'Save Entry'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
