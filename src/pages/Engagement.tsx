import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
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
import type { Customer, CustomerTier, ContactMethod, ContactOutcome } from '@/types';
import { Plus, Phone, Search, Heart, Users, AlertTriangle, CheckCircle2, Clock, MessageSquare } from 'lucide-react';

function generateId() { return Math.random().toString(36).substring(2, 10); }

const TIER_COLORS: Record<CustomerTier, string> = {
  A: 'bg-destructive text-destructive-foreground', B: 'bg-warning text-warning-foreground', C: 'bg-muted text-muted-foreground',
};

export default function Engagement() {
  const { customers, addCustomer, updateCustomer, contactLogs, addContactLog, business, teamMembers } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');

  // Add customer form
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<CustomerTier>('B');
  const [assignedTo, setAssignedTo] = useState('');
  const [lifetimeValue, setLifetimeValue] = useState('');

  // Contact log form
  const [logMethod, setLogMethod] = useState<ContactMethod>('call');
  const [logOutcome, setLogOutcome] = useState<ContactOutcome>('positive');
  const [logNotes, setLogNotes] = useState('');
  const [logNextDate, setLogNextDate] = useState('');
  const [logCustomerId, setLogCustomerId] = useState('');

  const resetAddForm = () => {
    setName(''); setCompany(''); setPhone(''); setEmail(''); setTier('B'); setAssignedTo(''); setLifetimeValue('');
  };

  const handleAddCustomer = () => {
    if (!name.trim()) return;
    addCustomer({
      id: generateId(), name, company, phone, email, tier, assignedTo,
      lifetimeValue: lifetimeValue ? Number(lifetimeValue) : undefined,
      createdAt: new Date().toISOString(),
    });
    resetAddForm(); setAddOpen(false);
  };

  const openLog = (c: Customer) => {
    setLogCustomerId(c.id);
    setLogMethod('call'); setLogOutcome('positive'); setLogNotes(''); setLogNextDate('');
    setLogOpen(true);
  };

  const submitLog = () => {
    const now = new Date().toISOString();
    addContactLog({
      id: generateId(), customerId: logCustomerId, method: logMethod,
      outcome: logOutcome, notes: logNotes, contactDate: now,
      nextDate: logNextDate || undefined,
    });
    // Update customer last contact
    const freq = business?.tierSettings?.[customers.find((c) => c.id === logCustomerId)?.tier || 'B']?.frequency || 30;
    const nextContact = new Date(Date.now() + freq * 86400000).toISOString().split('T')[0];
    updateCustomer(logCustomerId, {
      lastContactDate: now,
      lastContactType: logMethod,
      nextContactDate: logNextDate || nextContact,
    });
    setLogOpen(false);
  };

  const getDaysSince = (date?: string) => {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  };

  const getContactStatus = (c: Customer) => {
    if (!c.lastContactDate) return 'never';
    const days = getDaysSince(c.lastContactDate)!;
    const freq = business?.tierSettings?.[c.tier]?.frequency || 30;
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

  // Daily queue: overdue + due soon first
  const queue = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aStatus = getContactStatus(a);
      const bStatus = getContactStatus(b);
      const order = { never: 0, dormant: 1, overdue: 2, due_soon: 3, ok: 4 };
      return (order[aStatus] || 4) - (order[bStatus] || 4);
    });
  }, [customers, business]);

  const filtered = queue.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.company?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Coverage stats
  const stats = useMemo(() => {
    const total = customers.length;
    const contacted = customers.filter((c) => {
      const d = getDaysSince(c.lastContactDate);
      return d !== null && d <= 30;
    }).length;
    const overdue = customers.filter((c) => ['overdue', 'dormant'].includes(getContactStatus(c))).length;
    const never = customers.filter((c) => !c.lastContactDate).length;
    return { total, contacted, overdue, never, coverage: total ? Math.round((contacted / total) * 100) : 0 };
  }, [customers, business]);

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Customer Engagement</h1>
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
                          <SelectItem key={t} value={t}>Tier {t} — {business?.tierSettings?.[t]?.name || t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Lifetime Value (₹)</Label><Input type="number" value={lifetimeValue} onChange={(e) => setLifetimeValue(e.target.value)} className="mt-1" /></div>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{business?.ownerName || 'Owner'}</SelectItem>
                      {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddCustomer} className="w-full">Add Customer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Coverage Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{stats.coverage}%</p>
            <p className="text-xs text-muted-foreground">Coverage</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{stats.contacted}</p>
            <p className="text-xs text-muted-foreground">Contacted (30d)</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums text-destructive">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{stats.never}</p>
            <p className="text-xs text-muted-foreground">Never Contacted</p>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9" />
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue" className="gap-1"><Clock className="w-4 h-4" /> Contact Queue</TabsTrigger>
            <TabsTrigger value="all" className="gap-1"><Users className="w-4 h-4" /> All Customers</TabsTrigger>
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
                const days = getDaysSince(c.lastContactDate);
                return (
                  <Card key={c.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1" onClick={() => setSelectedCustomer(c)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium">{c.name}</h3>
                          <Badge className={TIER_COLORS[c.tier] + ' text-[10px]'}>Tier {c.tier}</Badge>
                          <Badge className={STATUS_BADGE[status].color + ' text-[10px]'}>{STATUS_BADGE[status].label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.company}{c.company && ' · '}
                          {days !== null ? `Last contacted ${days}d ago` : 'Never contacted'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3">
                        {c.phone && (
                          <a href={`tel:${c.phone}`}><Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="w-4 h-4" /></Button></a>
                        )}
                        {c.phone && (
                          <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-8 w-8"><MessageSquare className="w-4 h-4" /></Button>
                          </a>
                        )}
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
                const days = getDaysSince(c.lastContactDate);
                return (
                  <Card key={c.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium">{c.name}</h3>
                          <Badge className={TIER_COLORS[c.tier] + ' text-[10px]'}>Tier {c.tier}</Badge>
                          <Badge className={STATUS_BADGE[status].color + ' text-[10px]'}>{STATUS_BADGE[status].label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[c.company, c.lifetimeValue ? `₹${c.lifetimeValue.toLocaleString('en-IN')}` : null, days !== null ? `${days}d ago` : 'Never'].filter(Boolean).join(' · ')}
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
              <Button onClick={submitLog} className="w-full">Save Contact Log</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Detail Sheet */}
        <Sheet open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {selectedCustomer && (() => {
              const logs = contactLogs.filter((l) => l.customerId === selectedCustomer.id).sort((a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime());
              return (
                <>
                  <SheetHeader><SheetTitle>{selectedCustomer.name}</SheetTitle></SheetHeader>
                  <div className="mt-6 space-y-5">
                    <div className="flex gap-2">
                      {selectedCustomer.phone && <a href={`tel:${selectedCustomer.phone}`}><Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> Call</Button></a>}
                      {selectedCustomer.phone && <a href={`https://wa.me/91${selectedCustomer.phone}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">💬 WhatsApp</Button></a>}
                      <Button size="sm" onClick={() => { openLog(selectedCustomer); setSelectedCustomer(null); }}>Log Contact</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-muted-foreground text-xs">Company</p><p className="font-medium">{selectedCustomer.company || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">Tier</p><Badge className={TIER_COLORS[selectedCustomer.tier]}>Tier {selectedCustomer.tier}</Badge></div>
                      <div><p className="text-muted-foreground text-xs">Lifetime Value</p><p className="font-medium tabular-nums">{selectedCustomer.lifetimeValue ? `₹${selectedCustomer.lifetimeValue.toLocaleString('en-IN')}` : '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium font-mono text-xs">{selectedCustomer.phone || '—'}</p></div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3">Contact History</h3>
                      {logs.length === 0 ? <p className="text-sm text-muted-foreground">No contact history yet.</p> : (
                        <div className="space-y-3">
                          {logs.map((log) => (
                            <div key={log.id} className="p-3 rounded-lg bg-accent/50">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] capitalize">{log.method}</Badge>
                                <Badge variant="outline" className="text-[10px]">{log.outcome.replace('_', ' ')}</Badge>
                                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(log.contactDate).toLocaleDateString('en-IN')}</span>
                              </div>
                              {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
