import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useLeads, useCreateLead, useUpdateLead, useDeleteLead, useTeamMembers } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LEAD_SOURCES } from '@/lib/constants';
import { Plus, Search, List, Columns3, Trash2, Phone, Mail, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import ExportMenu from '@/components/shared/ExportMenu';
import { exportLeadsCSV, exportLeadsPDF } from '@/lib/exportUtils';

export default function CRM() {
  const navigate = useNavigate();
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: leads = [], isLoading } = useLeads();
  const { data: teamMembers = [] } = useTeamMembers();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const stages = business?.pipeline_stages || [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<typeof leads[0] | null>(null);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');
  const [stage, setStage] = useState(stages[0] || '');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName(''); setCompany(''); setPhone(''); setEmail(''); setValue('');
    setSource(''); setStage(stages[0] || ''); setCity(''); setNotes(''); setAssignedTo(''); setEditingId(null);
  };

  const openEdit = (l: typeof leads[0]) => {
    setName(l.name); setCompany(l.company || ''); setPhone(l.phone || ''); setEmail(l.email || '');
    setValue(l.value?.toString() || ''); setSource(l.source || ''); setStage(l.stage); setCity(l.city || '');
    setNotes(l.notes || ''); setAssignedTo(l.assigned_to || ''); setEditingId(l.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !businessId) return;
    try {
      if (editingId) {
        await updateLead.mutateAsync({ id: editingId, name, company, phone, email, value: value ? Number(value) : null, source, stage, city, notes, assigned_to: assignedTo || null });
      } else {
        await createLead.mutateAsync({ business_id: businessId, name, company, phone, email, value: value ? Number(value) : null, source, stage: stage || stages[0], city, notes, assigned_to: assignedTo || null, created_by: user?.id });
      }
      resetForm(); setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteLead.mutateAsync(id); setSelectedLead(null); } catch (err: any) { toast.error(err.message); }
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, stage: newStage });
      if (selectedLead && selectedLead.id === leadId) setSelectedLead({ ...selectedLead, stage: newStage });
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = leads.filter((l) => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.company?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pipelineValue = leads.reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">CRM & Leads</h1>
            {leads.length > 0 && (
              <p className="text-sm text-muted-foreground">Pipeline value: <span className="font-medium tabular-nums">{business?.currency || '₹'}{pipelineValue.toLocaleString('en-IN')}</span></p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu onCSV={() => exportLeadsCSV(leads)} onPDF={() => exportLeadsPDF(leads)} />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingId ? 'Edit Lead' : 'New Lead'}</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
                <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
                  <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Value (₹)</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" /></div>
                  <div>
                    <Label>Source</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Stage</Label>
                    <Select value={stage} onValueChange={setStage}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={user?.id || 'owner'}>{business?.owner_name || 'Owner'}</SelectItem>
                        {teamMembers.map((m) => <SelectItem key={m.id} value={m.user_id || m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" /></div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={2} /></div>
                <Button onClick={handleSave} className="w-full" disabled={createLead.isPending || updateLead.isPending}>
                  {(createLead.isPending || updateLead.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {editingId ? 'Save' : 'Create Lead'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Add your first lead from IndiaMART, TradeIndia, or any other source to start tracking your sales pipeline."
            actionLabel="Add Lead"
            onAction={() => setOpen(true)}
          />
        ) : (
          <>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
            </div>

            <Tabs defaultValue="kanban">
              <TabsList>
                <TabsTrigger value="kanban" className="gap-1"><Columns3 className="w-4 h-4" /> Pipeline</TabsTrigger>
                <TabsTrigger value="list" className="gap-1"><List className="w-4 h-4" /> List</TabsTrigger>
              </TabsList>

              <TabsContent value="kanban" className="mt-4">
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {stages.map((stg) => {
                    const stageLeads = filtered.filter((l) => l.stage === stg);
                    const stageValue = stageLeads.reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0);
                    return (
                      <div key={stg} className="min-w-[260px] flex-shrink-0">
                        <div className="mb-3 px-1">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stg}</h3>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{stageLeads.length} leads · {business?.currency || '₹'}{stageValue.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="space-y-2 min-h-[80px]">
                          {stageLeads.map((lead) => (
                            <Card key={lead.id} className="p-3 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => navigate(`/crm/${lead.id}`)}>
                              <p className="text-sm font-medium mb-0.5">{lead.name}</p>
                              <p className="text-xs text-muted-foreground mb-2">{lead.company}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tabular-nums">{lead.value ? `${business?.currency || '₹'}${Number(lead.value).toLocaleString('en-IN')}` : '—'}</span>
                                {lead.source && <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-4">
                <div className="space-y-2">
                  {filtered.map((lead) => (
                    <Card key={lead.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => navigate(`/crm/${lead.id}`)}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium">{lead.name}</h3>
                            <Badge variant="outline" className="text-[10px]">{lead.stage}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{[lead.company, lead.city, lead.source].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums">{lead.value ? `₹${Number(lead.value).toLocaleString('en-IN')}` : ''}</span>
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            }
                            title="Delete this lead?"
                            description={`"${lead.name}" will be permanently deleted.`}
                            onConfirm={() => handleDelete(lead.id)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {filtered.length === 0 && <Card className="p-8 text-center card-shadow"><p className="text-sm text-muted-foreground">No leads match your search.</p></Card>}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <Sheet open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {selectedLead && (
              <>
                <SheetHeader><SheetTitle>{selectedLead.name}</SheetTitle></SheetHeader>
                <div className="mt-6 space-y-5">
                  <div className="flex gap-2">
                    {selectedLead.phone && <a href={`tel:${selectedLead.phone}`}><Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> Call</Button></a>}
                    {selectedLead.phone && <a href={`https://wa.me/91${encodeURIComponent(selectedLead.phone)}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">💬 WhatsApp</Button></a>}
                    {selectedLead.email && <a href={`mailto:${encodeURIComponent(selectedLead.email)}`}><Button size="sm" variant="outline"><Mail className="w-4 h-4 mr-1" /> Email</Button></a>}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground text-xs">Company</p><p className="font-medium">{selectedLead.company || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Value</p><p className="font-medium tabular-nums">{selectedLead.value ? `₹${Number(selectedLead.value).toLocaleString('en-IN')}` : '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Source</p><p className="font-medium">{selectedLead.source || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">City</p><p className="font-medium">{selectedLead.city || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium font-mono text-xs">{selectedLead.phone || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium text-xs truncate">{selectedLead.email || '—'}</p></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Stage</p>
                    <Select value={selectedLead.stage} onValueChange={(v) => handleStageChange(selectedLead.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {selectedLead.notes && <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{selectedLead.notes}</p></div>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { openEdit(selectedLead); setSelectedLead(null); }}>Edit Lead</Button>
                    <ConfirmDialog
                      trigger={<Button size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
                      title="Delete this lead?"
                      description={`"${selectedLead.name}" will be permanently deleted.`}
                      onConfirm={() => handleDelete(selectedLead.id)}
                    />
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Created {selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleDateString('en-IN') : '—'}</p>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
