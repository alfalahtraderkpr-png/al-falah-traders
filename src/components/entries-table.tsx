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
import { CalendarIcon, Download, Edit, Trash2, Search, RefreshCw, Filter, FileSpreadsheet, SortAsc, SortDesc, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
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
  oldRecovery: number;
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

  const exportCSV = () => {
    const headers = ['Date', 'OB Name', 'Company', 'Opening Balance', 'Summary', 'Stock Return', 'Posted Summary', 'Cash', 'Credit', 'Old Recovery', 'Closing Balance'];
    const rows = sortedEntries.map((e) => [
      typeof e.date === 'string' ? e.date.split('T')[0] : e.date,
      e.orderBookerName || '',
      e.companyName || '',
      e.openingBalance,
      e.summaryAmount,
      e.stockReturn,
      e.postedSummary,
      e.cashReceived,
      e.creditPosted,
      e.oldRecovery,
      e.closingBalance,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
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

  // Summary stats
  const totalSales = sortedEntries.reduce((s, e) => s + e.summaryAmount, 0);
  const totalRecovery = sortedEntries.reduce((s, e) => s + e.cashReceived, 0);
  const totalCredit = sortedEntries.reduce((s, e) => s + e.creditPosted, 0);
  const recoveryRate = totalSales > 0 ? (totalRecovery / totalSales) * 100 : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Entries</h1>
          <p className="text-muted-foreground text-sm">View and manage all distribution entries</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={entries.length === 0} className="gap-2 h-9 border-emerald-200 dark:border-emerald-800 btn-glow">
          <FileSpreadsheet className="w-4 h-4" />
          Export CSV
        </Button>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up stagger-2">
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
              Showing <span className="font-semibold text-foreground">{sortedEntries.length}</span> of {entries.length} entries
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
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
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
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10">Date</TableHead>
                    <TableHead className="sticky top-0 z-10">OB Name</TableHead>
                    <TableHead className="sticky top-0 z-10">Company</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Opening</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Summary</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Stk Return</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Posted</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Cash</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Credit</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Old Rec.</TableHead>
                    <TableHead className="text-right sticky top-0 z-10">Closing</TableHead>
                    <TableHead className="sticky top-0 z-10 no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => (
                    <TableRow key={entry.id} className="transition-all duration-200">
                      <TableCell className="whitespace-nowrap text-sm font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                            {entry.orderBookerName?.charAt(0) || '?'}
                          </div>
                          {entry.orderBookerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.companyName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.openingBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium">
                        {entry.summaryAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600 dark:text-red-400">
                        ({entry.stockReturn.toLocaleString()})
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium">
                        {entry.postedSummary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {entry.cashReceived.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.creditPosted.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-sky-600 dark:text-sky-400">
                        {entry.oldRecovery.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <Badge
                          variant={entry.closingBalance > 0 ? 'destructive' : 'default'}
                          className={`text-[10px] px-1.5 py-0 h-4 font-mono badge-animated ${entry.closingBalance <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0' : ''}`}
                        >
                          <span className={`status-dot ${entry.closingBalance > 0 ? 'risk' : 'active'}`}>
                            {entry.closingBalance.toLocaleString()}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="no-print">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => handleEdit(entry)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
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
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>Update the entry details below</DialogDescription>
          </DialogHeader>
          {editEntry && (
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
                oldRecovery: editEntry.oldRecovery,
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
