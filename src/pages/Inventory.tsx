import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/usePhase4Data';
import ExportMenu from '@/components/shared/ExportMenu';
import { exportInventoryCSV, exportPDF } from '@/lib/exportUtils';
import { Plus, Trash2, Package, AlertTriangle, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY = { name: '', sku: '', category: 'General', unit: 'pcs', quantity: '0', min_stock: '0', cost_price: '0', sell_price: '0', location: '' };

export default function Inventory() {
  const { businessId } = useAuth();
  const { data: items, isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');

  const filtered = (items || []).filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()));
  const totalValue = (items || []).reduce((s, i) => s + Number(i.quantity) * Number(i.cost_price), 0);
  const lowStock = (items || []).filter(i => Number(i.quantity) <= Number(i.min_stock) && Number(i.min_stock) > 0);

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ name: item.name, sku: item.sku || '', category: item.category || 'General', unit: item.unit || 'pcs', quantity: String(item.quantity), min_stock: String(item.min_stock || 0), cost_price: String(item.cost_price || 0), sell_price: String(item.sell_price || 0), location: item.location || '' });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    const payload = { business_id: businessId!, name: form.name, sku: form.sku || null, category: form.category, unit: form.unit, quantity: Number(form.quantity), min_stock: Number(form.min_stock), cost_price: Number(form.cost_price), sell_price: Number(form.sell_price), location: form.location || null };
    if (editId) {
      await updateItem.mutateAsync({ id: editId, ...payload });
      toast.success('Updated');
    } else {
      await createItem.mutateAsync(payload);
      toast.success('Item added');
    }
    setOpen(false); setEditId(null); setForm(EMPTY);
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(EMPTY); } }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
                  <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
                  <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                  <div><Label>Min Stock Alert</Label><Input type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cost Price (₹)</Label><Input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} /></div>
                  <div><Label>Sell Price (₹)</Label><Input type="number" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={createItem.isPending || updateItem.isPending}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Total Items</div><p className="text-xl font-bold mt-1">{(items || []).length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Stock Value</div><p className="text-xl font-bold mt-1">₹{totalValue.toLocaleString('en-IN')}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />Low Stock</div><p className="text-xl font-bold mt-1 text-orange-600">{lowStock.length}</p></CardContent></Card>
        </div>

        {lowStock.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Low Stock Alerts</CardTitle></CardHeader>
            <CardContent><div className="flex flex-wrap gap-2">{lowStock.map(i => <Badge key={i.id} variant="outline" className="border-orange-300 text-orange-700">{i.name}: {i.quantity} {i.unit}</Badge>)}</div></CardContent>
          </Card>
        )}

        <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Sell</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(i => (
                  <TableRow key={i.id} className={Number(i.quantity) <= Number(i.min_stock) && Number(i.min_stock) > 0 ? 'bg-orange-50' : ''}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-muted-foreground">{i.sku || '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{i.category}</Badge></TableCell>
                    <TableCell className="text-right">{i.quantity} {i.unit}</TableCell>
                    <TableCell className="text-right">₹{Number(i.cost_price).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{Number(i.sell_price).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>}
                          title="Delete this item?"
                          description={`"${i.name}" will be permanently removed from inventory.`}
                          onConfirm={() => { deleteItem.mutate(i.id); toast.success('Deleted'); }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center py-8">
                  <EmptyState
                    icon={Package}
                    title="No inventory items"
                    description="Add your first item to start tracking stock, prices, and low-stock alerts."
                    actionLabel="Add Item"
                    onAction={() => setOpen(true)}
                  />
                </TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
