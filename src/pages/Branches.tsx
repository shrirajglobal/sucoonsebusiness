import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '@/hooks/usePhase4Data';
import { Plus, Trash2, Loader2, MapPin, Pencil, Building2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const EMPTY = { name: '', city: '', state: '', address: '', phone: '', manager_name: '' };

export default function Branches() {
  const { businessId } = useAuth();
  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const openEdit = (b: any) => {
    setEditId(b.id);
    setForm({ name: b.name, city: b.city || '', state: b.state || '', address: b.address || '', phone: b.phone || '', manager_name: b.manager_name || '' });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Branch name is required'); return; }
    const payload = { business_id: businessId!, name: form.name, city: form.city || null, state: form.state || null, address: form.address || null, phone: form.phone || null, manager_name: form.manager_name || null };
    if (editId) {
      await updateBranch.mutateAsync({ id: editId, ...payload });
      toast.success('Updated');
    } else {
      await createBranch.mutateAsync(payload);
      toast.success('Branch added');
    }
    setOpen(false); setEditId(null); setForm(EMPTY);
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Branches</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(EMPTY); } }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Branch</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Edit Branch' : 'New Branch'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Branch Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div><Label>State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><Label>Manager</Label><Input value={form.manager_name} onChange={e => setForm(f => ({ ...f, manager_name: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={createBranch.isPending || updateBranch.isPending}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(branches || []).map(b => (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />{b.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Switch checked={b.is_active ?? true} onCheckedChange={v => updateBranch.mutate({ id: b.id, is_active: v })} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(b.city || b.state) && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[b.city, b.state].filter(Boolean).join(', ')}</p>}
                {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                {b.manager_name && <p className="text-xs text-muted-foreground">Manager: {b.manager_name}</p>}
                {b.phone && <p className="text-xs text-muted-foreground">Phone: {b.phone}</p>}
                <div className="flex gap-1 pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openEdit(b)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="sm" className="h-7 text-xs text-destructive"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>}
                    title="Delete this branch?"
                    description={`"${b.name}" will be permanently deleted.`}
                    onConfirm={() => { deleteBranch.mutate(b.id); toast.success('Deleted'); }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          {!(branches || []).length && (
            <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">No branches yet. Add your first branch to enable multi-location management.</CardContent></Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
