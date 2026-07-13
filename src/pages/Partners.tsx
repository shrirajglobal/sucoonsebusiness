import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/shared/EmptyState';
import ExportMenu from '@/components/shared/ExportMenu';
import CreatableSearchSelect from '@/components/shared/CreatableSearchSelect';
import { Handshake, Package, Receipt, Users, Plus, Loader2, AlertTriangle, Sparkles, PencilLine, BarChart3, FileText, Search, TrendingUp, Clock, Wallet, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useCustomers } from '@/hooks/useSupabaseData';
import { useVendors } from '@/hooks/usePhase4Data';
import { useUserRole, hasMinRole } from '@/hooks/useRBAC';
import { getPartnerLabels, getModulePurpose } from '@/lib/constants';
import { exportPartnerBillsCSV, exportPartnerBillsPDF, exportReceivablesCSV } from '@/lib/exportUtils';
import type { BusinessType } from '@/types';
import type { AppRole } from '@/hooks/useRBAC';

// Inline creation helpers — insert with .select() so we can auto-select the new row,
// and invalidate the same query keys that Vendors.tsx / Engagement.tsx use so the
// record appears everywhere else, not just here. Phase 7: opening_balance is optional
// and captured inline via CreatableSearchSelect's promptOpeningBalance prop.
async function createVendorInline(businessId: string, name: string, extras?: { opening_balance?: number }) {
  const row: any = { business_id: businessId, name };
  if (extras?.opening_balance != null) row.opening_balance = extras.opening_balance;
  const { data, error } = await supabase
    .from('vendors')
    .insert(row)
    .select('id, name')
    .single();
  if (error) throw error;
  return { id: data.id, label: data.name };
}

async function createCustomerInline(businessId: string, name: string, extras?: { opening_balance?: number }) {
  const row: any = { business_id: businessId, name };
  if (extras?.opening_balance != null) row.opening_balance = extras.opening_balance;
  const { data, error } = await supabase
    .from('customers')
    .insert(row)
    .select('id, name')
    .single();
  if (error) throw error;
  return { id: data.id, label: data.name };
}

// Products don't carry a balance, so extras are ignored here.
async function createProductInline(businessId: string, name: string) {
  const { data, error } = await supabase
    .from('products')
    .insert({ business_id: businessId, name })
    .select('id, name, category')
    .single();
  if (error) throw error;
  return { id: data.id, label: data.name, category: data.category as string | null };
}
import {
  useVendorProducts, useCreateVendorProduct,
  useProducts,
  useCommissionRules, useUpsertCommissionRule, findApplicableRule, calcCommission,
  usePartnerOrders, useCreatePartnerOrder, useUpdatePartnerOrder,
  useLogPartnerOrder, useGenerateInvoiceForOrder,
  useCommissionTransactions, useUpdateCommissionStatus,
  useCommissionOverrides, useOverrideCommission,
  useClientVendorBalances,
} from '@/hooks/usePartnerNetwork';

const PAYMENT_TERMS_OPTIONS: { value: string; label: string }[] = [
  { value: 'advance', label: 'Advance' },
  { value: 'immediate', label: 'Immediate' },
  { value: '7_days', label: '7 days' },
  { value: '15_days', label: '15 days' },
  { value: '30_days', label: '30 days' },
  { value: '45_days', label: '45 days' },
  { value: '60_days', label: '60 days' },
];
const paymentTermsLabel = (v: string | null) => PAYMENT_TERMS_OPTIONS.find((o) => o.value === v)?.label || '—';

// Verticals where physical dispatch / transport paperwork (LR number, dispatch
// status) is actually part of the workflow. Agency / Finance / Real Estate /
// Services / Education / Custom sell intangibles or bespoke work, so hiding
// those fields removes noise without removing capability.
const TRANSPORT_VERTICALS: BusinessType[] = ['manufacturing', 'trading', 'retail'];
const isTransportVertical = (t: BusinessType | null) => !!t && TRANSPORT_VERTICALS.includes(t);

// Aging bucket helper — days into 0-30 / 31-60 / 60+.
function agingBucket(days: number): '0-30' | '31-60' | '60+' {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  return '60+';
}

