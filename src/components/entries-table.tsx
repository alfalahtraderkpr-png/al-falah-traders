'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Edit, Trash2, Search, RefreshCw, Filter } from 'lucide-react';
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

  const sortedEntries = [...entries].sort((a, b) => {
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Entries</h1>
          <p className="text-muted-foreground text-sm">View and manage all distribution entries</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={entries.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
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
              <SelectTrigger className="w-40">
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
              <SelectTrigger className="w-40">
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

            <Button variant="ghost" size="icon" onClick={fetchEntries} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No entries found</p>
                <p className="text-sm">Try adjusting your filters or add a new entry</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 sticky top-0 bg-card"
                      onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                    >
                      Date {sortDir === 'asc' ? '↑' : '↓'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-card">OB Name</TableHead>
                    <TableHead className="sticky top-0 bg-card">Company</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Opening</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Summary</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Stk Return</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Posted</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Cash</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Credit</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Old Rec.</TableHead>
                    <TableHead className="text-right sticky top-0 bg-card">Closing</TableHead>
                    <TableHead className="sticky top-0 bg-card">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {entry.orderBookerName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.companyName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.openingBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.summaryAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600">
                        {entry.stockReturn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.postedSummary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600">
                        {entry.cashReceived.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.creditPosted.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.oldRecovery.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <Badge variant={entry.closingBalance > 0 ? 'destructive' : 'default'} className="text-xs">
                          {entry.closingBalance.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this entry? This action cannot be undone.
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
