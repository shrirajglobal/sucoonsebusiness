import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Plan = 'starter' | 'growth' | 'scale';
type Cycle = 'monthly' | 'annual';
type Duration = 'none' | '30' | '90' | '180' | '365' | 'custom';

export interface ManagePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Info for the header */
  businessName: string;
  currentPlan: Plan;
  currentCycle?: Cycle;
  currentPeriodEnd?: string | null;
  lastGrantedBy?: string | null;
  lastGrantReason?: string | null;
  /** Prefill on open — used by "Approve request" flow */
  initialPlan?: Plan;
  initialCycle?: Cycle;
  /** Runs the actual mutation; return true on success */
  onSubmit: (payload: {
    new_plan: Plan;
    billing_cycle: Cycle;
    duration_days: number | null;
    reason: string;
  }) => Promise<boolean>;
}

const DURATION_LABELS: Record<Duration, string> = {
  none: 'No expiry',
  '30': '1 month',
  '90': '3 months',
  '180': '6 months',
  '365': '12 months',
  custom: 'Custom (days)',
};

export default function ManagePlanDialog({
  open,
  onOpenChange,
  businessName,
  currentPlan,
  currentCycle,
  currentPeriodEnd,
  lastGrantedBy,
  lastGrantReason,
  initialPlan,
  initialCycle,
  onSubmit,
}: ManagePlanDialogProps) {
  const [plan, setPlan] = useState<Plan>(initialPlan ?? currentPlan);
  const [cycle, setCycle] = useState<Cycle>(initialCycle ?? currentCycle ?? 'monthly');
  const [duration, setDuration] = useState<Duration>('none');
  const [customDays, setCustomDays] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPlan(initialPlan ?? currentPlan);
      setCycle(initialCycle ?? currentCycle ?? 'monthly');
      setDuration('none');
      setCustomDays('');
      setReason('');
    }
  }, [open, initialPlan, initialCycle, currentPlan, currentCycle]);

  const durationDays =
    duration === 'none'
      ? null
      : duration === 'custom'
        ? (parseInt(customDays, 10) || 0) > 0
          ? parseInt(customDays, 10)
          : null
        : parseInt(duration, 10);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please add a short reason (required for audit log)');
      return;
    }
    if (duration === 'custom' && !durationDays) {
      toast.error('Enter a valid number of days');
      return;
    }
    setSaving(true);
    const ok = await onSubmit({
      new_plan: plan,
      billing_cycle: cycle,
      duration_days: durationDays,
      reason: reason.trim(),
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage plan — {businessName}</DialogTitle>
          <DialogDescription>
            Grant Growth or Scale access, set an expiry, and record the reason. Change is logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Current:</span>{' '}
              <span className="font-medium capitalize">{currentPlan}</span>
              {currentCycle && <> · {currentCycle}</>}
            </div>
            {currentPeriodEnd && (
              <div>
                <span className="text-muted-foreground">Expires:</span>{' '}
                {new Date(currentPeriodEnd).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}
            {lastGrantedBy && (
              <div className="text-muted-foreground">
                Last granted by {lastGrantedBy}
                {lastGrantReason ? ` · "${lastGrantReason}"` : ''}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Plan</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['starter', 'growth', 'scale'] as Plan[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`rounded-md border p-2 text-sm capitalize transition ${
                    plan === p ? 'border-primary bg-primary/5 font-semibold' : 'border-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Billing cycle</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'annual'] as Cycle[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`rounded-md border p-2 text-sm capitalize transition ${
                    cycle === c ? 'border-primary bg-primary/5 font-semibold' : 'border-border'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Access duration</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DURATION_LABELS) as Duration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-md border p-2 text-xs transition ${
                    duration === d ? 'border-primary bg-primary/5 font-semibold' : 'border-border'
                  }`}
                >
                  {DURATION_LABELS[d]}
                </button>
              ))}
            </div>
            {duration === 'custom' && (
              <Input
                type="number"
                min={1}
                placeholder="Number of days"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
              />
            )}
            {duration !== 'none' && durationDays && (
              <p className="text-[11px] text-muted-foreground">
                Expires on{' '}
                {new Date(Date.now() + durationDays * 86400000).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mp-reason">Reason (required)</Label>
            <Textarea
              id="mp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Founding-partner grant · signed offline deal · pilot extension"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !reason.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Grant {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