export default function Partners() {
  const { businessId } = useAuth();
  const { data: business } = useBusiness();
  const businessType = (business?.business_type as BusinessType) ?? null;
  const labels = getPartnerLabels(businessType);
  const purpose = getModulePurpose('partner_network', businessType);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{labels.navLabel}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{purpose}</p>
        </div>

        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 md:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80 mb-2">How it works</p>
          <ol className="flex flex-col md:flex-row gap-2 md:gap-3 text-xs md:text-sm">
            <li className="flex-1 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
              <span>Add a <b>{labels.partner.toLowerCase()}</b> and their <b>{labels.item.toLowerCase()}s</b>.</span>
            </li>
            <li className="flex-1 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
              <span>Record a deal — pick the {labels.partner.toLowerCase()} and amount.</span>
            </li>
            <li className="flex-1 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
              <span>Commission is calculated automatically and tracked till payout.</span>
            </li>
          </ol>
        </div>


        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="bills" className="text-xs">Bills</TabsTrigger>
            <TabsTrigger value="directory" className="text-xs">Directory</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><OverviewTab labels={labels} businessType={businessType} /></TabsContent>
          <TabsContent value="bills" className="mt-4"><BillsTab labels={labels} businessType={businessType} /></TabsContent>
          <TabsContent value="directory" className="mt-4"><VendorsClientsTab labels={labels} /></TabsContent>
          <TabsContent value="reports" className="mt-4"><ReportsTab labels={labels} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ============================================================
// 0. Overview — CRO landing surface. Answers "what money is owed to me?"
//    before any data-entry chrome.
// ============================================================
function OverviewTab({ labels, businessType }: { labels: { partner: string; item: string }; businessType: BusinessType | null }) {
  const { data: txns } = useCommissionTransactions();
  const { data: orders } = usePartnerOrders();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const { data: rules } = useCommissionRules();
  const updateStatus = useUpdateCommissionStatus();
  const updateOrder = useUpdatePartnerOrder();

  const clientName = (id: string) => customers?.find((c: any) => c.id === id)?.name || '—';
  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';
  const orderById = (id: string) => (orders || []).find((o: any) => o.id === id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalReceivable = (txns || [])
    .filter((t: any) => t.status === 'receivable')
    .reduce((s: number, t: any) => s + Number(t.commission_amount), 0);
  const overdueTxns = (txns || []).filter(
    (t: any) => t.status === 'receivable' && t.receivable_since &&
      differenceInDays(now, new Date(t.receivable_since)) > 30
  );
  const overdueAmount = overdueTxns.reduce((s: number, t: any) => s + Number(t.commission_amount), 0);
  const thisMonthEarned = (txns || [])
    .filter((t: any) => t.status === 'received' && t.received_date && new Date(t.received_date) >= monthStart)
    .reduce((s: number, t: any) => s + Number(t.commission_amount), 0);
  const ordersToInvoice = (orders || []).filter((o: any) => o.order_stage === 'order_placed');

  const receivables = (txns || [])
    .filter((t: any) => t.status === 'receivable')
    .sort((a: any, b: any) => {
      const da = a.receivable_since ? new Date(a.receivable_since).getTime() : 0;
      const db = b.receivable_since ? new Date(b.receivable_since).getTime() : 0;
      return da - db;
    })
    .slice(0, 5);
  const awaitingPayment = (orders || [])
    .filter((o: any) => o.order_stage === 'invoiced' && o.client_payment_status !== 'paid')
    .slice(0, 5);

  const goToTab = (value: string) => {
    document.querySelector<HTMLButtonElement>(`[value="${value}"]`)?.click();
  };

  const noRules = !(rules || []).length;
  const noData = !(orders || []).length && !(txns || []).length;

  // First-run: no rate + no bills — show a single focused CTA rather than
  // dumping empty KPIs on a new user.
  if (noData) {
    return (
      <div className="space-y-4">
        {noRules && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">Step 1 — Set your commission rate</p>
              <p className="text-xs text-muted-foreground">
                So every bill auto-calculates what you earn. You can override per {labels.partner.toLowerCase()} later.
              </p>
            </div>
            <Button size="sm" onClick={() => goToTab('bills')}>Set rate</Button>
          </div>
        )}
        <EmptyState
          icon={Wallet}
          title="Your commission dashboard"
          description={`Once you record your first bill, this page shows what's owed to you and what's overdue — at a glance.`}
          actionLabel="Create first bill"
          onAction={() => goToTab('bills')}
        />
      </div>
    );
  }

  const Kpi = ({ icon: Icon, label, value, tone, onClick, sub }: any) => (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-3 hover:border-primary/40 transition-colors bg-card ${tone || ''}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className="text-lg md:text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </button>
  );

  return (
    <div className="space-y-4">
      {noRules && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-2.5 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="flex-1">Set a default commission rate so new bills auto-calculate what you earn.</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => goToTab('bills')}>Set rate</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <Kpi
          icon={Wallet}
          label="Receivable"
          value={`₹${totalReceivable.toLocaleString('en-IN')}`}
          sub={`${(txns || []).filter((t: any) => t.status === 'receivable').length} bill${(txns || []).filter((t: any) => t.status === 'receivable').length === 1 ? '' : 's'}`}
          onClick={() => goToTab('reports')}
        />
        <Kpi
          icon={AlertTriangle}
          label="Overdue 30+ d"
          value={`₹${overdueAmount.toLocaleString('en-IN')}`}
          sub={`${overdueTxns.length} to chase`}
          tone={overdueAmount > 0 ? 'border-warning/40 bg-warning/5' : ''}
          onClick={() => goToTab('reports')}
        />
        <Kpi
          icon={TrendingUp}
          label="Earned this month"
          value={`₹${thisMonthEarned.toLocaleString('en-IN')}`}
          sub={format(now, 'MMM yyyy')}
          onClick={() => goToTab('reports')}
        />
        <Kpi
          icon={Clock}
          label="Orders to invoice"
          value={ordersToInvoice.length}
          sub={ordersToInvoice.length ? 'Convert to bills' : 'All caught up'}
          onClick={() => goToTab('bills')}
        />
      </div>

      {receivables.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Money you can collect now</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => goToTab('reports')}>See all</Button>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {receivables.map((t: any) => {
              const o = orderById(t.partner_order_id);
              const days = t.receivable_since ? differenceInDays(now, new Date(t.receivable_since)) : 0;
              const overdue = days > 30;
              return (
                <div key={t.id} className={`p-3 flex items-center justify-between gap-2 ${overdue ? 'bg-warning/5 border-l-2 border-l-warning' : ''}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {o ? `${clientName(o.client_id)} → ${vendorName(o.vendor_id)}` : 'Bill deleted'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Receivable {days}d{overdue ? ' · overdue' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">₹{Number(t.commission_amount).toLocaleString('en-IN')}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                      onClick={() => { updateStatus.mutate({ id: t.id, status: 'received' }); toast.success('Marked received'); }}>
                      Received
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {awaitingPayment.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Bills awaiting client payment</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => goToTab('bills')}>See all</Button>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {awaitingPayment.map((o: any) => {
              const daysToDue = o.due_date ? differenceInDays(new Date(o.due_date), now) : null;
              return (
                <div key={o.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{clientName(o.client_id)} → {vendorName(o.vendor_id)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      ₹{Number(o.amount).toLocaleString('en-IN')}
                      {daysToDue !== null && (
                        <span className={daysToDue < 0 ? 'text-warning' : ''}>
                          {' · '}{daysToDue < 0 ? `${Math.abs(daysToDue)}d overdue` : `due in ${daysToDue}d`}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                    onClick={() => {
                      updateOrder.mutate({ id: o.id, client_payment_status: 'paid' });
                      toast.success('Payment recorded — commission moved to receivable');
                    }}>
                    Mark paid
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {ordersToInvoice.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Orders to invoice</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => goToTab('bills')}>Go to bills</Button>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {ordersToInvoice.slice(0, 5).map((o: any) => (
              <div key={o.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{clientName(o.client_id)} → {vendorName(o.vendor_id)}</p>
                  <p className="text-[11px] text-muted-foreground">Logged {format(new Date(o.order_date), 'dd MMM')} · ₹{Number(o.amount).toLocaleString('en-IN')} expected</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => goToTab('bills')}>
                  <Receipt className="w-3.5 h-3.5 mr-1" />Generate
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// 1. Directory (vendor_products) — item ↔ partner lookup + AI search
// ============================================================
function VendorsClientsTab({ labels }: { labels: { partner: string; item: string } }) {
  const { businessId } = useAuth();
  const qc = useQueryClient();
  const { data: mappings, isLoading } = useVendorProducts();
  const { data: vendors } = useVendors();
  const { data: catalogProducts } = useProducts();
  const createProduct = useCreateVendorProduct();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [form, setForm] = useState({ vendor_id: '', product_id: '', unit_price: '', notes: '' });

  // Phase 6: vendor_products.product_id is NOT NULL now — name/category
  // always come from the linked product master, no legacy fallback needed.
  const catalogById = useMemo(() => {
    const m: Record<string, { name: string; category: string | null }> = {};
    (catalogProducts || []).forEach((p: any) => { m[p.id] = { name: p.name, category: p.category }; });
    return m;
  }, [catalogProducts]);
  const displayName = (m: any) => catalogById[m.product_id]?.name || '—';
  const displayCategory = (m: any) => catalogById[m.product_id]?.category ?? null;

  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);

  const runAiSearch = async () => {
    const q = aiQuery.trim();
    if (!q) { setAiResults(null); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { mode: 'partner_search', query: q },
      });
      if (error) throw error;
      setAiResults(Array.isArray(data?.results) ? data.results : []);
    } catch (e: any) {
      toast.error(e.message || 'AI search failed');
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    (mappings || []).forEach((m) => { const c = displayCategory(m); if (c) set.add(c); });
    return Array.from(set);
  }, [mappings, catalogById]);

  const filtered = useMemo(() => {
    return (mappings || []).filter((m) => {
      const q = search.toLowerCase();
      const name = displayName(m);
      const cat = displayCategory(m);
      const matchQ = !q || name.toLowerCase().includes(q) || (cat || '').toLowerCase().includes(q);
      const matchC = categoryFilter === 'all' || cat === categoryFilter;
      return matchQ && matchC;
    });
  }, [mappings, search, categoryFilter, catalogById]);

  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';

  const handleSubmit = async () => {
    if (!form.vendor_id || !form.product_id) {
      toast.error(`${labels.partner} and ${labels.item.toLowerCase()} name are required`);
      return;
    }
    await createProduct.mutateAsync({
      business_id: businessId!,
      vendor_id: form.vendor_id,
      product_id: form.product_id,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      notes: form.notes || null,
    });
    toast.success(`${labels.item} added`);
    setOpen(false);
    setForm({ vendor_id: '', product_id: '', unit_price: '', notes: '' });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const AddDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8"><Plus className="w-4 h-4 mr-1" />Add mapping</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New {labels.item.toLowerCase()} mapping</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{labels.partner}</Label>
            <CreatableSearchSelect
              value={form.vendor_id}
              onChange={(v) => setForm((f) => ({ ...f, vendor_id: v }))}
              options={(vendors || []).map((v: any) => ({ id: v.id, label: v.name }))}
              onCreate={async (name, extras) => {
                const rec = await createVendorInline(businessId!, name, extras);
                qc.invalidateQueries({ queryKey: ['vendors'] });
                return rec;
              }}
              createLabel={labels.partner}
              placeholder={`Select ${labels.partner.toLowerCase()}`}
              promptOpeningBalance
            />
          </div>
          <div>
            <Label className="text-xs">{labels.item}</Label>
            <CreatableSearchSelect
              value={form.product_id}
              onChange={(v) => setForm((f) => ({ ...f, product_id: v }))}
              options={(catalogProducts || []).map((p: any) => ({ id: p.id, label: p.name }))}
              onCreate={async (name) => {
                const rec = await createProductInline(businessId!, name);
                qc.invalidateQueries({ queryKey: ['products'] });
                return rec;
              }}
              createLabel={labels.item}
              placeholder={`Select ${labels.item.toLowerCase()}`}
            />
          </div>
          {(() => {
            const selectedProduct = (catalogProducts || []).find((p: any) => p.id === form.product_id);
            const isService = selectedProduct?.item_type === 'service';
            if (isService) return null;
            return (
              <div>
                <Label className="text-xs">Unit price (₹)</Label>
                <Input className="h-9" type="number" value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))} />
              </div>
            );
          })()}
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="h-9" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button className="w-full" size="sm" onClick={handleSubmit} disabled={createProduct.isPending}>
            {createProduct.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!(mappings || []).length) {
    return (
      <div>
        <EmptyState
          icon={Package}
          title={`${labels.partner} directory is empty`}
          description={`Map each ${labels.item.toLowerCase()} you resell to its ${labels.partner.toLowerCase()} so you can quote and track bills quickly.`}
          actionLabel={`Add your first ${labels.item.toLowerCase()}`}
          onAction={() => setOpen(true)}
        />
        <div className="hidden">{AddDialog}</div>
        {open && <div>{AddDialog}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input placeholder="Search…" className="h-9 sm:max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">{AddDialog}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            placeholder={`Ask AI: find ${labels.partner.toLowerCase()}s supplying…`}
            className="h-9 pl-8"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runAiSearch(); }}
          />
        </div>
        <Button size="sm" className="h-9" onClick={runAiSearch} disabled={aiLoading || !aiQuery.trim()}>
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
        {aiResults !== null && (
          <Button size="sm" variant="ghost" className="h-9" onClick={() => { setAiResults(null); setAiQuery(''); }}>
            Clear
          </Button>
        )}
      </div>

      {aiResults !== null && (
        <Card>
          <CardContent className="p-0 divide-y">
            <div className="p-2 text-xs text-muted-foreground bg-accent/40">
              AI matches ({aiResults.length}) for “{aiQuery}”
            </div>
            {aiResults.map((p: any) => (
              <div key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.product_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {labels.partner}: {p.vendor_name || '—'}
                    {p.category ? ` · ${p.category}` : ''}
                  </p>
                </div>
                {p.unit_price != null && (
                  <Badge variant="secondary" className="text-xs w-fit">₹{Number(p.unit_price).toLocaleString('en-IN')}</Badge>
                )}
              </div>
            ))}
            {!aiResults.length && <p className="text-xs text-muted-foreground p-6 text-center">No AI matches.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 divide-y">
          {filtered.map((m) => (
            <div key={m.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{displayName(m)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {labels.partner}: {vendorName(m.vendor_id)}
                  {displayCategory(m) ? ` · ${displayCategory(m)}` : ''}
                </p>
              </div>
              {m.unit_price != null && (
                <Badge variant="secondary" className="text-xs w-fit">₹{Number(m.unit_price).toLocaleString('en-IN')}</Badge>
              )}
            </div>
          ))}
          {!filtered.length && <p className="text-xs text-muted-foreground p-6 text-center">No matches.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 2. Bills (partner_orders) + commission calc + rule mgmt
// ============================================================
const emptyBillForm = {
  client_id: '', vendor_id: '', vendor_product_id: '',
  amount: '', order_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  lr_number: '', due_date: '', payment_terms: '', discount_amount: '',
};

function BillsTab({ labels, businessType }: { labels: { partner: string; item: string }; businessType: BusinessType | null }) {
  const { businessId } = useAuth();
  const qc = useQueryClient();
  const { data: orders, isLoading } = usePartnerOrders();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const { data: products } = useVendorProducts();
  const { data: catalogProducts } = useProducts();
  const { data: rules } = useCommissionRules();
  const createOrder = useCreatePartnerOrder();
  const logOrder = useLogPartnerOrder();
  const generateInvoice = useGenerateInvoiceForOrder();
  const updateOrder = useUpdatePartnerOrder();
  const upsertRule = useUpsertCommissionRule();

  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [form, setForm] = useState(emptyBillForm);
  // When set, the Bill form is in "Generate invoice" mode for an existing order.
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({
    client_id: '', vendor_id: '', vendor_product_id: '',
    amount: '', order_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });
  const [ruleForm, setRuleForm] = useState({ vendor_id: 'default', rate_type: 'percentage', rate_value: '' });

  // Toolbar filters — search across client/vendor/LR/notes, status chip, and
  // a date-range quick filter. All computed client-side against `orders`.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'order' | 'awaiting' | 'paid'>('all');
  const [rangeFilter, setRangeFilter] = useState<'all' | 'month' | '30d' | 'quarter'>('all');
  // Inline rate set from within the bill dialog when no rule applies yet.
  const [inlineRate, setInlineRate] = useState({ rate_type: 'percentage', rate_value: '' });
  const [savingInlineRate, setSavingInlineRate] = useState(false);

  // Item names now live on the standalone products master (Phase 5/6) —
  // vendor_products.product_id links to it.
  const productNameById = useMemo(() => {
    const m: Record<string, string> = {};
    (catalogProducts || []).forEach((p: any) => { m[p.id] = p.name; });
    return m;
  }, [catalogProducts]);
  const itemLabel = (p: any) => productNameById[p.product_id] || '—';

  const applicableRule = form.vendor_id ? findApplicableRule(rules, form.vendor_id) : null;
  const discountNum = Number(form.discount_amount) || 0;
  const netAmount = form.amount ? Math.max(Number(form.amount) - discountNum, 0) : 0;
  const previewCommission = form.amount ? calcCommission(applicableRule, netAmount) : null;

  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';
  const clientName = (id: string) => customers?.find((c: any) => c.id === id)?.name || '—';

  // When the vendor selection changes, pre-fill payment_terms and discount from the
  // vendor's defaults. Only fills empty fields — never clobbers user edits.
  const applyVendorDefaults = (vendorId: string) => {
    const v = (vendors || []).find((x: any) => x.id === vendorId);
    if (!v) return;
    setForm((f) => {
      const next = { ...f };
      if (!next.payment_terms && v.default_payment_terms) next.payment_terms = v.default_payment_terms;
      if (!next.discount_amount && v.default_discount_percent && next.amount) {
        const pct = Number(v.default_discount_percent);
        const amt = Number(next.amount);
        if (!isNaN(pct) && !isNaN(amt)) {
          next.discount_amount = String(Math.round(amt * pct) / 100);
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.client_id || !form.vendor_id || !form.amount) {
      toast.error('Client, ' + labels.partner.toLowerCase() + ' and amount are required');
      return;
    }
    if (Number(form.amount) <= 0) { toast.error('Amount must be greater than zero'); return; }
    if (discountNum < 0 || discountNum > Number(form.amount)) {
      toast.error('Discount must be between zero and the bill amount');
      return;
    }
    if (!applicableRule) {
      toast.error(`Set a commission rate for this ${labels.partner.toLowerCase()} before creating bills`);
      return;
    }
    try {
      if (invoiceOrderId) {
        // Convert a previously-logged order into an invoice — commission runs
        // through the same shared calculator as the direct-bill flow.
        await generateInvoice.mutateAsync({
          order_id: invoiceOrderId,
          lr_number: form.lr_number || null,
          due_date: form.due_date || null,
          payment_terms: form.payment_terms || null,
          discount_amount: discountNum,
          final_amount: Number(form.amount),
        });
        toast.success('Invoice generated');
      } else {
        await createOrder.mutateAsync({
          client_id: form.client_id,
          vendor_id: form.vendor_id,
          vendor_product_id: form.vendor_product_id || null,
          amount: Number(form.amount),
          order_date: form.order_date,
          notes: form.notes || null,
          lr_number: form.lr_number || null,
          due_date: form.due_date || null,
          payment_terms: form.payment_terms || null,
          discount_amount: discountNum,
        });
        toast.success('Bill created');
      }
      setOpen(false);
      setInvoiceOrderId(null);
      setForm(emptyBillForm);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save bill');
    }
  };

  const startInvoiceForOrder = (o: any) => {
    setInvoiceOrderId(o.id);
    setForm({
      client_id: o.client_id,
      vendor_id: o.vendor_id,
      vendor_product_id: '',
      amount: String(o.amount ?? ''),
      order_date: o.order_date,
      notes: o.notes || '',
      lr_number: '',
      due_date: '',
      payment_terms: '',
      discount_amount: '',
    });
    // Pre-fill vendor defaults immediately.
    setTimeout(() => applyVendorDefaults(o.vendor_id), 0);
    setOpen(true);
  };

  const handleLogOrder = async () => {
    if (!logForm.client_id || !logForm.vendor_id || !logForm.amount) {
      toast.error('Client, ' + labels.partner.toLowerCase() + ' and expected amount are required');
      return;
    }
    if (Number(logForm.amount) <= 0) { toast.error('Amount must be greater than zero'); return; }
    try {
      await logOrder.mutateAsync({
        client_id: logForm.client_id,
        vendor_id: logForm.vendor_id,
        vendor_product_id: logForm.vendor_product_id || null,
        amount: Number(logForm.amount),
        order_date: logForm.order_date,
        notes: logForm.notes || null,
      });
      toast.success('Order logged — generate invoice when ready');
      setLogOpen(false);
      setLogForm({ client_id: '', vendor_id: '', vendor_product_id: '', amount: '', order_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to log order');
    }
  };

  const handleAddRule = async () => {
    if (!ruleForm.rate_value || Number(ruleForm.rate_value) < 0) { toast.error('Enter a valid rate'); return; }
    await upsertRule.mutateAsync({
      business_id: businessId!,
      vendor_id: ruleForm.vendor_id === 'default' ? null : ruleForm.vendor_id,
      rate_type: ruleForm.rate_type,
      rate_value: Number(ruleForm.rate_value),
    });
    toast.success('Commission rate saved');
    setRuleForm({ vendor_id: 'default', rate_type: 'percentage', rate_value: '' });
  };

  const filteredProducts = (products || []).filter((p) => !form.vendor_id || p.vendor_id === form.vendor_id);

  const showTransport = isTransportVertical(businessType);

  const displayedOrders = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const q = search.trim().toLowerCase();
    return (orders || []).filter((o: any) => {
      // status chip
      if (statusFilter === 'order' && o.order_stage !== 'order_placed') return false;
      if (statusFilter === 'awaiting' && (o.order_stage !== 'invoiced' || o.client_payment_status === 'paid')) return false;
      if (statusFilter === 'paid' && o.client_payment_status !== 'paid') return false;
      // date range
      if (rangeFilter !== 'all') {
        const d = new Date(o.order_date);
        if (rangeFilter === 'month' && d < monthStart) return false;
        if (rangeFilter === '30d' && differenceInDays(now, d) > 30) return false;
        if (rangeFilter === 'quarter' && differenceInDays(now, d) > 90) return false;
      }
      // search
      if (q) {
        const hay = [
          clientName(o.client_id),
          vendorName(o.vendor_id),
          o.lr_number || '',
          o.notes || '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, rangeFilter, customers, vendors]);


  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const RulesDialog = (
    <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">Commission rates</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Commission rates</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Set a default rate that applies to all {labels.partner.toLowerCase()}s, or override per {labels.partner.toLowerCase()}. Commission is calculated on the bill amount after discount.
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <Label className="text-xs">{labels.partner}</Label>
              <CreatableSearchSelect
                value={ruleForm.vendor_id}
                onChange={(v) => setRuleForm((f) => ({ ...f, vendor_id: v }))}
                options={[
                  { id: 'default', label: `Default (all ${labels.partner.toLowerCase()}s)` },
                  ...(vendors || []).map((v: any) => ({ id: v.id, label: v.name })),
                ]}
                onCreate={async (name) => {
                  const rec = await createVendorInline(businessId!, name);
                  qc.invalidateQueries({ queryKey: ['vendors'] });
                  return rec;
                }}
                createLabel={labels.partner}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={ruleForm.rate_type} onValueChange={(v) => setRuleForm((f) => ({ ...f, rate_type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="flat">Flat ₹</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Value</Label>
              <Input className="h-9" type="number" value={ruleForm.rate_value} onChange={(e) => setRuleForm((f) => ({ ...f, rate_value: e.target.value }))} />
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleAddRule} disabled={upsertRule.isPending}>Save rate</Button>

          <div className="divide-y border-t pt-2">
            {(rules || []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 text-xs">
                <span>{r.vendor_id ? vendorName(r.vendor_id) : `Default (all ${labels.partner.toLowerCase()}s)`}</span>
                <span className="font-medium">{r.rate_type === 'percentage' ? `${r.rate_value}%` : `₹${r.rate_value}`}</span>
              </div>
            ))}
            {!(rules || []).length && <p className="text-xs text-muted-foreground py-2 text-center">No rates set.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const NewBillDialog = (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) { setInvoiceOrderId(null); setForm(emptyBillForm); }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8"><Plus className="w-4 h-4 mr-1" />New bill</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoiceOrderId ? 'Generate invoice for order' : 'New bill'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Client</Label>
            <CreatableSearchSelect
              value={form.client_id}
              onChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
              options={(customers || []).map((c: any) => ({ id: c.id, label: c.name }))}
              onCreate={async (name, extras) => {
                const rec = await createCustomerInline(businessId!, name, extras);
                qc.invalidateQueries({ queryKey: ['customers'] });
                return rec;
              }}
              createLabel="Client"
              placeholder="Select client"
              promptOpeningBalance
              disabled={!!invoiceOrderId}
            />
          </div>
          <div>
            <Label className="text-xs">{labels.partner}</Label>
            <CreatableSearchSelect
              value={form.vendor_id}
              onChange={(v) => {
                setForm((f) => ({ ...f, vendor_id: v, vendor_product_id: '' }));
                applyVendorDefaults(v);
              }}
              options={(vendors || []).map((v: any) => ({ id: v.id, label: v.name }))}
              onCreate={async (name, extras) => {
                const rec = await createVendorInline(businessId!, name, extras);
                qc.invalidateQueries({ queryKey: ['vendors'] });
                return rec;
              }}
              createLabel={labels.partner}
              placeholder={`Select ${labels.partner.toLowerCase()}`}
              promptOpeningBalance
              disabled={!!invoiceOrderId}
            />
          </div>
          {form.vendor_id && !applicableRule && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-2 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <span>No commission rate yet. Set one now — takes 5 seconds.</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={inlineRate.rate_type} onValueChange={(v) => setInlineRate((r) => ({ ...r, rate_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat ₹</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-8 text-xs" type="number" placeholder={inlineRate.rate_type === 'percentage' ? '10' : '500'}
                  value={inlineRate.rate_value} onChange={(e) => setInlineRate((r) => ({ ...r, rate_value: e.target.value }))} />
              </div>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs"
                disabled={!inlineRate.rate_value || savingInlineRate}
                onClick={async () => {
                  setSavingInlineRate(true);
                  try {
                    await upsertRule.mutateAsync({
                      business_id: businessId, vendor_id: null,
                      rate_type: inlineRate.rate_type, rate_value: Number(inlineRate.rate_value),
                    });
                    toast.success('Default rate saved');
                    setInlineRate({ rate_type: 'percentage', rate_value: '' });
                  } catch (e: any) { toast.error(e.message || 'Failed to save rate'); }
                  finally { setSavingInlineRate(false); }
                }}>
                Save default rate
              </Button>
            </div>
          )}
          <div>
            <Label className="text-xs">{labels.item} <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={form.vendor_product_id} onValueChange={(v) => setForm((f) => ({ ...f, vendor_product_id: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${labels.item.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>{filteredProducts.map((p) => <SelectItem key={p.id} value={p.id}>{itemLabel(p)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(() => {
            const selectedCatalog = (catalogProducts || []).find((p: any) =>
              (products || []).some((vp: any) => vp.id === form.vendor_product_id && vp.product_id === p.id)
            );
            const isService = selectedCatalog?.item_type === 'service';
            return (
              <div className={`grid ${isService ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                <div>
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input className="h-9" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                {!isService && (
                  <div>
                    <Label className="text-xs">Bill date</Label>
                    <Input className="h-9" type="date" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} />
                  </div>
                )}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Discount (₹) <span className="text-muted-foreground">(optional)</span></Label>
              <Input className="h-9" type="number" value={form.discount_amount} onChange={(e) => setForm((f) => ({ ...f, discount_amount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Due date <span className="text-muted-foreground">(optional)</span></Label>
              <Input className="h-9" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Payment terms <span className="text-muted-foreground">(optional)</span></Label>
              <Select value={form.payment_terms} onValueChange={(v) => setForm((f) => ({ ...f, payment_terms: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select terms" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">LR number <span className="text-muted-foreground">(optional)</span></Label>
              <Input className="h-9" value={form.lr_number} onChange={(e) => setForm((f) => ({ ...f, lr_number: e.target.value }))} placeholder="Transport LR no." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="h-9" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          {discountNum > 0 && form.amount && (
            <div className="rounded-md bg-accent/40 p-2 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Net bill amount</span>
              <span className="font-semibold">₹{netAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
          {previewCommission != null && (
            <div className="rounded-md bg-accent/60 p-2 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Commission earned</span>
              <span className="font-semibold">
                ₹{previewCommission.toLocaleString('en-IN')}
                {applicableRule?.rate_type === 'percentage' && ` (${applicableRule.rate_value}%)`}
              </span>
            </div>
          )}
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={createOrder.isPending || generateInvoice.isPending || !applicableRule}>
            {(createOrder.isPending || generateInvoice.isPending) ? 'Saving…' : invoiceOrderId ? 'Generate invoice' : 'Create bill'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const LogOrderDialog = (
    <Dialog open={logOpen} onOpenChange={setLogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8"><FileText className="w-4 h-4 mr-1" />Log an order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log an order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Track the order now, generate the invoice later. Commission is calculated only when you invoice.
          </p>
          <div>
            <Label className="text-xs">Client</Label>
            <CreatableSearchSelect
              value={logForm.client_id}
              onChange={(v) => setLogForm((f) => ({ ...f, client_id: v }))}
              options={(customers || []).map((c: any) => ({ id: c.id, label: c.name }))}
              onCreate={async (name, extras) => {
                const rec = await createCustomerInline(businessId!, name, extras);
                qc.invalidateQueries({ queryKey: ['customers'] });
                return rec;
              }}
              createLabel="Client"
              placeholder="Select client"
              promptOpeningBalance
            />
          </div>
          <div>
            <Label className="text-xs">{labels.partner}</Label>
            <CreatableSearchSelect
              value={logForm.vendor_id}
              onChange={(v) => setLogForm((f) => ({ ...f, vendor_id: v, vendor_product_id: '' }))}
              options={(vendors || []).map((v: any) => ({ id: v.id, label: v.name }))}
              onCreate={async (name, extras) => {
                const rec = await createVendorInline(businessId!, name, extras);
                qc.invalidateQueries({ queryKey: ['vendors'] });
                return rec;
              }}
              createLabel={labels.partner}
              placeholder={`Select ${labels.partner.toLowerCase()}`}
              promptOpeningBalance
            />
          </div>
          <div>
            <Label className="text-xs">{labels.item} <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={logForm.vendor_product_id} onValueChange={(v) => setLogForm((f) => ({ ...f, vendor_product_id: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${labels.item.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>
                {(products || [])
                  .filter((p) => !logForm.vendor_id || p.vendor_id === logForm.vendor_id)
                  .map((p) => <SelectItem key={p.id} value={p.id}>{itemLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Expected amount (₹)</Label>
              <Input className="h-9" type="number" value={logForm.amount} onChange={(e) => setLogForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Order date</Label>
              <Input className="h-9" type="date" value={logForm.order_date} onChange={(e) => setLogForm((f) => ({ ...f, order_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="h-9" value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button size="sm" className="w-full" onClick={handleLogOrder} disabled={logOrder.isPending}>
            {logOrder.isPending ? 'Saving…' : 'Log order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!(orders || []).length) {
    return (
      <div>
        <div className="flex flex-wrap justify-end gap-2 mb-3">{RulesDialog}{LogOrderDialog}</div>
        <EmptyState
          icon={Handshake}
          title="No bills yet"
          description={`Log each deal you route to a ${labels.partner.toLowerCase()} — we'll auto-track the commission you're owed.`}
          actionLabel="Create first bill"
          onAction={() => setOpen(true)}
        />
        {open && <div>{NewBillDialog}</div>}
        {!open && <div className="hidden">{NewBillDialog}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {RulesDialog}
        {LogOrderDialog}
        {NewBillDialog}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder={`Search ${labels.partner.toLowerCase()}, client, LR, notes…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { k: 'all', label: 'All' },
            { k: 'order', label: 'Orders' },
            { k: 'awaiting', label: 'Awaiting payment' },
            { k: 'paid', label: 'Paid' },
          ].map((s) => (
            <Button
              key={s.k}
              size="sm"
              variant={statusFilter === s.k ? 'default' : 'outline'}
              className="h-8 text-xs px-2.5 shrink-0"
              onClick={() => setStatusFilter(s.k as any)}
            >
              {s.label}
            </Button>
          ))}
          <Select value={rangeFilter} onValueChange={(v: any) => setRangeFilter(v)}>
            <SelectTrigger className="h-8 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="quarter">Last 90d</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {displayedOrders.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No bills match"
          description="Try clearing filters or search."
          actionLabel="Clear filters"
          onAction={() => { setSearch(''); setStatusFilter('all'); setRangeFilter('all'); }}
        />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {displayedOrders.map((o: any) => {
              const isOrderStage = o.order_stage === 'order_placed';
              const now = new Date();
              const daysOverdue = o.due_date && o.client_payment_status !== 'paid'
                ? differenceInDays(now, new Date(o.due_date))
                : null;
              const isOverdue = daysOverdue !== null && daysOverdue > 0;
              const bucket = daysOverdue !== null && daysOverdue > 0 ? agingBucket(daysOverdue) : null;
              return (
                <div key={o.id} className={`p-3 flex flex-col gap-2 ${isOverdue ? 'border-l-2 border-l-warning' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{clientName(o.client_id)} → {vendorName(o.vendor_id)}</p>
                        {isOrderStage && <Badge variant="outline" className="text-[10px] shrink-0">Order — not yet invoiced</Badge>}
                        {bucket && (
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${bucket === '60+' ? 'border-destructive text-destructive' : 'border-warning text-warning'}`}>
                            {daysOverdue}d overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(o.order_date), 'dd MMM yyyy')}
                        {showTransport && o.lr_number ? ` · LR ${o.lr_number}` : ''}
                        {o.payment_terms ? ` · ${paymentTermsLabel(o.payment_terms)}` : ''}
                        {o.due_date ? ` · Due ${format(new Date(o.due_date), 'dd MMM')}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold">₹{Number(o.amount).toLocaleString('en-IN')}</span>
                      {Number(o.discount_amount) > 0 && (
                        <p className="text-[11px] text-muted-foreground">−₹{Number(o.discount_amount).toLocaleString('en-IN')} disc.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isOrderStage ? (
                      <Button size="sm" className="h-7 text-xs px-2" onClick={() => startInvoiceForOrder(o)}>
                        <Receipt className="w-3.5 h-3.5 mr-1" />Generate invoice
                      </Button>
                    ) : (
                      <>
                        {showTransport && (
                          <Select
                            value={o.dispatch_status}
                            onValueChange={(v) => updateOrder.mutate({ id: o.id, dispatch_status: v })}
                          >
                            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="dispatched">Dispatched</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Select
                          value={o.client_payment_status}
                          onValueChange={(v) => {
                            updateOrder.mutate({ id: o.id, client_payment_status: v });
                            if (v === 'paid') toast.success('Payment recorded — commission moved to receivable');
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Payment pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        {o.client_payment_status === 'paid' && (
                          <Badge variant="secondary" className="text-xs">Commission receivable</Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// 3. Reports — Commission, Client Ledger, By Vendor, Bill Register
// ============================================================
function ReportsTab({ labels }: { labels: { partner: string; item: string } }) {
  return (
    <Tabs defaultValue="commission" className="w-full">
      <TabsList className="w-full grid grid-cols-4 h-9">
        <TabsTrigger value="commission" className="text-xs">Commission</TabsTrigger>
        <TabsTrigger value="ledger" className="text-xs">Client Ledger</TabsTrigger>
        <TabsTrigger value="by-vendor" className="text-xs">By {labels.partner}</TabsTrigger>
        <TabsTrigger value="register" className="text-xs">Bill Register</TabsTrigger>
      </TabsList>
      <TabsContent value="commission" className="mt-4"><CommissionTab labels={labels} /></TabsContent>
      <TabsContent value="ledger" className="mt-4"><LedgerTab labels={labels} /></TabsContent>
      <TabsContent value="by-vendor" className="mt-4"><VendorSummaryTab labels={labels} /></TabsContent>
      <TabsContent value="register" className="mt-4"><BillRegisterTab labels={labels} /></TabsContent>
    </Tabs>
  );
}

function OverrideCommissionDialog({ open, onOpenChange, transactionId, currentAmount }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactionId: string | null;
  currentAmount: number;
}) {
  const overrideCommission = useOverrideCommission();
  const [newAmount, setNewAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) { setNewAmount(''); setReason(''); }
  };

  const handleSubmit = async () => {
    if (!transactionId) return;
    const amt = Number(newAmount);
    if (!newAmount || amt < 0) { toast.error('Enter a valid amount'); return; }
    if (!reason.trim()) { toast.error('A reason is required'); return; }
    try {
      await overrideCommission.mutateAsync({ transaction_id: transactionId, new_amount: amt, reason: reason.trim() });
      toast.success('Commission amount updated');
      handleClose(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update commission amount');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust commission amount</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Current amount: <span className="font-medium text-foreground">₹{currentAmount.toLocaleString('en-IN')}</span>. Every change is logged with a reason.
          </div>
          <div>
            <Label className="text-xs">New amount (₹)</Label>
            <Input className="h-9" type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Reason (required)</Label>
            <Input className="h-9" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Client negotiated a lower rate" />
          </div>
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={overrideCommission.isPending}>
            {overrideCommission.isPending ? 'Saving…' : 'Save adjustment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommissionTab({ labels }: { labels: { partner: string; item: string } }) {
  const { data: txns, isLoading } = useCommissionTransactions();
  const { data: orders } = usePartnerOrders();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const { data: overrides } = useCommissionOverrides();
  const updateStatus = useUpdateCommissionStatus();
  const { data: userRole } = useUserRole();
  const isAdmin = hasMinRole(userRole as AppRole, 'admin');

  const [overrideTarget, setOverrideTarget] = useState<{ id: string; amount: number } | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { pending: [], receivable: [], received: [], written_off: [] };
    (txns || []).forEach((t: any) => { g[t.status]?.push(t); });
    return g;
  }, [txns]);

  const orderById = (id: string) => (orders || []).find((o: any) => o.id === id);
  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';
  const clientName = (id: string) => customers?.find((c: any) => c.id === id)?.name || '—';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!(txns || []).length) {
    return (
      <EmptyState
        icon={Receipt}
        title="No commissions yet"
        description="Commissions appear here automatically as soon as you create a bill in the Bills tab."
        actionLabel="Go to bills"
        onAction={() => document.querySelector<HTMLButtonElement>('[value="bills"]')?.click()}
      />
    );
  }

  const StatusSection = ({ status, title }: { status: string; title: string }) => {
    const rows = grouped[status] || [];
    if (!rows.length) return null;
    const total = rows.reduce((s, r) => s + Number(r.commission_amount), 0);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{title}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {rows.length} · ₹{total.toLocaleString('en-IN')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {rows.map((t: any) => {
            const o = orderById(t.partner_order_id);
            const overdue =
              status === 'receivable' &&
              t.receivable_since &&
              differenceInDays(new Date(), new Date(t.receivable_since)) > 30;
            return (
              <div
                key={t.id}
                className={`p-3 flex items-center justify-between gap-2 ${overdue ? 'bg-warning/10 border-l-2 border-l-warning' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {o ? `${clientName(o.client_id)} → ${vendorName(o.vendor_id)}` : 'Bill deleted'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {status === 'receivable' && t.receivable_since
                      ? `Receivable ${differenceInDays(new Date(), new Date(t.receivable_since))}d`
                      : status === 'received' && t.received_date
                      ? `Received ${format(new Date(t.received_date), 'dd MMM')}`
                      : format(new Date(t.created_at), 'dd MMM yyyy')}
                    {overdue && ' · 30+ days overdue'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">₹{Number(t.commission_amount).toLocaleString('en-IN')}</span>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Adjust commission amount"
                      onClick={() => setOverrideTarget({ id: t.id, amount: Number(t.commission_amount) })}
                    >
                      <PencilLine className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {status === 'receivable' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: t.id, status: 'received' })}>Mark received</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: t.id, status: 'written_off' })}>Write off</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      <StatusSection status="receivable" title="Receivable" />
      <StatusSection status="pending" title="Pending (awaiting client payment)" />
      <StatusSection status="received" title="Received" />
      <StatusSection status="written_off" title="Written off" />

      {!!(overrides || []).length && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Commission adjustments</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y">
            {(overrides || []).map((ov: any) => (
              <div key={ov.id} className="p-3 text-xs flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate">₹{Number(ov.previous_amount).toLocaleString('en-IN')} → ₹{Number(ov.new_amount).toLocaleString('en-IN')}</p>
                  <p className="text-muted-foreground truncate">{ov.reason}</p>
                </div>
                <span className="text-muted-foreground shrink-0">{format(new Date(ov.created_at), 'dd MMM yyyy')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <OverrideCommissionDialog
        open={!!overrideTarget}
        onOpenChange={(v) => { if (!v) setOverrideTarget(null); }}
        transactionId={overrideTarget?.id ?? null}
        currentAmount={overrideTarget?.amount ?? 0}
      />
    </div>
  );
}

// ============================================================
// 4. Client ledger
// ============================================================
function LedgerTab({ labels }: { labels: { partner: string; item: string } }) {
  const { data: balances, isLoading } = useClientVendorBalances();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();

  const byClient = useMemo(() => {
    const m: Record<string, any[]> = {};
    (balances || []).forEach((b: any) => {
      m[b.client_id] = m[b.client_id] || [];
      m[b.client_id].push(b);
    });
    return m;
  }, [balances]);

  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';
  const clientName = (id: string) => customers?.find((c: any) => c.id === id)?.name || '—';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!(balances || []).length) {
    return (
      <EmptyState
        icon={Users}
        title="No client ledger yet"
        description={`Once you create bills, this ledger shows each client's outstanding balance and commission owed per ${labels.partner.toLowerCase()}.`}
        actionLabel="Go to bills"
        onAction={() => document.querySelector<HTMLButtonElement>('[value="bills"]')?.click()}
      />
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(byClient).map(([clientId, rows]) => {
        const totalOrder = rows.reduce((s, r) => s + Number(r.total_order_value), 0);
        const totalPaid = rows.reduce((s, r) => s + Number(r.total_paid), 0);
        const outstanding = totalOrder - totalPaid;
        return (
          <Card key={clientId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="truncate">{clientName(clientId)}</span>
                <span className={`text-xs font-normal ${outstanding > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                  Outstanding ₹{outstanding.toLocaleString('en-IN')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {rows.map((r: any, i: number) => (
                <div key={i} className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-muted-foreground text-[11px]">{labels.partner}</p>
                    <p className="font-medium truncate">{vendorName(r.vendor_id)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Bills</p>
                    <p className="font-medium">₹{Number(r.total_order_value).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Paid</p>
                    <p className="font-medium">₹{Number(r.total_paid).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Receivable</p>
                    <p className="font-medium">₹{Number(r.commission_receivable).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Received</p>
                    <p className="font-medium">₹{Number(r.commission_received).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// 5. New report: vendor-wise commission summary
// ============================================================
function VendorSummaryTab({ labels }: { labels: { partner: string; item: string } }) {
  const { data: txns, isLoading: loadingTxns } = useCommissionTransactions();
  const { data: orders, isLoading: loadingOrders } = usePartnerOrders();
  const { data: vendors } = useVendors();

  const isLoading = loadingTxns || loadingOrders;
  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';

  const summary = useMemo(() => {
    const orderVendor: Record<string, string> = {};
    (orders || []).forEach((o: any) => { orderVendor[o.id] = o.vendor_id; });

    const byVendor: Record<string, { pending: number; receivable: number; received: number; written_off: number; billCount: number; billTotal: number }> = {};
    (orders || []).forEach((o: any) => {
      byVendor[o.vendor_id] = byVendor[o.vendor_id] || { pending: 0, receivable: 0, received: 0, written_off: 0, billCount: 0, billTotal: 0 };
      byVendor[o.vendor_id].billCount += 1;
      byVendor[o.vendor_id].billTotal += Number(o.amount) - Number(o.discount_amount || 0);
    });
    (txns || []).forEach((t: any) => {
      const vendorId = orderVendor[t.partner_order_id];
      if (!vendorId) return;
      byVendor[vendorId] = byVendor[vendorId] || { pending: 0, receivable: 0, received: 0, written_off: 0, billCount: 0, billTotal: 0 };
      byVendor[vendorId][t.status as 'pending' | 'receivable' | 'received' | 'written_off'] += Number(t.commission_amount);
    });
    return Object.entries(byVendor)
      .map(([vendorId, v]) => ({ vendorId, ...v, totalCommission: v.pending + v.receivable + v.received }))
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [orders, txns]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!summary.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title={`No ${labels.partner.toLowerCase()} activity yet`}
        description={`Commission earned per ${labels.partner.toLowerCase()} shows up here once you create bills.`}
        actionLabel="Go to bills"
        onAction={() => document.querySelector<HTMLButtonElement>('[value="bills"]')?.click()}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {summary.map((v) => (
          <div key={v.vendorId} className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs items-center">
            <div className="col-span-2 sm:col-span-1">
              <p className="font-medium truncate">{vendorName(v.vendorId)}</p>
              <p className="text-muted-foreground text-[11px]">{v.billCount} bill{v.billCount === 1 ? '' : 's'} · ₹{v.billTotal.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Pending</p>
              <p className="font-medium">₹{v.pending.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Receivable</p>
              <p className="font-medium">₹{v.receivable.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Received</p>
              <p className="font-medium">₹{v.received.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Total commission</p>
              <p className="font-semibold">₹{v.totalCommission.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 6. New report: exportable bill register
// ============================================================
function BillRegisterTab({ labels }: { labels: { partner: string; item: string } }) {
  const { data: orders, isLoading } = usePartnerOrders();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();

  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';
  const clientName = (id: string) => customers?.find((c: any) => c.id === id)?.name || '—';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!(orders || []).length) {
    return (
      <EmptyState
        icon={FileText}
        title="No bills to list yet"
        description="Every bill you create shows up here, ready to export."
        actionLabel="Go to bills"
        onAction={() => document.querySelector<HTMLButtonElement>('[value="bills"]')?.click()}
      />
    );
  }

  const rows = (orders || []).map((o: any) => ({
    ...o,
    client_name: clientName(o.client_id),
    vendor_name: vendorName(o.vendor_id),
  }));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu
          label="Export register"
          onCSV={() => exportPartnerBillsCSV(rows, labels.partner)}
          onPDF={() => exportPartnerBillsPDF(rows, labels.partner)}
        />
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {rows.map((o: any) => (
            <div key={o.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{o.client_name} → {o.vendor_name}</p>
                <p className="text-muted-foreground truncate">
                  {format(new Date(o.order_date), 'dd MMM yyyy')}
                  {o.lr_number ? ` · LR ${o.lr_number}` : ''}
                  {o.payment_terms ? ` · ${paymentTermsLabel(o.payment_terms)}` : ''}
                  {o.due_date ? ` · Due ${format(new Date(o.due_date), 'dd MMM')}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">₹{Number(o.amount).toLocaleString('en-IN')}</p>
                {Number(o.discount_amount) > 0 && <p className="text-muted-foreground">−₹{Number(o.discount_amount).toLocaleString('en-IN')}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
