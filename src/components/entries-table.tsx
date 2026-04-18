'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Edit, Trash2, Search, RefreshCw, Filter, FileSpreadsheet, SortAsc, SortDesc, TrendingUp, TrendingDown, AlertTriangle, Copy, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckSquare, Square, Trash2 as TrashMultiple, Calculator, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EntryForm from '@/components/entry-form';

interface Entry {
  id: string;
  date: string;
  orderBookerId: string;
  orderBookerName: string;
  companyId: string;
  companyName: string;
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
}

interface OrderBooker { id: string; name: string; }
interface Company { id: string; name: string; }

export default function EntriesTable() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [orderBookers, setOrderBookers] = useState<OrderBooker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: now };
  });
  const [filterOB, setFilterOB] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Expandable rows
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Duplicate entry
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState<Entry | null>(null);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set('dateFrom', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.set('dateTo', format(dateRange.to, 'yyyy-MM-dd'));
      if (filterOB && filterOB !== 'all') params.set('orderBookerId', filterOB);
      if (filterCompany && filterCompany !== 'all') params.set('companyId', filterCompany);
      const res = await fetch(`/api/entries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [dateRange, filterOB, filterCompany]);

  const fetchRefs = useCallback(async () => {
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
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRefs();
  }, [fetchRefs]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Entry deleted successfully');
        fetchEntries();
      } else {
        toast.error('Failed to delete entry');
      }
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const handleDuplicate = (entry: Entry) => {
    setDuplicateEntry(entry);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateSave = async () => {
    if (!duplicateEntry) return;
    try {
      const payload = {
        date: format(new Date(), 'yyyy-MM-dd'),
        orderBookerId: duplicateEntry.orderBookerId,
        companyId: duplicateEntry.companyId,
        summaryAmount: duplicateEntry.summaryAmount,
        stockReturn: duplicateEntry.stockReturn,
        cashReceived: duplicateEntry.cashReceived,
        claimCleared: duplicateEntry.claimCleared,
        oldRecovery: duplicateEntry.oldRecovery,
        returnStockClaimByOB: duplicateEntry.returnStockClaimByOB,
        notes: duplicateEntry.notes ? `[Copy] ${duplicateEntry.notes}` : '[Copy] Duplicated entry',
      };
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Entry duplicated successfully');
        setDuplicateDialogOpen(false);
        setDuplicateEntry(null);
        fetchEntries();
      } else {
        toast.error('Failed to duplicate entry');
      }
    } catch {
      toast.error('Failed to duplicate entry');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'OB Name', 'Company', 'Opening Balance', 'Summary', 'Stock Return', 'Posted Summary', 'Cash', 'Credit', 'Claim Cleared', 'Old Recovery', 'Ret by OB', 'Total Recovery', 'Closing Balance', 'Credit Formula', 'Closing Formula'];
    const rows = sortedEntries.map((e) => {
      const creditCalc = `Summary(${e.summaryAmount}) - StkRet(${e.stockReturn}) - Cash(${e.cashReceived})`;
      const closingCalc = `Opening(${e.openingBalance}) - OldRec(${e.oldRecovery}) - Claim(${e.claimCleared}) - RetOB(${e.returnStockClaimByOB}) + Credit(${e.creditPosted})`;
      return [
        typeof e.date === 'string' ? e.date.split('T')[0] : e.date,
        e.orderBookerName || '',
        e.companyName || '',
        e.openingBalance,
        e.summaryAmount,
        e.stockReturn,
        e.postedSummary,
        e.cashReceived,
        e.creditPosted,
        e.claimCleared,
        e.oldRecovery,
        e.returnStockClaimByOB,
        e.totalRecovery,
        e.closingBalance,
        creditCalc,
        closingCalc,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel-ready CSV exported with formula breakdown');
  };

  const sortedEntries = [...entries]
    .filter((e) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.orderBookerName?.toLowerCase().includes(q) ||
        e.companyName?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return String(date);
    }
  };

  // Summary stats — updated to use totalRecovery from entries
  const totalSales = sortedEntries.reduce((s, e) => s + e.summaryAmount, 0);
  const totalRecovery = sortedEntries.reduce((s, e) => s + (e.totalRecovery || 0), 0);
  const totalCashReceived = sortedEntries.reduce((s, e) => s + e.cashReceived, 0);
  const totalCredit = sortedEntries.reduce((s, e) => s + e.creditPosted, 0);
  const recoveryRate = totalSales > 0 ? (totalCashReceived / totalSales) * 100 : 0;

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    if (failCount === 0) {
      toast.success(`${successCount} entr${successCount === 1 ? 'y' : 'ies'} deleted successfully`);
    } else {
      toast.error(`Deleted ${successCount}, failed ${failCount}`);
    }
    fetchEntries();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedEntries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Pagination logic
  const totalPages = Math.ceil(sortedEntries.length / pageSize);
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterOB, filterCompany, dateRange]);

  // Get credit color class for row
  const getCreditRowClass = (credit: number) => {
    if (credit > 10000) return 'row-credit-high';
    if (credit > 0) return 'row-credit-medium';
    return 'row-credit-zero';
  };

  // Total columns count for colSpan (checkbox + status + 15 data cols + actions = 17)
  const TABLE_COL_COUNT = 17;

  return (
    <div className="space-y-6 p-4 md:p-6 section-gradient-entries min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Entries</h1>
          <p className="text-muted-foreground text-sm">View and manage all distribution entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={entries.length === 0} className="gap-2 h-9 border-emerald-200 dark:border-emerald-800 export-excel-btn">
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="animate-fade-in-up stagger-1">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Filters</span>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search OB, company, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                        </>
                      ) : (
                        format(dateRange.from, 'MMM dd, yyyy')
                      )
                    ) : (
                      'Date range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

              <Select value={filterOB} onValueChange={setFilterOB}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="All OBs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Order Bookers</SelectItem>
                  {orderBookers.map((ob) => (
                    <SelectItem key={ob.id} value={ob.id}>
                      {ob.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((co) => (
                    <SelectItem key={co.id} value={co.id}>
                      {co.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchEntries} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary */}
      {!loading && sortedEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Sales</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">PKR {totalSales.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-sky-50/80 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20 border border-sky-200/50 dark:border-sky-800/50">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50 shadow-sm">
              <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Recovery</p>
              <p className="text-sm font-bold text-sky-700 dark:text-sky-300">PKR {totalRecovery.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 shadow-sm">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Credit</p>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">PKR {totalCredit.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border border-orange-200/50 dark:border-orange-800/50">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Cash</p>
              <p className="text-sm font-bold text-orange-700 dark:text-orange-300">PKR {totalCashReceived.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 shadow-sm">
              {recoveryRate >= 70 ? <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Recovery Rate</p>
              <p className={`text-sm font-bold ${recoveryRate >= 70 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>{recoveryRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <Card className="animate-fade-in-up stagger-3">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{paginatedEntries.length}</span> of {sortedEntries.length} entries
              {totalPages > 1 && <span className="text-muted-foreground/60"> (Page {currentPage} of {totalPages})</span>}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            >
              {sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
              {sortDir === 'asc' ? 'Oldest first' : 'Newest first'}
            </Button>
          </div>
          <div className="max-h-[500px] overflow-auto custom-scrollbar">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full shimmer" />
                ))}
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">No entries found</p>
                <p className="text-sm mt-1">Try adjusting your filters or add a new entry</p>
              </div>
            ) : (
              <Table className="table-modern text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 w-8 px-1">
                      <button onClick={toggleSelectAll} className="flex items-center" aria-label={selectedIds.size === paginatedEntries.length ? 'Deselect all' : 'Select all'}>
                        {selectedIds.size === paginatedEntries.length && paginatedEntries.length > 0 ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 px-2">Date</TableHead>
                    <TableHead className="sticky top-0 z-10 px-2">OB Name</TableHead>
                    <TableHead className="sticky top-0 z-10 px-2">Company</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Opening</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Summary</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Stk Ret</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Posted</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Cash</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Credit</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Claim Clr</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Old Rec.</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Ret by OB</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Total Rec.</TableHead>
                    <TableHead className="text-center sticky top-0 z-10 px-1 w-8">Status</TableHead>
                    <TableHead className="text-right sticky top-0 z-10 px-1">Closing</TableHead>
                    <TableHead className="sticky top-0 z-10 px-1 no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <React.Fragment key={entry.id}>
                    <TableRow className={`transition-all duration-200 ${getCreditRowClass(entry.creditPosted)} ${expandedRow === entry.id ? 'row-expanded' : ''} ${selectedIds.has(entry.id) ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''} cursor-pointer table-row-hover`} onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>
                      <TableCell className="w-8 px-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(entry.id)} className="flex items-center" aria-label={selectedIds.has(entry.id) ? 'Deselect' : 'Select'}>
                          {selectedIds.has(entry.id) ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-medium px-2">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="font-medium text-xs px-2">
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-sm">
                            {entry.orderBookerName?.charAt(0) || '?'}
                          </div>
                          <span className="truncate max-w-[80px]">{entry.orderBookerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground px-2">
                        <span className="truncate max-w-[70px] block">{entry.companyName}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] px-1">
                        {entry.openingBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-medium px-1">
                        {entry.summaryAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-red-600 dark:text-red-400 px-1">
                        ({entry.stockReturn.toLocaleString()})
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-medium px-1">
                        {entry.postedSummary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-1">
                        {entry.cashReceived.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] px-1">
                        {entry.creditPosted.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-orange-600 dark:text-orange-400 px-1">
                        {entry.claimCleared.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-sky-600 dark:text-sky-400 px-1">
                        {entry.oldRecovery.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-purple-600 dark:text-purple-400 px-1">
                        {entry.returnStockClaimByOB.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-sky-700 dark:text-sky-300 font-semibold px-1">
                        {entry.totalRecovery.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center px-1" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                <span className={`balance-status-dot ${entry.closingBalance <= 0 ? 'positive' : 'negative'}`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="calc-preview-popover">
                              <div className="space-y-1">
                                <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Calculator className="w-3 h-3" /> Calculation Preview</p>
                                <div className="border-t border-emerald-200/30 dark:border-emerald-800/30 pt-1.5 space-y-0.5">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Credit Formula:</p>
                                  <div className="calc-preview-row">
                                    <span className="calc-preview-label">Summary</span>
                                    <span className="calc-preview-operator">−</span>
                                    <span className="calc-preview-value text-red-600 dark:text-red-400">{entry.stockReturn.toLocaleString()}</span>
                                    <span className="calc-preview-operator">−</span>
                                    <span className="calc-preview-value text-emerald-600 dark:text-emerald-400">{entry.cashReceived.toLocaleString()}</span>
                                    <span className="calc-preview-operator">=</span>
                                    <span className="calc-preview-result text-red-600 dark:text-red-400">{entry.creditPosted.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="border-t border-emerald-200/30 dark:border-emerald-800/30 pt-1.5 space-y-0.5">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Closing Formula:</p>
                                  <div className="calc-preview-row">
                                    <span className="calc-preview-label">Opening</span>
                                    <span className="calc-preview-operator">−</span>
                                    <span className="calc-preview-value text-sky-600 dark:text-sky-400">{entry.oldRecovery.toLocaleString()}</span>
                                    <span className="calc-preview-operator">−</span>
                                    <span className="calc-preview-value text-orange-600 dark:text-orange-400">{entry.claimCleared.toLocaleString()}</span>
                                    <span className="calc-preview-operator">−</span>
                                    <span className="calc-preview-value text-purple-600 dark:text-purple-400">{entry.returnStockClaimByOB.toLocaleString()}</span>
                                  </div>
                                  <div className="calc-preview-row">
                                    <span className="calc-preview-operator">+</span>
                                    <span className="calc-preview-label">Credit</span>
                                    <span className="calc-preview-operator">=</span>
                                    <span className={`calc-preview-result ${entry.closingBalance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{entry.closingBalance.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] px-1">
                        <Badge
                          variant={entry.closingBalance > 0 ? 'destructive' : 'default'}
                          className={`text-[10px] px-1 py-0 h-4 font-mono badge-animated badge-pulse ${entry.closingBalance <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0' : ''}`}
                        >
                          <span className={`status-dot ${entry.closingBalance > 0 ? 'risk' : 'active'}`}>
                            {entry.closingBalance.toLocaleString()}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="no-print px-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => handleEdit(entry)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 btn-duplicate" onClick={() => handleDuplicate(entry)} title="Duplicate entry">
                            <Copy className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this entry? This action cannot be undone and will affect balance calculations.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expandable Row Details */}
                    {expandedRow === entry.id && (
                      <TableRow>
                        <TableCell colSpan={TABLE_COL_COUNT} className="p-0 border-0">
                          <div className="expandable-row-wrapper expanded">
                          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/50 via-transparent to-sky-50/50 dark:from-emerald-950/20 dark:via-transparent dark:to-sky-950/20 border-b border-emerald-200/30 dark:border-emerald-800/30">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Posted Summary</p>
                                <p className="text-sm font-mono font-bold">{entry.postedSummary.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Stock Return</p>
                                <p className="text-sm font-mono font-bold text-red-600 dark:text-red-400">({entry.stockReturn.toLocaleString()})</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cash Received</p>
                                <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{entry.cashReceived.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Credit Posted</p>
                                <p className="text-sm font-mono font-bold text-red-600 dark:text-red-400">{entry.creditPosted.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Old Recovery</p>
                                <p className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400">{entry.oldRecovery.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Claim Cleared</p>
                                <p className="text-sm font-mono font-bold text-orange-600 dark:text-orange-400">{entry.claimCleared.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Return/Claim by OB</p>
                                <p className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">{entry.returnStockClaimByOB.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Recovery</p>
                                <p className="text-sm font-mono font-bold text-sky-700 dark:text-sky-300">{entry.totalRecovery.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Recovery Rate</p>
                                <p className={`text-sm font-mono font-bold ${entry.postedSummary > 0 ? ((entry.cashReceived / entry.postedSummary) * 100) >= 70 ? 'text-emerald-600 dark:text-emerald-400' : ((entry.cashReceived / entry.postedSummary) * 100) >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                  {entry.postedSummary > 0 ? ((entry.cashReceived / entry.postedSummary) * 100).toFixed(1) : '0.0'}%
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Closing Balance</p>
                                <p className={`text-sm font-mono font-bold ${entry.closingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{entry.closingBalance.toLocaleString()}</p>
                              </div>
                            </div>
                            {entry.notes && (
                              <div className="mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-800/30">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Notes</p>
                                <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                              </div>
                            )}
                          </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {/* Pagination Controls */}
          {!loading && sortedEntries.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ml-2">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedEntries.length)} of {sortedEntries.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-3 h-3" />
                  <ChevronLeft className="w-3 h-3 -ml-1.5" />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-3 h-3" />
                  <ChevronRight className="w-3 h-3 -ml-1.5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Bulk Delete Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 bg-red-600 text-white rounded-xl px-5 py-3 shadow-xl shadow-red-200/50 dark:shadow-red-900/40">
            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
            <div className="w-px h-5 bg-red-400/50" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-white hover:bg-red-700 hover:text-white"
                  disabled={bulkDeleting}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} entr${selectedIds.size === 1 ? 'y' : 'ies'}`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bulk Delete Entries</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'}? This action cannot be undone and will affect balance calculations for all related order booker and company combinations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    Delete {selectedIds.size} {selectedIds.size === 1 ? 'Entry' : 'Entries'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-red-700 hover:text-white"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Edit Entry
            </DialogTitle>
            <DialogDescription>Update the entry details below</DialogDescription>
          </DialogHeader>
          {editEntry && (
            <>
              {/* Formula Preview */}
              <div className="edit-formula-preview space-y-1.5 animate-fade-scale">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1"><Info className="w-3 h-3" /> Current Calculations</p>
                <div className="edit-formula-row">
                  <span className="text-muted-foreground">Credit =</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{(editEntry.summaryAmount ?? 0).toLocaleString()}</span>
                  <span className="text-red-600 dark:text-red-400">− {(editEntry.stockReturn ?? 0).toLocaleString()}</span>
                  <span className="text-sky-600 dark:text-sky-400">− {(editEntry.cashReceived ?? 0).toLocaleString()}</span>
                  <span className="font-bold text-red-700 dark:text-red-300">= {(editEntry.creditPosted ?? 0).toLocaleString()}</span>
                </div>
                <div className="edit-formula-row">
                  <span className="text-muted-foreground">Closing =</span>
                  <span className="text-amber-600 dark:text-amber-400">{(editEntry.openingBalance ?? 0).toLocaleString()}</span>
                  <span className="text-sky-600 dark:text-sky-400">− {(editEntry.oldRecovery ?? 0).toLocaleString()}</span>
                  <span className="text-orange-600 dark:text-orange-400">− {(editEntry.claimCleared ?? 0).toLocaleString()}</span>
                  <span className="text-purple-600 dark:text-purple-400">− {(editEntry.returnStockClaimByOB ?? 0).toLocaleString()}</span>
                  <span className="text-red-600 dark:text-red-400">+ {(editEntry.creditPosted ?? 0).toLocaleString()}</span>
                </div>
                <div className="edit-formula-result">
                  <span className="text-muted-foreground">Closing Balance = </span>
                  <span className={(editEntry.closingBalance ?? 0) <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {(editEntry.closingBalance ?? 0).toLocaleString()}
                  </span>
                  <span className={`ml-2 inline-block w-2 h-2 rounded-full ${(editEntry.closingBalance ?? 0) <= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              </div>
              <EntryForm
                editEntry={{
                  id: editEntry.id,
                  date: typeof editEntry.date === 'string' ? editEntry.date.split('T')[0] : String(editEntry.date),
                  orderBookerId: editEntry.orderBookerId,
                  companyId: editEntry.companyId,
                  openingBalance: editEntry.openingBalance,
                  summaryAmount: editEntry.summaryAmount,
                  stockReturn: editEntry.stockReturn,
                  postedSummary: editEntry.postedSummary,
                  cashReceived: editEntry.cashReceived,
                  creditPosted: editEntry.creditPosted,
                  claimCleared: editEntry.claimCleared,
                  oldRecovery: editEntry.oldRecovery,
                  returnStockClaimByOB: editEntry.returnStockClaimByOB,
                  totalRecovery: editEntry.totalRecovery,
                  closingBalance: editEntry.closingBalance,
                  notes: editEntry.notes,
                }}
                onSuccess={() => {
                  setEditDialogOpen(false);
                  setEditEntry(null);
                  fetchEntries();
                }}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setEditEntry(null);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Entry</DialogTitle>
            <DialogDescription>
              This will create a copy of the entry with today&apos;s date. Review the details below and confirm.
            </DialogDescription>
          </DialogHeader>
          {duplicateEntry && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Order Booker</p>
                  <p className="font-medium">{duplicateEntry.orderBookerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Company</p>
                  <p className="font-medium">{duplicateEntry.companyName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Summary Amount</p>
                  <p className="font-mono font-medium">PKR {duplicateEntry.summaryAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Stock Return</p>
                  <p className="font-mono font-medium text-red-600 dark:text-red-400">({duplicateEntry.stockReturn.toLocaleString()})</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cash Received</p>
                  <p className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{duplicateEntry.cashReceived.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Claim Cleared</p>
                  <p className="font-mono font-medium text-orange-600 dark:text-orange-400">{duplicateEntry.claimCleared.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Old Recovery</p>
                  <p className="font-mono font-medium text-sky-600 dark:text-sky-400">{duplicateEntry.oldRecovery.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ret by OB</p>
                  <p className="font-mono font-medium text-purple-600 dark:text-purple-400">{duplicateEntry.returnStockClaimByOB.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Recovery</p>
                  <p className="font-mono font-medium text-sky-700 dark:text-sky-300">PKR {duplicateEntry.totalRecovery.toLocaleString()}</p>
                </div>
              </div>
              {duplicateEntry.notes && (
                <div className="pt-2 border-t">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Notes</p>
                  <p className="text-xs text-muted-foreground italic mt-0.5">{duplicateEntry.notes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                The duplicated entry will be created with <span className="font-medium">today&apos;s date</span> ({format(new Date(), 'MMM dd, yyyy')}) and a <span className="font-medium">[Copy]</span> prefix in notes.
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateDialogOpen(false);
                setDuplicateEntry(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicateSave}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Confirm Duplicate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
