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
import { UserPlus, Building2, Plus, Edit, Trash2, Phone, Tag, Users } from 'lucide-react';
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage Order Bookers and Companies</p>
      </div>

      <Tabs defaultValue="orderBookers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orderBookers" className="gap-1.5">
            <Users className="w-4 h-4" /> Order Bookers
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-1.5">
            <Building2 className="w-4 h-4" /> Companies
          </TabsTrigger>
        </TabsList>

        {/* Order Bookers Tab */}
        <TabsContent value="orderBookers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Manage Order Bookers
            </h2>
            <Button onClick={() => openOBDialog()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Add OB
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {obLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : orderBookers.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No order bookers yet. Add one to get started.</p>
                  </div>
                ) : (
                  <Table>
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
                        <TableRow key={ob.id}>
                          <TableCell className="font-medium">{ob.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {ob.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {ob.phone}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>{ob.entryCount ?? 0}</TableCell>
                          <TableCell>
                            <Badge variant={ob.isActive !== false ? 'default' : 'secondary'} className={ob.isActive !== false ? 'bg-emerald-600' : ''}>
                              {ob.isActive !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openOBDialog(ob)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {ob.isActive !== false && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                                      <Trash2 className="w-3.5 h-3.5" />
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Manage Companies
            </h2>
            <Button onClick={() => openCoDialog()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Add Company
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {coLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No companies yet. Add one to get started.</p>
                  </div>
                ) : (
                  <Table>
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
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">{co.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {co.category ? (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" /> {co.category}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>{co.entryCount ?? 0}</TableCell>
                          <TableCell>
                            <Badge variant={co.isActive !== false ? 'default' : 'secondary'} className={co.isActive !== false ? 'bg-emerald-600' : ''}>
                              {co.isActive !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCoDialog(co)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {co.isActive !== false && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                                      <Trash2 className="w-3.5 h-3.5" />
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
      </Tabs>

      {/* OB Dialog */}
      <Dialog open={obDialogOpen} onOpenChange={setObDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOB ? 'Edit Order Booker' : 'Add Order Booker'}</DialogTitle>
            <DialogDescription>
              {editingOB ? 'Update the order booker details' : 'Add a new order booker to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obName">Name *</Label>
              <Input id="obName" value={obName} onChange={(e) => setObName(e.target.value)} placeholder="Order Booker Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obPhone">Phone</Label>
              <Input id="obPhone" value={obPhone} onChange={(e) => setObPhone(e.target.value)} placeholder="Phone Number (optional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOB} disabled={obSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {obSaving ? 'Saving...' : editingOB ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Dialog */}
      <Dialog open={coDialogOpen} onOpenChange={setCoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCo ? 'Edit Company' : 'Add Company'}</DialogTitle>
            <DialogDescription>
              {editingCo ? 'Update the company details' : 'Add a new company to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coName">Name *</Label>
              <Input id="coName" value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coCategory">Category</Label>
              <Input id="coCategory" value={coCategory} onChange={(e) => setCoCategory(e.target.value)} placeholder="Category (optional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCo} disabled={coSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {coSaving ? 'Saving...' : editingCo ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
