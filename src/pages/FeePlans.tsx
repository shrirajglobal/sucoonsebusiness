import { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/shared/EmptyState';
import { GraduationCap, Plus, Loader2, ChevronLeft, IndianRupee, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { useCustomers } from '@/hooks/useSupabaseData';
import {
  useFeePlans, useFeeInstallments, useCreateFeePlan, useMarkInstallmentPaid,
  type FeePlan, type FeeInstallment,
} from '@/hooks/useFeePlans';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

export default function FeePlans() {
  const { data: plans, isLoading } = useFeePlans();
  const { data: customers } = useCustomers();
  const [openNew, setOpenNew] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FeePlan | null>(null);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    (customers ?? []).forEach((c: any) => map.set(c.id, c.name));
    return map;
  }, [customers]);

  if (selectedPlan) {
    return (
      <PlanDetail
        plan={selectedPlan}
        clientName={customerNameById.get(selectedPlan.client_id) ?? 'Unknown'}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Fee Plans
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Track fee schedules and installment collections.
            </p>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
            </DialogTrigger>
            <NewPlanDialog onClose={() => setOpenNew(false)} customers={customers ?? []} />
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !plans || plans.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No fee plans yet"
            description="Set up a fee schedule for a student and we'll auto-generate every installment."
            actionLabel="Create first plan"
            onAction={() => setOpenNew(true)}
          />

        ) : (
          <div className="grid gap-3">
            {plans.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/40 transition"
                onClick={() => setSelectedPlan(p)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.plan_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {customerNameById.get(p.client_id) ?? '—'} · starts {format(new Date(p.start_date), 'dd MMM yyyy')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold flex items-center justify-end">{inr(Number(p.total_amount))}</div>
                    <div className="text-xs text-muted-foreground">{p.installment_count} installments</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function NewPlanDialog({ onClose, customers }: { onClose: () => void; customers: any[] }) {
  const create = useCreateFeePlan();
  const [clientId, setClientId] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('3');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const total = Number(totalAmount);
  const count = Number(installments);
  const preview = total > 0 && count > 0 ? total / count : null;

  const submit = async () => {
    if (!clientId) return toast.error('Select a client');
    if (!planName.trim()) return toast.error('Enter a plan name');
    if (!(total > 0)) return toast.error('Total amount must be greater than zero');
    if (!(count > 0)) return toast.error('At least one installment');
    try {
      await create.mutateAsync({
        client_id: clientId,
        plan_name: planName.trim(),
        total_amount: total,
        installment_count: count,
        start_date: startDate,
      });
      toast.success('Fee plan created');
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create plan');
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>New Fee Plan</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Plan name</Label>
          <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Class 10 Annual Fees" maxLength={100} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Total amount (₹)</Label>
            <Input type="number" min="1" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          </div>
          <div>
            <Label>Installments</Label>
            <Input type="number" min="1" step="1" value={installments} onChange={(e) => setInstallments(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        {preview !== null && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            ~{inr(preview)} per installment. Final installment absorbs rounding so totals reconcile exactly.
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={create.isPending}>
          {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create plan
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PlanDetail({ plan, clientName, onBack }: { plan: FeePlan; clientName: string; onBack: () => void }) {
  const { data: items, isLoading } = useFeeInstallments(plan.id);
  const mark = useMarkInstallmentPaid();

  const stats = useMemo(() => {
    const list = items ?? [];
    const paid = list.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
    return { paid, pending: Number(plan.total_amount) - paid };
  }, [items, plan.total_amount]);

  const today = startOfDay(new Date());
  const badgeFor = (i: FeeInstallment) => {
    if (i.status === 'paid') return <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Paid</Badge>;
    if (isBefore(new Date(i.due_date), today))
      return <Badge variant="destructive">Overdue</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
            <div className="text-xs text-muted-foreground">
              {clientName} · starts {format(new Date(plan.start_date), 'dd MMM yyyy')}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 pt-2">
            <Stat label="Total" value={inr(Number(plan.total_amount))} />
            <Stat label="Collected" value={inr(stats.paid)} accent />
            <Stat label="Pending" value={inr(stats.pending)} />
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="grid gap-2">
            {(items ?? []).map((i) => (
              <Card key={i.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                    {i.installment_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5" />{Number(i.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Due {format(new Date(i.due_date), 'dd MMM yyyy')}
                      {i.paid_date && ` · paid ${format(new Date(i.paid_date), 'dd MMM yyyy')}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {badgeFor(i)}
                    <Button
                      size="sm"
                      variant={i.status === 'paid' ? 'outline' : 'default'}
                      onClick={() =>
                        mark.mutate(
                          { id: i.id, paid: i.status !== 'paid' },
                          {
                            onSuccess: () =>
                              toast.success(i.status === 'paid' ? 'Marked pending' : 'Marked paid'),
                            onError: (e: any) => toast.error(e.message ?? 'Update failed'),
                          },
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {i.status === 'paid' ? 'Undo' : 'Mark paid'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${accent ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
