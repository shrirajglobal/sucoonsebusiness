import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/useContactsData';
import { useCreateLead } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import {
  Plus, Search, Phone, Mail, Building2, MapPin, Globe,
  MoreVertical, UserPlus, MessageCircle, Trash2, Edit, Loader2, Contact as ContactIcon
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const EMPTY = { name: '', company: '', designation: '', phone: '', email: '', address: '', website: '', notes: '', source: 'manual' };
const SOURCES = ['manual', 'card_scan', 'import', 'crm', 'referral'];

export default function Contacts() {
  const { businessId } = useAuth();
  const { data: contacts = [], isLoading } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createLead = useCreateLead();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch = !search || [c.name, c.company, c.phone, c.email, c.designation].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchSource = sourceFilter === 'all' || c.source === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [contacts, search, sourceFilter]);

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); };
  const openEdit = (c: typeof contacts[0]) => {
    setForm({ name: c.name, company: c.company || '', designation: c.designation || '', phone: c.phone || '', email: c.email || '', address: c.address || '', website: c.website || '', notes: c.notes || '', source: c.source || 'manual' });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editingId) {
        await updateContact.mutateAsync({ id: editingId, ...form });
        toast.success('Contact updated');
      } else {
        await createContact.mutateAsync({ ...form, business_id: businessId! });
        toast.success('Contact added');
      }
      setDialogOpen(false);
    } catch { toast.error('Failed to save contact'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContact.mutateAsync(deleteId);
      toast.success('Contact deleted');
      setDeleteId(null);
    } catch { toast.error('Failed to delete'); }
  };

  const addToCRM = async (c: typeof contacts[0]) => {
    try {
      await createLead.mutateAsync({
        business_id: businessId!,
        name: c.name,
        company: c.company,
        phone: c.phone,
        email: c.email,
        source: 'Contact',
        stage: 'New Lead',
      });
      toast.success(`${c.name} added to CRM as a lead`);
    } catch { toast.error('Failed to add to CRM'); }
  };

  const callContact = (phone: string) => { window.open(`tel:${phone}`); };
  const whatsappContact = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned.startsWith('91') ? cleaned : '91' + cleaned}`);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Contacts</h1>
            <p className="text-xs text-muted-foreground">{contacts.length} contacts</p>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ContactIcon} title="No contacts yet" description="Add your first contact or scan a visiting card" actionLabel="Add Contact" onAction={openCreate} />
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <Card key={c.id} className="p-3 card-shadow hover:card-shadow-hover transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{c.name}</h3>
                      {c.source === 'card_scan' && <Badge variant="outline" className="text-[10px]">📇 Scanned</Badge>}
                    </div>
                    {c.designation && <p className="text-xs text-muted-foreground">{c.designation}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {c.company && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</span>}
                      {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.phone && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => callContact(c.phone!)} title="Call">
                          <Phone className="w-3.5 h-3.5 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => whatsappContact(c.phone!)} title="WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5 text-success" />
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}><Edit className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addToCRM(c)}><UserPlus className="w-3.5 h-3.5 mr-2" /> Add to CRM</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Contact' : 'Add Contact'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Designation</Label><Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={createContact.isPending || updateContact.isPending}>
              {(createContact.isPending || updateContact.isPending) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleteId && (
        <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Contact</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This contact will be permanently deleted.</p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
