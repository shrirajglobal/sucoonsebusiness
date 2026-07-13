import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { isSuperAdmin } from '@/lib/prelaunch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  LayoutDashboard, Building2, CreditCard, Users, Gift, LifeBuoy,
  Shield, ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Send, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import ManagePlanDialog from '@/components/admin/ManagePlanDialog';

function useAdminData(view: string, extra?: Record<string, string>) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['super-admin', view, extra],
    queryFn: async () => {
      const params = new URLSearchParams({ view, ...(extra || {}) });
      const { data, error } = await supabase.functions.invoke('super-admin-data', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      // Use POST with body since GET params don't work well with invoke
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-admin-data?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${session?.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!session,
  });
}

function adminAction(session: any, body: Record<string, unknown>) {
  return fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-admin-action`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
}

function OverviewTab() {
  const { data, isLoading } = useAdminData('overview');
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const stats = [
    { label: 'Total Businesses', value: data?.totalBusinesses || 0, icon: Building2 },
    { label: 'Total Users', value: data?.totalUsers || 0, icon: Users },
    { label: 'Active Trials', value: data?.activeTrials || 0, icon: CheckCircle },
    { label: 'Expired Trials', value: data?.expiredTrials || 0, icon: XCircle },
    { label: 'Total Referrals', value: data?.totalReferrals || 0, icon: Gift },
    { label: 'Rewarded', value: data?.rewardedReferrals || 0, icon: Gift },
    { label: 'Affiliates', value: data?.totalAffiliates || 0, icon: Users },
    { label: 'Pending Affiliates', value: data?.pendingAffiliates || 0, icon: Clock },
    { label: 'Open Tickets', value: data?.openTickets || 0, icon: LifeBuoy },
    { label: 'Total Tickets', value: data?.totalTickets || 0, icon: LifeBuoy },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="p-4 text-center">
          <s.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

function BusinessesTab() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminData('businesses');
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const businesses = data?.businesses || [];
  const subs = data?.subscriptions || [];
  const subMap = new Map(subs.map((s: any) => [s.business_id, s]));

  async function handleSetPlan(businessId: string, currentPlan: string) {
    const newPlan = planDraft[businessId] || currentPlan;
    if (newPlan === currentPlan) {
      toast.info('Plan unchanged');
      return;
    }
    if (!confirm(`Change plan from "${currentPlan}" to "${newPlan}"? This is logged.`)) return;
    setSavingId(businessId);
    try {
      const res = await adminAction(session, {
        action: 'set_business_plan',
        business_id: businessId,
        new_plan: newPlan,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
      toast.success(`Plan set to ${newPlan}`);
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to update plan');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Trial End</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Manage Plan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((b: any) => {
            const sub = subMap.get(b.id) as any;
            const currentPlan = sub?.plan || 'starter';
            const draft = planDraft[b.id] ?? currentPlan;
            return (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.owner_name}</TableCell>
                <TableCell><Badge variant="outline">{b.business_type}</Badge></TableCell>
                <TableCell>
                  <Badge>{currentPlan}</Badge>
                  {sub?.activation_source && (
                    <span className="ml-2 text-xs text-muted-foreground">{sub.activation_source}</span>
                  )}
                </TableCell>
                <TableCell>{sub?.trial_end ? format(new Date(sub.trial_end), 'dd MMM yyyy') : '—'}</TableCell>
                <TableCell>{format(new Date(b.created_at), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  {sub ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 rounded border border-input bg-background px-2 text-sm"
                        value={draft}
                        onChange={(e) => setPlanDraft({ ...planDraft, [b.id]: e.target.value })}
                      >
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="scale">Scale</option>
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savingId === b.id || draft === currentPlan}
                        onClick={() => handleSetPlan(b.id, currentPlan)}
                      >
                        {savingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No subscription</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SubscriptionsTab() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminData('subscriptions');
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [tierFilter, setTierFilter] = useState<string>('all');

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const subs = (data?.subscriptions || []) as any[];
  const bizMap = new Map((data?.businesses || []).map((b: any) => [b.id, b.name]));

  const filtered = tierFilter === 'all' ? subs : subs.filter((s) => s.plan === tierFilter);

  const tierCounts = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.plan || 'unknown'] = (acc[s.plan || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  const handleExtend = async (subId: string) => {
    const days = parseInt(extendDays[subId] || '0');
    if (days <= 0) return;
    const res = await adminAction(session, { action: 'extend_trial', subscription_id: subId, extra_days: days });
    if (res.ok) {
      toast.success(`Extended by ${days} days`);
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    } else toast.error('Failed');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'starter', 'growth', 'scale'].map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${tierFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {t} {t !== 'all' && tierCounts[t] ? `(${tierCounts[t]})` : t === 'all' ? `(${subs.length})` : '(0)'}
          </button>
        ))}
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial End</TableHead>
              <TableHead>Extra Days</TableHead>
              <TableHead>Extend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{bizMap.get(s.business_id) as string || s.business_id}</TableCell>
                <TableCell><Badge className="capitalize">{s.plan}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.billing_cycle || 'monthly'}</Badge></TableCell>
                <TableCell><Badge variant={s.status === 'active' || s.status === 'trialing' ? 'default' : 'destructive'}>{s.status}</Badge></TableCell>
                <TableCell>{s.trial_end ? format(new Date(s.trial_end), 'dd MMM yyyy') : '—'}</TableCell>
                <TableCell>{s.extra_days}d</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Input
                      type="number" placeholder="Days" className="w-20 h-8"
                      value={extendDays[s.id] || ''}
                      onChange={(e) => setExtendDays({ ...extendDays, [s.id]: e.target.value })}
                    />
                    <Button size="sm" variant="outline" onClick={() => handleExtend(s.id)}>+</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ReferralsTab() {
  const { data, isLoading } = useAdminData('referrals');
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Referred Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reward Days</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.referrals || []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.referral_code}</TableCell>
              <TableCell>{r.referred_email || '—'}</TableCell>
              <TableCell>
                <Badge variant={r.status === 'rewarded' ? 'default' : r.status === 'joined' ? 'secondary' : 'outline'}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell>{r.reward_days}d</TableCell>
              <TableCell>{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AffiliatesTab() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminData('affiliates');
  const [commissionEdit, setCommissionEdit] = useState<Record<string, string>>({});

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const handleAction = async (affiliateId: string, action: string) => {
    const res = await adminAction(session, { action, affiliate_id: affiliateId });
    if (res.ok) {
      toast.success(action === 'approve_affiliate' ? 'Approved!' : 'Suspended');
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    } else toast.error('Failed');
  };

  const handleCommission = async (affiliateId: string) => {
    const rate = parseFloat(commissionEdit[affiliateId] || '0');
    if (rate <= 0) return;
    const res = await adminAction(session, { action: 'update_commission', affiliate_id: affiliateId, commission_rate: rate });
    if (res.ok) {
      toast.success('Commission updated');
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    }
  };

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Commission %</TableHead>
            <TableHead>Signups</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.affiliates || []).map((a: any) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.phone || '—'}</TableCell>
              <TableCell className="font-mono text-xs">{a.affiliate_code}</TableCell>
              <TableCell>
                <Badge variant={a.status === 'approved' ? 'default' : a.status === 'pending' ? 'secondary' : 'destructive'}>
                  {a.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Input
                    type="number" className="w-16 h-8"
                    defaultValue={a.commission_rate}
                    onChange={(e) => setCommissionEdit({ ...commissionEdit, [a.id]: e.target.value })}
                  />
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => handleCommission(a.id)}>✓</Button>
                </div>
              </TableCell>
              <TableCell>{a.total_signups}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {a.status !== 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => handleAction(a.id, 'approve_affiliate')}>Approve</Button>
                  )}
                  {a.status !== 'suspended' && (
                    <Button size="sm" variant="destructive" onClick={() => handleAction(a.id, 'suspend_affiliate')}>Suspend</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TicketsTab() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminData('tickets');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reply, setReply] = useState('');
  const { data: msgData } = useAdminData('ticket_messages', selectedTicket ? { ticket_id: selectedTicket.id } : undefined);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    const res = await adminAction(session, { action: 'reply_ticket', ticket_id: selectedTicket.id, content: reply });
    if (res.ok) {
      toast.success('Reply sent');
      setReply('');
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    }
  };

  const handleResolve = async (ticketId: string) => {
    const res = await adminAction(session, { action: 'resolve_ticket', ticket_id: ticketId });
    if (res.ok) {
      toast.success('Ticket resolved');
      setSelectedTicket(null);
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    }
  };

  if (selectedTicket) {
    const messages = msgData?.messages || [];
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Card className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold">{selectedTicket.subject}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedTicket.user_name} · {selectedTicket.category} · {format(new Date(selectedTicket.created_at), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge>{selectedTicket.status}</Badge>
              {selectedTicket.status !== 'resolved' && (
                <Button size="sm" variant="outline" onClick={() => handleResolve(selectedTicket.id)}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm mb-4">{selectedTicket.description}</p>

          <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
            {messages.map((m: any) => (
              <div key={m.id} className={`p-3 rounded-lg text-sm ${m.sender_type === 'admin' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                <p className="font-medium text-xs mb-1">{m.sender_name}</p>
                <p>{m.content}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea placeholder="Type reply..." value={reply} onChange={(e) => setReply(e.target.value)} className="flex-1" rows={2} />
            <Button onClick={handleReply} disabled={!reply.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.tickets || []).map((t: any) => (
            <TableRow key={t.id} className="cursor-pointer hover:bg-accent" onClick={() => setSelectedTicket(t)}>
              <TableCell className="font-medium">{t.subject}</TableCell>
              <TableCell>{t.user_name}</TableCell>
              <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
              <TableCell>
                <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'urgent' ? 'destructive' : 'secondary'}>
                  {t.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={t.status === 'open' ? 'default' : t.status === 'resolved' ? 'secondary' : 'outline'}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(t.created_at), 'dd MMM')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UpgradeRequestsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'upgrade_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upgrade_requests')
        .select('*, businesses(name, phone, owner_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('upgrade_requests').update({ status }).eq('id', id);
    if (error) return toast.error('Failed to update');
    toast.success('Updated');
    qc.invalidateQueries({ queryKey: ['super-admin', 'upgrade_requests'] });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const rows = (data || []) as any[];
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No upgrade requests yet. When a customer clicks Upgrade in-app, their request will land here.
      </Card>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Context</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.businesses?.name || r.business_id}</TableCell>
              <TableCell>{r.requester_name || r.businesses?.owner_name || '—'}</TableCell>
              <TableCell className="font-mono text-xs">{r.requester_phone || r.businesses?.phone || '—'}</TableCell>
              <TableCell><Badge className="capitalize">{r.requested_tier}</Badge></TableCell>
              <TableCell className="text-xs">{r.module_context || '—'}</TableCell>
              <TableCell className="max-w-xs text-xs whitespace-pre-wrap">{r.note || '—'}</TableCell>
              <TableCell>
                <Badge variant={r.status === 'new' ? 'default' : r.status === 'converted' ? 'secondary' : 'outline'} className="capitalize">
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{format(new Date(r.created_at), 'dd MMM, HH:mm')}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {r.status !== 'contacted' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'contacted')}>Contacted</Button>
                  )}
                  {r.status !== 'converted' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'converted')}>Converted</Button>
                  )}
                  {r.status !== 'dismissed' && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, 'dismissed')}>Dismiss</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function SuperAdmin() {
  const { user } = useAuth();

  if (!isSuperAdmin(user?.email)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Disha Super Admin</h1>
            <p className="text-xs text-muted-foreground">Manage businesses, subscriptions & affiliates</p>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" asChild>
              <a href="/">← Back to App</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="overview"><LayoutDashboard className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="businesses"><Building2 className="w-3.5 h-3.5 mr-1" />Businesses</TabsTrigger>
            <TabsTrigger value="subscriptions"><CreditCard className="w-3.5 h-3.5 mr-1" />Subscriptions</TabsTrigger>
            <TabsTrigger value="upgrades"><Sparkles className="w-3.5 h-3.5 mr-1" />Upgrade Requests</TabsTrigger>
            <TabsTrigger value="referrals"><Gift className="w-3.5 h-3.5 mr-1" />Referrals</TabsTrigger>
            <TabsTrigger value="affiliates"><Users className="w-3.5 h-3.5 mr-1" />Affiliates</TabsTrigger>
            <TabsTrigger value="tickets"><LifeBuoy className="w-3.5 h-3.5 mr-1" />Support</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="businesses"><BusinessesTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent value="upgrades"><UpgradeRequestsTab /></TabsContent>
          <TabsContent value="referrals"><ReferralsTab /></TabsContent>
          <TabsContent value="affiliates"><AffiliatesTab /></TabsContent>
          <TabsContent value="tickets"><TicketsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
