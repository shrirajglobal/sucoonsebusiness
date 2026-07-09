import { useMemo, useState } from 'react';
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
import { Handshake, Package, Receipt, Users, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useCustomers } from '@/hooks/useSupabaseData';
import { useVendors } from '@/hooks/usePhase4Data';
import { getPartnerLabels } from '@/lib/constants';
import type { BusinessType } from '@/types';
import {
  useVendorProducts, useCreateVendorProduct,
  useCommissionRules, useUpsertCommissionRule, findApplicableRule, calcCommission,
  usePartnerOrders, useCreatePartnerOrder, useUpdatePartnerOrder,
  useCommissionTransactions, useUpdateCommissionStatus,
  useClientVendorBalances,
} from '@/hooks/usePartnerNetwork';

export default function Partners() {
  const { businessId } = useAuth();
  const { data: business } = useBusiness();
  const labels = getPartnerLabels((business?.business_type as BusinessType) ?? null);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Partner Network</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Track {labels.partner.toLowerCase()}s, orders and commissions in one place.
          </p>
        </div>

        <Tabs defaultValue="directory" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="directory" className="text-xs">Directory</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
            <TabsTrigger value="commission" className="text-xs">Commission</TabsTrigger>
            <TabsTrigger value="ledger" className="text-xs">Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="mt-4"><DirectoryTab labels={labels} /></TabsContent>
          <TabsContent value="orders" className="mt-4"><OrdersTab labels={labels} /></TabsContent>
          <TabsContent value="commission" className="mt-4"><CommissionTab labels={labels} /></TabsContent>
          <TabsContent value="ledger" className="mt-4"><LedgerTab labels={labels} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ============================================================
// 1. Directory (vendor_products)
// ============================================================
function DirectoryTab({ labels }: { labels: { partner: string; item: string } }) {
  const { businessId } = useAuth();
  const { data: products, isLoading } = useVendorProducts();
  const { data: vendors } = useVendors();
  const createProduct = useCreateVendorProduct();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [form, setForm] = useState({ vendor_id: '', product_name: '', category: '', unit_price: '', notes: '' });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      const q = search.toLowerCase();
      const matchQ = !q || p.product_name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
      const matchC = categoryFilter === 'all' || p.category === categoryFilter;
      return matchQ && matchC;
    });
  }, [products, search, categoryFilter]);

  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';

  const handleSubmit = async () => {
    if (!form.vendor_id || !form.product_name) {
      toast.error(`${labels.partner} and ${labels.item.toLowerCase()} name are required`);
      return;
    }
    await createProduct.mutateAsync({
      business_id: businessId!,
      vendor_id: form.vendor_id,
      product_name: form.product_name,
      category: form.category || null,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      notes: form.notes || null,
    });
    toast.success(`${labels.item} added`);
    setOpen(false);
    setForm({ vendor_id: '', product_name: '', category: '', unit_price: '', notes: '' });
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
            <Select value={form.vendor_id} onValueChange={(v) => setForm((f) => ({ ...f, vendor_id: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${labels.partner.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>
                {(vendors || []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!(vendors || []).length && (
              <p className="text-xs text-muted-foreground mt-1">Add a {labels.partner.toLowerCase()} first in Vendors.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">{labels.item} name</Label>
            <Input className="h-9" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Input className="h-9" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Unit price (₹)</Label>
              <Input className="h-9" type="number" value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))} />
            </div>
          </div>
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

  if (!(products || []).length) {
    return (
      <div>
        <EmptyState
          icon={Package}
          title={`${labels.partner} directory is empty`}
          description={`Map each ${labels.item.toLowerCase()} you resell to its ${labels.partner.toLowerCase()} so you can quote and track orders quickly.`}
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

      <Card>
        <CardContent className="p-0 divide-y">
          {filtered.map((p) => (
            <div key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.product_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {labels.partner}: {vendorName(p.vendor_id)}
                  {p.category ? ` · ${p.category}` : ''}
                </p>
              </div>
              {p.unit_price != null && (
                <Badge variant="secondary" className="text-xs w-fit">₹{Number(p.unit_price).toLocaleString('en-IN')}</Badge>
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
// 2. Orders (partner_orders) + commission calc + rule mgmt
// ============================================================
function OrdersTab({ labels }: { labels: { partner: string; item: string } }) {
  const { businessId } = useAuth();
  const { data: orders, isLoading } = usePartnerOrders();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const { data: products } = useVendorProducts();
  const { data: rules } = useCommissionRules();
  const createOrder = useCreatePartnerOrder();
  const updateOrder = useUpdatePartnerOrder();
  const upsertRule = useUpsertCommissionRule();

  const [open, setOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: '', vendor_id: '', vendor_product_id: '',
    amount: '', order_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });
  const [ruleForm, setRuleForm] = useState({ vendor_id: 'default', rate_type: 'percentage', rate_value: '' });

  const applicableRule = form.vendor_id ? findApplicableRule(rules, form.vendor_id) : null;
  const previewCommission = form.amount ? calcCommission(applicableRule, Number(form.amount)) : null;

  const vendorName = (id: string) => vendors?.find((v: any) => v.id === id)?.name || '—';
  const clientName = (id: string) => customers?.find((c: any) => c.id === id)?.name || '—';

  const handleSubmit = async () => {
    if (!form.client_id || !form.vendor_id || !form.amount) {
      toast.error('Client, ' + labels.partner.toLowerCase() + ' and amount are required');
      return;
    }
    if (Number(form.amount) <= 0) { toast.error('Amount must be greater than zero'); return; }
    if (!applicableRule) {
      toast.error(`Set a commission rate for this ${labels.partner.toLowerCase()} before creating orders`);
      return;
    }
    const commission = calcCommission(applicableRule, Number(form.amount));
    if (commission == null) { toast.error('Could not calculate commission'); return; }
    try {
      await createOrder.mutateAsync({
        client_id: form.client_id,
        vendor_id: form.vendor_id,
        vendor_product_id: form.vendor_product_id || null,
        amount: Number(form.amount),
        order_date: form.order_date,
        notes: form.notes || null,
        commission_amount: commission,
      });
      toast.success('Order created');
      setOpen(false);
      setForm({ client_id: '', vendor_id: '', vendor_product_id: '', amount: '', order_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to create order');
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
            Set a default rate that applies to all {labels.partner.toLowerCase()}s, or override per {labels.partner.toLowerCase()}.
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <Label className="text-xs">{labels.partner}</Label>
              <Select value={ruleForm.vendor_id} onValueChange={(v) => setRuleForm((f) => ({ ...f, vendor_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (all {labels.partner.toLowerCase()}s)</SelectItem>
                  {(vendors || []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
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

  const NewOrderDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8"><Plus className="w-4 h-4 mr-1" />New order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Client</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{(customers || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{labels.partner}</Label>
            <Select value={form.vendor_id} onValueChange={(v) => setForm((f) => ({ ...f, vendor_id: v, vendor_product_id: '' }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${labels.partner.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>{(vendors || []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.vendor_id && !applicableRule && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <span>Set a commission rate for this {labels.partner.toLowerCase()} before creating orders.</span>
            </div>
          )}
          <div>
            <Label className="text-xs">{labels.item} <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={form.vendor_product_id} onValueChange={(v) => setForm((f) => ({ ...f, vendor_product_id: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${labels.item.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>{filteredProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input className="h-9" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Order date</Label>
              <Input className="h-9" type="date" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="h-9" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          {previewCommission != null && (
            <div className="rounded-md bg-accent/60 p-2 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Commission earned</span>
              <span className="font-semibold">
                ₹{previewCommission.toLocaleString('en-IN')}
                {applicableRule?.rate_type === 'percentage' && ` (${applicableRule.rate_value}%)`}
              </span>
            </div>
          )}
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={createOrder.isPending || !applicableRule}>
            {createOrder.isPending ? 'Saving…' : 'Create order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!(orders || []).length) {
    return (
      <div>
        <div className="flex justify-end gap-2 mb-3">{RulesDialog}</div>
        <EmptyState
          icon={Handshake}
          title="No orders yet"
          description={`Log each deal you route to a ${labels.partner.toLowerCase()} — we'll auto-track the commission you're owed.`}
          actionLabel="Create first order"
          onAction={() => setOpen(true)}
        />
        {open && <div>{NewOrderDialog}</div>}
        {!open && <div className="hidden">{NewOrderDialog}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {RulesDialog}
        {NewOrderDialog}
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {(orders || []).map((o: any) => (
            <div key={o.id} className="p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{clientName(o.client_id)} → {vendorName(o.vendor_id)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(o.order_date), 'dd MMM yyyy')}</p>
                </div>
                <span className="text-sm font-semibold shrink-0">₹{Number(o.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                <Select
                  value={o.client_payment_status}
                  onValueChange={(v) => updateOrder.mutate({ id: o.id, client_payment_status: v })}
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
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 3. Commission dashboard
// ============================================================
function CommissionTab({ labels }: { labels: { partner: string; item: string } }) {
  const { data: txns, isLoading } = useCommissionTransactions();
  const { data: orders } = usePartnerOrders();
  const { data: vendors } = useVendors();
  const { data: customers } = useCustomers();
  const updateStatus = useUpdateCommissionStatus();

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
        description="Commissions appear here automatically as soon as you create an order in the Orders tab."
        actionLabel="Go to orders"
        onAction={() => document.querySelector<HTMLButtonElement>('[value="orders"]')?.click()}
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
                    {o ? `${clientName(o.client_id)} → ${vendorName(o.vendor_id)}` : 'Order deleted'}
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
        description={`Once you create orders, this ledger shows each client's outstanding balance and commission owed per ${labels.partner.toLowerCase()}.`}
        actionLabel="Go to orders"
        onAction={() => document.querySelector<HTMLButtonElement>('[value="orders"]')?.click()}
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
                    <p className="text-muted-foreground text-[11px]">Orders</p>
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
