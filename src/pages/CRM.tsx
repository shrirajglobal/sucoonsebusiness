import { useState, useMemo } from 'react';
import { isValidPhone, isValidEmail, formatDisplayDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useLeads, useCreateLead, useUpdateLead, useDeleteLead, useTeamMembers } from '@/hooks/useSupabaseData';
import SearchableSelect, { type SearchableOption } from '@/components/shared/SearchableSelect';
import PipelineSummary from '@/components/crm/PipelineSummary';
import LeadFilters from '@/components/crm/LeadFilters';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LEAD_SOURCES } from '@/lib/constants';
import { Plus, Search, List, Columns3, Trash2, Phone, Mail, Loader2, Users, Clock, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import ExportMenu from '@/components/shared/ExportMenu';
import { exportLeadsCSV, exportLeadsPDF } from '@/lib/exportUtils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CRM() {
  const navigate = useNavigate();
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: leads = [], isLoading } = useLeads();
  const { data: teamMembers = [] } = useTeamMembers();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const isMobile = useIsMobile();

  const stages = business?.pipeline_stages || [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filters
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterCity, setFilterCity] = useState('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
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
  const [productInterest, setProductInterest] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const resetForm = () => {
    setName(''); setCompany(''); setPhone(''); setEmail(''); setValue('');
    setSource(''); setStage(stages[0] || ''); setCity(''); setNotes('');
    setAssignedTo(''); setProductInterest(''); setTagsInput('');
    setNextFollowUp(''); setEditingId(null);
  };

  const openEdit = (l: typeof leads[0]) => {
    setName(l.name); setCompany(l.company || ''); setPhone(l.phone || ''); setEmail(l.email || '');
    setValue(l.value?.toString() || ''); setSource(l.source || ''); setStage(l.stage); setCity(l.city || '');
    setNotes(l.notes || ''); setAssignedTo(l.assigned_to || '');
    setProductInterest((l as any).product_interest || '');
    setTagsInput((l as any).tags?.join(', ') || '');
    setNextFollowUp((l as any).next_follow_up || '');
    setEditingId(l.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !businessId) { toast.error('Name is required'); return; }
    if (name.trim().length > 100) { toast.error('Name must be under 100 characters'); return; }
    if (phone && !isValidPhone(phone)) { toast.error('Enter a valid phone number (min 10 digits)'); return; }
    if (email && !isValidEmail(email)) { toast.error('Enter a valid email address'); return; }
    if (value && (isNaN(Number(value)) || Number(value) < 0)) { toast.error('Value must be a positive number'); return; }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const payload: any = {
        name: name.trim(), company, phone, email,
        value: value ? Number(value) : null,
        source, stage: stage || stages[0], city, notes,
        assigned_to: assignedTo || null,
        product_interest: productInterest || null,
        tags: tags.length > 0 ? tags : null,
        next_follow_up: nextFollowUp || null,
      };
      if (editingId) {
        await updateLead.mutateAsync({ id: editingId, ...payload });
      } else {
        await createLead.mutateAsync({ business_id: businessId, ...payload, created_by: user?.id });
      }
      resetForm(); setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteLead.mutateAsync(id); } catch (err: any) { toast.error(err.message); }
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    try { await updateLead.mutateAsync({ id: leadId, stage: newStage }); } catch (err: any) { toast.error(err.message); }
  };

  // Bulk actions
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkStageChange = async (newStage: string) => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => updateLead.mutateAsync({ id, stage: newStage })));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} leads moved to ${newStage}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteLead.mutateAsync(id)));
      setSelectedIds(new Set());
      toast.success('Leads deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  // Team options for searchable select
  const teamOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [];
    if (user?.id) opts.push({ value: user.id, label: business?.owner_name || 'Me (Owner)', hint: 'You' });
    teamMembers.filter(m => m.user_id).forEach((m) => opts.push({ value: m.user_id!, label: m.name, hint: m.department || undefined }));
    return opts;
  }, [user, business, teamMembers]);

  // Unique cities
  const cities = useMemo(() => {
    const c = new Set<string>();
    leads.forEach((l) => { if (l.city) c.add(l.city); });
    return Array.from(c).sort();
  }, [leads]);

  // Follow-up counts
  const overdueFollowUps = useMemo(() =>
    leads.filter((l) => (l as any).next_follow_up && (l as any).next_follow_up < today && !l.stage?.toLowerCase().includes('won') && !l.stage?.toLowerCase().includes('lost')).length,
    [leads, today]
  );
  const todayFollowUps = useMemo(() =>
    leads.filter((l) => (l as any).next_follow_up === today).length,
    [leads, today]
  );

  // Filtering
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.company?.toLowerCase().includes(search.toLowerCase())) return false;
      // Stage filter from pills
      if (stageFilter === '_overdue') {
        if (!(l as any).next_follow_up || (l as any).next_follow_up >= today) return false;
        if (l.stage?.toLowerCase().includes('won') || l.stage?.toLowerCase().includes('lost')) return false;
      } else if (stageFilter === '_today') {
        if ((l as any).next_follow_up !== today) return false;
      } else if (stageFilter) {
        if (l.stage !== stageFilter) return false;
      }
      // Advanced filters
      if (filterStage !== 'all' && l.stage !== filterStage) return false;
      if (filterSource !== 'all' && l.source !== filterSource) return false;
      if (filterAssigned && l.assigned_to !== filterAssigned) return false;
      if (filterCity !== 'all' && l.city !== filterCity) return false;
      return true;
    });
  }, [leads, search, stageFilter, filterStage, filterSource, filterAssigned, filterCity, today]);

  const currency = business?.currency || '₹';

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">CRM & Leads</h1>
          <div className="flex items-center gap-2">
            <ExportMenu onCSV={() => exportLeadsCSV(leads)} onPDF={() => exportLeadsPDF(leads)} />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh]">
                <DialogHeader><DialogTitle>{editingId ? 'Edit Lead' : 'New Lead'}</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="mt-1" /></div>
                  <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={100} className="mt-1" /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="e.g. +91 98765 43210" className="mt-1" /></div>
                    <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} type="email" placeholder="e.g. name@company.com" className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Value ({currency})</Label><Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" /></div>
                    <div>
                      <Label>Source</Label>
                      <Select value={source} onValueChange={setSource}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Stage</Label>
                      <Select value={stage} onValueChange={setStage}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assigned To</Label>
                      <div className="mt-1">
                        <SearchableSelect options={teamOptions} value={assignedTo} onValueChange={setAssignedTo} placeholder="Search member..." />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" /></div>
                    <div><Label>Next Follow-up</Label><Input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} className="mt-1" /></div>
                  </div>
                  <div><Label>Product Interest</Label><Input value={productInterest} onChange={(e) => setProductInterest(e.target.value)} className="mt-1" placeholder="e.g. Web Design, Packaging" /></div>
                  <div>
                    <Label>Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
                    <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="mt-1" placeholder="e.g. hot, referral, Mumbai" />
                  </div>
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
            {/* Pipeline Summary */}
            <PipelineSummary
              leads={leads}
              stages={stages}
              currency={currency}
              activeStageFilter={stageFilter}
              onStageFilter={setStageFilter}
              overdueCount={overdueFollowUps}
              todayCount={todayFollowUps}
            />

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-2 items-start">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
              </div>
              <LeadFilters
                stages={stages}
                teamOptions={teamOptions}
                filterStage={filterStage}
                filterSource={filterSource}
                filterAssigned={filterAssigned}
                filterCity={filterCity}
                onStageChange={setFilterStage}
                onSourceChange={setFilterSource}
                onAssignedChange={setFilterAssigned}
                onCityChange={setFilterCity}
                cities={cities}
              />
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border flex-wrap">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Select onValueChange={handleBulkStageChange}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Change Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <ConfirmDialog
                  trigger={<Button size="sm" variant="destructive" className="gap-1 h-8"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>}
                  title="Delete selected leads?"
                  description={`${selectedIds.size} leads will be permanently deleted.`}
                  onConfirm={handleBulkDelete}
                />
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              </div>
            )}

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
                      <div key={stg} className="min-w-[220px] sm:min-w-[260px] flex-shrink-0">
                        <div className="mb-3 px-1">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stg}</h3>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{stageLeads.length} leads · {currency}{stageValue.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="space-y-2 min-h-[80px]">
                          {stageLeads.map((lead) => (
                            <Card key={lead.id} className="p-3 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => navigate(`/crm/${lead.id}`)}>
                              <p className="text-sm font-medium mb-0.5">{lead.name}</p>
                              <p className="text-xs text-muted-foreground mb-2">{lead.company}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tabular-nums">{lead.value ? `${currency}${Number(lead.value).toLocaleString('en-IN')}` : '—'}</span>
                                <div className="flex items-center gap-1">
                                  {(lead as any).next_follow_up && (
                                    <span className={`text-[10px] flex items-center gap-0.5 ${(lead as any).next_follow_up < today ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                      <Clock className="w-2.5 h-2.5" /> {formatDisplayDate((lead as any).next_follow_up, business?.date_format)}
                                    </span>
                                  )}
                                  {lead.source && <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>}
                                </div>
                              </div>
                              {(lead as any).tags?.length > 0 && (
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {(lead as any).tags.slice(0, 3).map((tag: string) => (
                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-accent rounded-full text-muted-foreground">{tag}</span>
                                  ))}
                                </div>
                              )}
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
                    <Card key={lead.id} className="p-3 sm:p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => navigate(`/crm/${lead.id}`)}>
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="pt-0.5" onClick={(e) => toggleSelect(lead.id, e)}>
                          <Checkbox checked={selectedIds.has(lead.id)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <h3 className="text-sm font-medium truncate">{lead.name}</h3>
                              <Badge variant="outline" className="text-[10px] shrink-0">{lead.stage}</Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {lead.value && <span className="text-xs sm:text-sm font-medium tabular-nums">{currency}{Number(lead.value).toLocaleString('en-IN')}</span>}
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
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="truncate">{[lead.company, lead.city, lead.source].filter(Boolean).join(' · ')}</span>
                            {(lead as any).next_follow_up && (
                              <span className={`flex items-center gap-0.5 shrink-0 ${(lead as any).next_follow_up < today ? 'text-destructive font-medium' : ''}`}>
                                <Clock className="w-3 h-3" /> {formatDisplayDate((lead as any).next_follow_up, business?.date_format)}
                              </span>
                            )}
                            {(lead as any).product_interest && <Badge variant="secondary" className="text-[10px] shrink-0">{(lead as any).product_interest}</Badge>}
                          </div>
                          {(lead as any).tags?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {(lead as any).tags.map((tag: string) => (
                                <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-accent rounded-full text-muted-foreground">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {filtered.length === 0 && <Card className="p-8 text-center card-shadow"><p className="text-sm text-muted-foreground">No leads match your filters.</p></Card>}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
