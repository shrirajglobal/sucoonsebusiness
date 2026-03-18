import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useCustomers, useCreateCustomer, useUpdateCustomer, useContactLogs, useCreateContactLog, useTeamMembers, useAllContactLogs, useCreateLead } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Phone, Search, Users, CheckCircle2, Clock, MessageSquare, Loader2, BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import ExportMenu from '@/components/shared/ExportMenu';
import { exportCustomersCSV, exportCustomersPDF } from '@/lib/exportUtils';
import CoverageHeatmap from '@/components/engagement/CoverageHeatmap';
import DormantReport from '@/components/engagement/DormantReport';
import TeamPerformance from '@/components/engagement/TeamPerformance';

type CustomerTier = Database['public']['Enums']['customer_tier'];
type ContactMethod = Database['public']['Enums']['contact_method'];
type ContactOutcome = Database['public']['Enums']['contact_outcome'];

const TIER_COLORS: Record<CustomerTier, string> = {
  A: 'bg-destructive text-destructive-foreground', B: 'bg-warning text-warning-foreground', C: 'bg-muted text-muted-foreground',
};

export default function Engagement() {
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: allLogs = [] } = useAllContactLogs();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const createContactLog = useCreateContactLog();
  const createLead = useCreateLead();

  const tierSettings = (business?.tier_settings as any) || { A: { frequency: 15 }, B: { frequency: 30 }, C: { frequency: 60 } };

  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<CustomerTier>('B');
  const [assignedTo, setAssignedTo] = useState('');
  const [lifetimeValue, setLifetimeValue] = useState('');

  const [logMethod, setLogMethod] = useState<ContactMethod>('call');
  const [logOutcome, setLogOutcome] = useState<ContactOutcome>('positive');
  const [logNotes, setLogNotes] = useState('');
  const [logNextDate, setLogNextDate] = useState('');
  const [logCustomerId, setLogCustomerId] = useState('');

  const resetAddForm = () => { setName(''); setCompany(''); setPhone(''); setEmail(''); setTier('B'); setAssignedTo(''); setLifetimeValue(''); };

  const handleAddCustomer = async () => {
    if (!name.trim() || !businessId) return;
    try {
      await createCustomer.mutateAsync({
        business_id: businessId, name, company, phone, email, tier,
        assigned_to: assignedTo || null,
        lifetime_value: lifetimeValue ? Number(lifetimeValue) : 0,
      });
      resetAddForm(); setAddOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const openLog = (c: typeof customers[0]) => {
    setLogCustomerId(c.id);
    setLogMethod('call'); setLogOutcome('positive'); setLogNotes(''); setLogNextDate('');
    setLogOpen(true);
  };

  const submitLog = async () => {
    const now = new Date().toISOString();
    try {
      await createContactLog.mutateAsync({
        customer_id: logCustomerId, method: logMethod,
        outcome: logOutcome, notes: logNotes, contact_date: now,
        next_date: logNextDate || null, logged_by: user?.id,
      });
      const cust = customers.find((c) => c.id === logCustomerId);
      const freq = tierSettings[cust?.tier || 'B']?.frequency || 30;
      const nextContact = new Date(Date.now() + freq * 86400000).toISOString().split('T')[0];
      await updateCustomer.mutateAsync({
        id: logCustomerId,
        last_contact_date: now,
        last_contact_type: logMethod,
        next_contact_date: logNextDate || nextContact,
      });
      setLogOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRepeatOrder = async (c: typeof customers[0]) => {
    if (!businessId) return;
    try {
      const stages = business?.pipeline_stages || ['New'];
      await createLead.mutateAsync({
        business_id: businessId,
        name: c.name,
        company: c.company || '',
        phone: c.phone || '',
        email: c.email || '',
        stage: stages[0],
        source: 'Repeat Order',
        notes: `Repeat order from existing customer (Tier ${c.tier}). Lifetime value: ₹${Number(c.lifetime_value || 0).toLocaleString('en-IN')}`,
        created_by: user?.id,
      });
      toast.success(`Repeat order lead created for ${c.name}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const getDaysSince = (date?: string | null) => {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  };

  const getContactStatus = (c: typeof customers[0]) => {
    if (!c.last_contact_date) return 'never';
    const days = getDaysSince(c.last_contact_date)!;
    const freq = tierSettings[c.tier || 'B']?.frequency || 30;
    if (days > freq * 2) return 'dormant';
    if (days > freq) return 'overdue';
    if (days > freq - 5) return 'due_soon';
    return 'ok';
  };

  const STATUS_BADGE: Record<string, { label: string; color: string }> = {
    ok: { label: 'On Track', color: 'bg-success text-success-foreground' },
    due_soon: { label: 'Due Soon', color: 'bg-warning text-warning-foreground' },
    overdue: { label: 'Overdue', color: 'bg-destructive text-destructive-foreground' },
    dormant: { label: 'Dormant', color: 'bg-muted text-muted-foreground' },
    never: { label: 'Never Contacted', color: 'bg-destructive text-destructive-foreground' },
  };

  const queue = useMemo(() => {
    return [...customers].sort((a, b) => {
      const order: Record<string, number> = { never: 0, dormant: 1, overdue: 2, due_soon: 3, ok: 4 };
      return (order[getContactStatus(a)] || 4) - (order[getContactStatus(b)] || 4);
    });
  }, [customers, tierSettings]);

  const filtered = queue.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.company?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = useMemo(() => {
    const total = customers.length;
    const contacted = customers.filter((c) => { const d = getDaysSince(c.last_contact_date); return d !== null && d <= 30; }).length;
    const overdue = customers.filter((c) => ['overdue', 'dormant'].includes(getContactStatus(c))).length;
    const never = customers.filter((c) => !c.last_contact_date).length;
    return { total, contacted, overdue, never, coverage: total ? Math.round((contacted / total) * 100) : 0 };
  }, [customers, tierSettings]);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Customer Engagement</h1>
          <div className="flex items-center gap-2">
            <ExportMenu onCSV={() => exportCustomersCSV(customers)} onPDF={() => exportCustomersPDF(customers)} />
            <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetAddForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Customer</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
                  <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
                    <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tier</Label>
                      <Select value={tier} onValueChange={(v) => setTier(v as CustomerTier)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['A', 'B', 'C'] as CustomerTier[]).map((t) => (
                            <SelectItem key={t} value={t}>Tier {t} — {tierSettings[t]?.name || t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Lifetime Value (₹)</Label><Input type="number" value={lifetimeValue} onChange={(e) => setLifetimeValue(e.target.value)} className="mt-1" /></div>
                  </div>
                  <Button onClick={handleAddCustomer} className="w-full" disabled={createCustomer.isPending}>
                    {createCustomer.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Add Customer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="p-4 card-shadow text-center"><p className="text-2xl font-semibold tabular-nums">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></Card>
          <Card className="p-4 card-shadow text-center"><p className="text-2xl font-semibold tabular-nums">{stats.coverage}%</p><p className="text-xs text-muted-foreground">Coverage</p></Card>
          <Card className="p-4 card-shadow text-center"><p className="text-2xl font-semibold tabular-nums">{stats.contacted}</p><p className="text-xs text-muted-foreground">Contacted (30d)</p></Card>
          <Card className="p-4 card-shadow text-center"><p className="text-2xl font-semibold tabular-nums text-destructive">{stats.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></Card>
          <Card className="p-4 card-shadow text-center"><p className="text-2xl font-semibold tabular-nums">{stats.never}</p><p className="text-xs text-muted-foreground">Never Contacted</p></Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9" />
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="flex-wrap">
            <TabsTrigger value="queue" className="gap-1"><Clock className="w-4 h-4" /> Queue</TabsTrigger>
            <TabsTrigger value="all" className="gap-1"><Users className="w-4 h-4" /> All</TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-1"><BarChart3 className="w-4 h-4" /> Heatmap</TabsTrigger>
            <TabsTrigger value="dormant" className="gap-1"><AlertTriangle className="w-4 h-4" /> Dormant</TabsTrigger>
            <TabsTrigger value="team" className="gap-1"><Users className="w-4 h-4" /> Team</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-4">
            <div className="space-y-2">
              {filtered.filter((c) => getContactStatus(c) !== 'ok').length === 0 ? (
                <Card className="p-8 text-center card-shadow">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All customers are well-covered. Great job!</p>
                </Card>
              ) : filtered.filter((c) => getContactStatus(c) !== 'ok').map((c) => {
                const status = getContactStatus(c);
                const days = getDaysSince(c.last_contact_date);
                return (
                  <Card key={c.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium">{c.name}</h3>
                          <Badge className={TIER_COLORS[c.tier || 'B'] + ' text-[10px]'}>Tier {c.tier}</Badge>
                          <Badge className={STATUS_BADGE[status].color + ' text-[10px]'}>{STATUS_BADGE[status].label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.company}{c.company && ' · '}
                          {days !== null ? `Last contacted ${days}d ago` : 'Never contacted'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3">
                        {c.phone && <a href={`tel:${c.phone}`}><Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="w-4 h-4" /></Button></a>}
                        {c.phone && <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" className="h-8 w-8"><MessageSquare className="w-4 h-4" /></Button></a>}
                        <Button size="sm" variant="outline" onClick={() => openLog(c)} className="text-xs">Log Contact</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <div className="space-y-2">
              {filtered.map((c) => {
                const status = getContactStatus(c);
                const days = getDaysSince(c.last_contact_date);
                return (
                  <Card key={c.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium">{c.name}</h3>
                          <Badge className={TIER_COLORS[c.tier || 'B'] + ' text-[10px]'}>Tier {c.tier}</Badge>
                          <Badge className={STATUS_BADGE[status].color + ' text-[10px]'}>{STATUS_BADGE[status].label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[c.company, c.lifetime_value ? `₹${Number(c.lifetime_value).toLocaleString('en-IN')}` : null, days !== null ? `${days}d ago` : 'Never'].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openLog(c); }} className="text-xs">Log</Button>
                    </div>
                  </Card>
                );
              })}
              {filtered.length === 0 && <Card className="p-8 text-center card-shadow"><p className="text-sm text-muted-foreground">No customers yet.</p></Card>}
            </div>
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            <CoverageHeatmap customers={customers} tierSettings={tierSettings} />
          </TabsContent>

          <TabsContent value="dormant" className="mt-4">
            <DormantReport customers={customers} tierSettings={tierSettings} onLog={openLog} />
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <TeamPerformance
              customers={customers}
              contactLogs={allLogs}
              teamMembers={teamMembers}
              ownerName={business?.owner_name || 'Owner'}
            />
          </TabsContent>
        </Tabs>

        {/* Contact Log Dialog */}
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Contact</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Method</Label>
                <Select value={logMethod} onValueChange={(v) => setLogMethod(v as ContactMethod)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="meeting">🤝 Meeting</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outcome</Label>
                <Select value={logOutcome} onValueChange={(v) => setLogOutcome(v as ContactOutcome)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive Response</SelectItem>
                    <SelectItem value="follow_up">Need Follow Up</SelectItem>
                    <SelectItem value="not_reachable">Not Reachable</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} className="mt-1" rows={2} /></div>
              <div><Label>Next Contact Date</Label><Input type="date" value={logNextDate} onChange={(e) => setLogNextDate(e.target.value)} className="mt-1" /></div>
              <Button onClick={submitLog} className="w-full" disabled={createContactLog.isPending}>
                {createContactLog.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Save Contact Log
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Detail Sheet */}
        <Sheet open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {selectedCustomer && (
              <CustomerDetail customer={selectedCustomer} tierSettings={tierSettings} onLog={() => { openLog(selectedCustomer); setSelectedCustomer(null); }} onRepeatOrder={() => { handleRepeatOrder(selectedCustomer); }} />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

function CustomerDetail({ customer, tierSettings, onLog, onRepeatOrder }: { customer: any; tierSettings: any; onLog: () => void; onRepeatOrder: () => void }) {
  const { data: logs = [] } = useContactLogs(customer.id);
  const days = customer.last_contact_date ? Math.floor((Date.now() - new Date(customer.last_contact_date).getTime()) / 86400000) : null;

  return (
    <>
      <SheetHeader><SheetTitle>{customer.name}</SheetTitle></SheetHeader>
      <div className="mt-6 space-y-5">
        <div className="flex gap-2 flex-wrap">
          {customer.phone && <a href={`tel:${customer.phone}`}><Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> Call</Button></a>}
          {customer.phone && <a href={`https://wa.me/91${customer.phone}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">💬 WhatsApp</Button></a>}
          <Button size="sm" onClick={onLog}>Log Contact</Button>
          <Button size="sm" variant="outline" onClick={onRepeatOrder} className="gap-1"><RefreshCw className="w-3.5 h-3.5" /> Repeat Order</Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Company</p><p className="font-medium">{customer.company || '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Tier</p><Badge className={TIER_COLORS[customer.tier as CustomerTier || 'B']}>Tier {customer.tier}</Badge></div>
          <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium font-mono text-xs">{customer.phone || '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium text-xs truncate">{customer.email || '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Lifetime Value</p><p className="font-medium tabular-nums">{customer.lifetime_value ? `₹${Number(customer.lifetime_value).toLocaleString('en-IN')}` : '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Last Contact</p><p className="font-medium">{days !== null ? `${days} days ago` : 'Never'}</p></div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Contact History</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact logs yet.</p>
          ) : logs.map((log) => (
            <div key={log.id} className="mb-3 p-3 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">{log.method}</Badge>
                <Badge variant="outline" className="text-[10px]">{log.outcome}</Badge>
                <span className="text-[10px] text-muted-foreground">{log.contact_date ? new Date(log.contact_date).toLocaleDateString('en-IN') : ''}</span>
              </div>
              {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
