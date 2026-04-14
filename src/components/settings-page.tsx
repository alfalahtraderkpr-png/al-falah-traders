'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Building2, Plus, Edit, Trash2, Phone, Tag, Users, Shield, Database, Activity, CheckCircle2, XCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface OrderBooker {
  id: string;
  name: string;
  phone?: string;
  isActive?: boolean;
  entryCount?: number;
}

interface Company {
  id: string;
  name: string;
  category?: string;
  isActive?: boolean;
  entryCount?: number;
}

export default function SettingsPage() {
  const [orderBookers, setOrderBookers] = useState<OrderBooker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [obLoading, setOBLoading] = useState(true);
  const [coLoading, setCoLoading] = useState(true);

  // OB Form
  const [obDialogOpen, setObDialogOpen] = useState(false);
  const [editingOB, setEditingOB] = useState<OrderBooker | null>(null);
  const [obName, setObName] = useState('');
  const [obPhone, setObPhone] = useState('');
  const [obSaving, setObSaving] = useState(false);

  // Company Form
  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [editingCo, setEditingCo] = useState<Company | null>(null);
  const [coName, setCoName] = useState('');
  const [coCategory, setCoCategory] = useState('');
  const [coSaving, setCoSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fetchOBs = useCallback(async () => {
    setOBLoading(true);
    try {
      const res = await fetch('/api/order-bookers');
      if (res.ok) {
        const data = await res.json();
        setOrderBookers(data.orderBookers || []);
      }
    } catch { /* silent */ }
    finally { setOBLoading(false); }
  }, []);

  const fetchCompanies = useCallback(async () => {
    setCoLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch { /* silent */ }
    finally { setCoLoading(false); }
  }, []);

  useEffect(() => { fetchOBs(); fetchCompanies(); }, [fetchOBs, fetchCompanies]);

  // OB CRUD
  const openOBDialog = (ob?: OrderBooker) => {
    if (ob) {
      setEditingOB(ob);
      setObName(ob.name);
      setObPhone(ob.phone || '');
    } else {
      setEditingOB(null);
      setObName('');
      setObPhone('');
    }
    setObDialogOpen(true);
  };

  const saveOB = async () => {
    if (!obName.trim()) {
      toast.error('Name is required');
      return;
    }
    setObSaving(true);
    try {
      const payload = { name: obName.trim(), phone: obPhone.trim() || undefined };
      const res = editingOB
        ? await fetch(`/api/order-bookers/${editingOB.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/order-bookers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingOB ? 'Order Booker updated' : 'Order Booker added');
        setObDialogOpen(false);
        fetchOBs();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally { setObSaving(false); }
  };

  const deactivateOB = async (id: string) => {
    try {
      const res = await fetch(`/api/order-bookers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Order Booker deactivated');
        fetchOBs();
      } else {
        toast.error('Failed to deactivate');
      }
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  // Company CRUD
  const openCoDialog = (co?: Company) => {
    if (co) {
      setEditingCo(co);
      setCoName(co.name);
      setCoCategory(co.category || '');
    } else {
      setEditingCo(null);
      setCoName('');
      setCoCategory('');
    }
    setCoDialogOpen(true);
  };

  const saveCo = async () => {
    if (!coName.trim()) {
      toast.error('Name is required');
      return;
    }
    setCoSaving(true);
    try {
      const payload = { name: coName.trim(), category: coCategory.trim() || undefined };
      const res = editingCo
        ? await fetch(`/api/companies/${editingCo.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingCo ? 'Company updated' : 'Company added');
        setCoDialogOpen(false);
        fetchCompanies();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally { setCoSaving(false); }
  };

  const deactivateCo = async (id: string) => {
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Company deactivated');
        fetchCompanies();
      } else {
        toast.error('Failed to deactivate');
      }
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const handleReseed = async () => {
    try {
      const res = await fetch('/api/seed');
      if (res.ok) {
        const data = await res.json();
        toast.success('Database re-seeded!', {
          description: `${data.orderBookers?.length || 0} OBs, ${data.companies?.length || 0} companies`,
        });
        fetchOBs();
        fetchCompanies();
      } else {
        toast.error('Failed to re-seed');
      }
    } catch {
      toast.error('Failed to re-seed');
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('New password must be at least 4 characters');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Computed stats
  const activeOBs = orderBookers.filter(ob => ob.isActive !== false).length;
  const inactiveOBs = orderBookers.filter(ob => ob.isActive === false).length;
  const activeCos = companies.filter(co => co.isActive !== false).length;
  const inactiveCos = companies.filter(co => co.isActive === false).length;
  const totalOBEntries = orderBookers.reduce((s, ob) => s + (ob.entryCount || 0), 0);
  const totalCoEntries = companies.reduce((s, co) => s + (co.entryCount || 0), 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage Order Bookers, Companies, and System</p>
      </div>

      {/* Stats Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 shadow-sm">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Order Bookers</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{orderBookers.length}</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{activeOBs} active</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-sky-50/80 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20 border border-sky-200/50 dark:border-sky-800/50">
          <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/50 shadow-sm">
            <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Companies</p>
            <p className="text-xl font-bold text-sky-700 dark:text-sky-300">{companies.length}</p>
            <p className="text-[10px] text-sky-600/70 dark:text-sky-400/70">{activeCos} active</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 shadow-sm">
            <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">OB Entries</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{totalOBEntries}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/50 shadow-sm">
            <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Co Entries</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{totalCoEntries}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="orderBookers" className="space-y-4">
        <TabsList className="no-print">
          <TabsTrigger value="orderBookers" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Order Bookers
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" /> Companies
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> System
          </TabsTrigger>
        </TabsList>

        {/* Order Bookers Tab */}
        <TabsContent value="orderBookers" className="space-y-4">
          <div className="flex items-center justify-between animate-fade-in-up">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Manage Order Bookers
              <Badge variant="outline" className="text-[10px] ml-1 border-emerald-200 dark:border-emerald-800">{orderBookers.length} total</Badge>
            </h2>
            <Button onClick={() => openOBDialog()} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 gap-1.5 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 btn-glow font-semibold">
              <Plus className="w-3.5 h-3.5" /> Add OB
            </Button>
          </div>

          <Card className="card-hover animate-fade-in-up stagger-1">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {obLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full shimmer" />)}
                  </div>
                ) : orderBookers.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No order bookers yet. Add one to get started.</p>
                  </div>
                ) : (
                  <Table className="table-enhanced">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderBookers.map((ob) => (
                        <TableRow key={ob.id} className="transition-all duration-200">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                                {ob.name.charAt(0)}
                              </div>
                              <span className="font-semibold">{ob.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ob.phone ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3" /> {ob.phone}
                              </span>
                            ) : <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono border-emerald-200 dark:border-emerald-800">{ob.entryCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ob.isActive !== false ? 'default' : 'secondary'} className={`text-[10px] badge-animated ${ob.isActive !== false ? 'bg-emerald-600' : ''}`}>
                              <span className={`status-dot ${ob.isActive !== false ? 'active' : 'inactive'}`}>
                                {ob.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => openOBDialog(ob)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              {ob.isActive !== false && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate Order Booker</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to deactivate {ob.name}? This will prevent them from appearing in new entries.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deactivateOB(ob.id)} className="bg-red-600 hover:bg-red-700">
                                        Deactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
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
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <div className="flex items-center justify-between animate-fade-in-up">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              Manage Companies
              <Badge variant="outline" className="text-[10px] ml-1 border-sky-200 dark:border-sky-800">{companies.length} total</Badge>
            </h2>
            <Button onClick={() => openCoDialog()} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 gap-1.5 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 btn-glow font-semibold">
              <Plus className="w-3.5 h-3.5" /> Add Company
            </Button>
          </div>

          <Card className="card-hover animate-fade-in-up stagger-1">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {coLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full shimmer" />)}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No companies yet. Add one to get started.</p>
                  </div>
                ) : (
                  <Table className="table-enhanced">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((co) => (
                        <TableRow key={co.id} className="transition-all duration-200">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                                {co.name.charAt(0)}
                              </div>
                              <span className="font-semibold">{co.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {co.category ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Tag className="w-3 h-3" /> {co.category}
                              </span>
                            ) : <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono border-sky-200 dark:border-sky-800">{co.entryCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={co.isActive !== false ? 'default' : 'secondary'} className={`text-[10px] badge-animated ${co.isActive !== false ? 'bg-emerald-600' : ''}`}>
                              <span className={`status-dot ${co.isActive !== false ? 'active' : 'inactive'}`}>
                                {co.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-sky-50 dark:hover:bg-sky-900/30" onClick={() => openCoDialog(co)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              {co.isActive !== false && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate Company</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to deactivate {co.name}? This will prevent it from appearing in new entries.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deactivateCo(co.id)} className="bg-red-600 hover:bg-red-700">
                                        Deactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
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
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card className="card-hover animate-fade-in-up glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                System Administration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 shadow-sm">
                    <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Re-seed Database</p>
                    <p className="text-xs text-muted-foreground">Reset with sample order bookers, companies, and entries</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleReseed} className="h-8 border-emerald-200 dark:border-emerald-800 btn-glow">
                  <Database className="w-3 h-3 mr-1" /> Re-seed
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border">
                <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-black/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active OBs</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeOBs}</p>
                  <p className="text-[10px] text-muted-foreground">{inactiveOBs} inactive</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-black/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Cos</p>
                  <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{activeCos}</p>
                  <p className="text-[10px] text-muted-foreground">{inactiveCos} inactive</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-black/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">OB Entries</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{totalOBEntries}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-black/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Co Entries</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{totalCoEntries}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    <strong>Note:</strong> The database uses SQLite. All data is stored locally. Re-seeding will add sample data but won&apos;t remove existing records.
                  </p>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Change Password
                </h3>
                <div className="space-y-3 p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="h-9 pr-9"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                      >
                        {showCurrentPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPwd ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 4 characters"
                          className="h-9 pr-9"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowNewPwd(!showNewPwd)}
                        >
                          {showNewPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="h-9"
                      />
                    </div>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                  {newPassword && confirmPassword && newPassword === confirmPassword && (
                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 h-9 gap-1.5 font-semibold"
                    >
                      {passwordSaving ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* OB Dialog */}
      <Dialog open={obDialogOpen} onOpenChange={setObDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              {editingOB ? 'Edit Order Booker' : 'Add Order Booker'}
            </DialogTitle>
            <DialogDescription>
              {editingOB ? 'Update the order booker details' : 'Add a new order booker to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="obName" className="text-xs font-semibold">Name *</Label>
              <Input id="obName" value={obName} onChange={(e) => setObName(e.target.value)} placeholder="Order Booker Name" className="h-10 border-emerald-200/50 dark:border-emerald-800/50" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obPhone" className="text-xs font-semibold">Phone</Label>
              <Input id="obPhone" value={obPhone} onChange={(e) => setObPhone(e.target.value)} placeholder="Phone Number (optional)" className="h-10 border-emerald-200/50 dark:border-emerald-800/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObDialogOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={saveOB} disabled={obSaving} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 btn-glow font-semibold">
              {obSaving ? 'Saving...' : editingOB ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Dialog */}
      <Dialog open={coDialogOpen} onOpenChange={setCoDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              {editingCo ? 'Edit Company' : 'Add Company'}
            </DialogTitle>
            <DialogDescription>
              {editingCo ? 'Update the company details' : 'Add a new company to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="coName" className="text-xs font-semibold">Name *</Label>
              <Input id="coName" value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Company Name" className="h-10 border-sky-200/50 dark:border-sky-800/50" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coCategory" className="text-xs font-semibold">Category</Label>
              <Input id="coCategory" value={coCategory} onChange={(e) => setCoCategory(e.target.value)} placeholder="Category (optional)" className="h-10 border-sky-200/50 dark:border-sky-800/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoDialogOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={saveCo} disabled={coSaving} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 h-9 btn-glow font-semibold">
              {coSaving ? 'Saving...' : editingCo ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
