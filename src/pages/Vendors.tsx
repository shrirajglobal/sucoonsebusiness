import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useVendors, useCreateVendor, useDeleteVendor, usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder } from '@/hooks/usePhase4Data';
import { Plus, Trash2, Loader2, Building, ShoppingCart, FileText, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY_VENDOR = { name: '', company: '', phone: '', email: '', gst_number: '', address: '', notes: '' };
const PO_STATUSES = ['draft', 'sent', 'received', 'cancelled'] as const;
const statusColors: Record<string, string> = { draft: 'secondary', sent: 'default', received: 'outline', cancelled: 'destructive' };

export default function Vendors() {
  const { businessId, user } = useAuth();
  const { data: vendors, isLoading: vLoading } = useVendors();
  const createVendor = useCreateVendor();
  const deleteVendor = useDeleteVendor();
  const { data: pos, isLoading: poLoading } = usePurchaseOrders();
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState(EMPTY_VENDOR);
  const [poOpen, setPoOpen] = useState(false);
  const [poForm, setPoForm] = useState({ vendor_id: '', po_number: '', items: '', total_amount: '', expected_date: '', notes: '' });

  const handleAddVendor = async () => {
    if (!vForm.name) { toast.error('Vendor name is required'); return; }
    await createVendor.mutateAsync({ business_id: businessId!, ...vForm });
    toast.success('Vendor added'); setVOpen(false); setVForm(EMPTY_VENDOR);
  };

  const handleAddPO = async () => {
    if (!poForm.vendor_id || !poForm.po_number) { toast.error('Vendor and PO number required'); return; }
    let parsedItems: any[] = [];
    try { parsedItems = poForm.items ? JSON.parse(poForm.items) : []; } catch { parsedItems = [{ description: poForm.items, qty: 1, rate: Number(poForm.total_amount) || 0 }]; }
    await createPO.mutateAsync({
      business_id: businessId!, vendor_id: poForm.vendor_id, po_number: poForm.po_number,
      items: parsedItems, total_amount: Number(poForm.total_amount) || 0,
      expected_date: poForm.expected_date || null, notes: poForm.notes || null, created_by: user?.id,
    });
    toast.success('PO created'); setPoOpen(false);
    setPoForm({ vendor_id: '', po_number: '', items: '', total_amount: '', expected_date: '', notes: '' });
  };

  const isLoading = vLoading || poLoading;
  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Vendors & Purchase Orders</h1>

        <Tabs defaultValue="vendors">
          <TabsList><TabsTrigger value="vendors"><Building className="w-4 h-4 mr-1" />Vendors</TabsTrigger><TabsTrigger value="pos"><FileText className="w-4 h-4 mr-1" />Purchase Orders</TabsTrigger></TabsList>

          <TabsContent value="vendors" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={vOpen} onOpenChange={setVOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Vendor</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Name *</Label><Input value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div><Label>Company</Label><Input value={vForm.company} onChange={e => setVForm(f => ({ ...f, company: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Phone</Label><Input value={vForm.phone} onChange={e => setVForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div><Label>Email</Label><Input value={vForm.email} onChange={e => setVForm(f => ({ ...f, email: e.target.value }))} /></div>
                    </div>
                    <div><Label>GSTIN</Label><Input value={vForm.gst_number} onChange={e => setVForm(f => ({ ...f, gst_number: e.target.value }))} /></div>
                    <div><Label>Address</Label><Textarea value={vForm.address} onChange={e => setVForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
                    <Button className="w-full" onClick={handleAddVendor} disabled={createVendor.isPending}>Save Vendor</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card><CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Company</TableHead><TableHead>Phone</TableHead><TableHead>GSTIN</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(vendors || []).map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.company || '—'}</TableCell>
                      <TableCell>{v.phone || '—'}</TableCell>
                      <TableCell className="text-xs">{v.gst_number || '—'}</TableCell>
                      <TableCell>
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>}
                          title="Delete this vendor?"
                          description={`"${v.name}" will be permanently deleted.`}
                          onConfirm={() => { deleteVendor.mutate(v.id); toast.success('Deleted'); }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!(vendors || []).length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No vendors yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="pos" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={poOpen} onOpenChange={setPoOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Create PO</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Vendor *</Label>
                        <Select value={poForm.vendor_id} onValueChange={v => setPoForm(f => ({ ...f, vendor_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                          <SelectContent>{(vendors || []).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>PO Number *</Label><Input value={poForm.po_number} onChange={e => setPoForm(f => ({ ...f, po_number: e.target.value }))} placeholder="PO-001" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Total Amount (₹)</Label><Input type="number" value={poForm.total_amount} onChange={e => setPoForm(f => ({ ...f, total_amount: e.target.value }))} /></div>
                      <div><Label>Expected Date</Label><Input type="date" value={poForm.expected_date} onChange={e => setPoForm(f => ({ ...f, expected_date: e.target.value }))} /></div>
                    </div>
                    <div><Label>Items (description)</Label><Textarea value={poForm.items} onChange={e => setPoForm(f => ({ ...f, items: e.target.value }))} rows={2} placeholder="List items..." /></div>
                    <div><Label>Notes</Label><Input value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} /></div>
                    <Button className="w-full" onClick={handleAddPO} disabled={createPO.isPending}>Create PO</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card><CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>PO #</TableHead><TableHead>Vendor</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(pos || []).map((po: any) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendors?.name || '—'}</TableCell>
                      <TableCell>₹{Number(po.total_amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Select value={po.status} onValueChange={v => updatePO.mutate({ id: po.id, status: v as any })}>
                          <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{PO_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{po.order_date ? format(new Date(po.order_date), 'dd MMM yyyy') : '—'}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { deletePO.mutate(po.id); toast.success('Deleted'); }}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {!(pos || []).length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
