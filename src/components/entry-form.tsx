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
import { Loader2, CalendarIcon, Lock, Calculator, Save, RotateCcw } from 'lucide-react';
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
    oldRecovery: number;
    closingBalance: number;
    notes?: string;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EntryForm({ editEntry, onSuccess, onCancel }: EntryFormProps) {
  const [orderBookers, setOrderBookers] = useState<OrderBooker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState<Date>(editEntry ? new Date(editEntry.date) : new Date());
  const [orderBookerId, setOrderBookerId] = useState(editEntry?.orderBookerId || '');
  const [companyId, setCompanyId] = useState(editEntry?.companyId || '');
  const [openingBalance, setOpeningBalance] = useState(editEntry?.openingBalance || 0);
  const [summaryAmount, setSummaryAmount] = useState(editEntry?.summaryAmount || 0);
  const [stockReturn, setStockReturn] = useState(editEntry?.stockReturn || 0);
  const [cashReceived, setCashReceived] = useState(editEntry?.cashReceived || 0);
  const [oldRecovery, setOldRecovery] = useState(editEntry?.oldRecovery || 0);
  const [notes, setNotes] = useState(editEntry?.notes || '');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Computed values (displayed to user, but server calculates the actual ones)
  const postedSummary = summaryAmount - stockReturn;
  const creditPosted = postedSummary - cashReceived;
  const closingBalance = openingBalance - oldRecovery + creditPosted;

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

  // Auto-fetch opening balance when OB/Company/Date changes
  useEffect(() => {
    if (!editEntry && orderBookerId && companyId) {
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
  }, [orderBookerId, companyId, date, editEntry]);

  const handleSave = async () => {
    if (!orderBookerId) {
      toast.error('Please select an Order Booker');
      return;
    }
    if (!companyId) {
      toast.error('Please select a Company');
      return;
    }

    setSaving(true);
    try {
      // Only send the fields the API expects - it calculates openingBalance, postedSummary, creditPosted, closingBalance
      const payload = {
        date: format(date, 'yyyy-MM-dd'),
        orderBookerId,
        companyId,
        summaryAmount,
        stockReturn,
        cashReceived,
        oldRecovery,
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
        toast.success(editEntry ? 'Entry updated successfully' : 'Entry created successfully');
        if (!editEntry) {
          setSummaryAmount(0);
          setStockReturn(0);
          setCashReceived(0);
          setOldRecovery(0);
          setNotes('');
          setOpeningBalance(closingBalance);
        }
        onSuccess?.();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save entry');
      }
    } catch {
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSummaryAmount(0);
    setStockReturn(0);
    setCashReceived(0);
    setOldRecovery(0);
    setNotes('');
    setOpeningBalance(0);
    setOrderBookerId('');
    setCompanyId('');
    setDate(new Date());
  };

  const numField = (label: string, value: number, onChange: (v: number) => void, editable = true) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        {!editable && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          readOnly={!editable}
          className={`${!editable ? 'pl-9 bg-muted/50 border-dashed font-mono' : 'font-mono'}`}
        />
      </div>
    </div>
  );

  if (loadingRefs) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">
          {editEntry ? 'Edit Entry' : 'New Entry'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {editEntry ? 'Update the distribution entry details' : 'Record a new distribution entry'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Entry Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Date, OB, Company */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left gap-2">
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Order Booker</Label>
              <Select value={orderBookerId} onValueChange={setOrderBookerId}>
                <SelectTrigger>
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
              <Label className="text-xs font-medium">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
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

          <Separator />

          {/* Row 2: Opening Balance (auto), Summary Amount, Stock Return */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {numField('Opening Balance', openingBalance, setOpeningBalance, false)}
            {numField('Summary Amount', summaryAmount, setSummaryAmount)}
            {numField('Stock Return / Claims', stockReturn, setStockReturn)}
          </div>

          {/* Row 3: Posted Summary (auto), Cash Received, Credit Posted (auto) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {numField('Posted Summary', postedSummary, () => {}, false)}
            {numField('Cash Received', cashReceived, setCashReceived)}
            {numField('Credit Posted', creditPosted, () => {}, false)}
          </div>

          <Separator />

          {/* Row 4: Old Recovery, Closing Balance (auto) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {numField('Old Recovery (Sabiqa Wasooli)', oldRecovery, setOldRecovery)}
            {numField('Closing Balance', closingBalance, () => {}, false)}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="min-h-[40px] resize-none"
                rows={1}
              />
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculation Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Posted Summary:</span>
                <span className="ml-1 font-mono font-bold">PKR {postedSummary.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Credit Posted:</span>
                <span className="ml-1 font-mono font-bold">PKR {creditPosted.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Old Recovery:</span>
                <span className="ml-1 font-mono font-bold">PKR {oldRecovery.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Closing Balance:</span>
                <span className={`ml-1 font-mono font-bold ${closingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  PKR {closingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
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
    </div>
  );
}
