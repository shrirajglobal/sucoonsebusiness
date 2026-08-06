import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, Sparkles, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/hooks/useSupabaseData';
import { getTier, formatPrice, GST_RATE, type PricingTierId, type BillingCycle } from '@/lib/pricing';
import { toast } from 'sonner';

interface UpgradeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestedTier: PricingTierId;
  /** Optional: which locked module triggered this request */
  moduleContext?: string;
}

// Load Razorpay Checkout.js on demand — cached across dialog opens.
let checkoutScriptPromise: Promise<boolean> | null = null;
function loadCheckoutScript(): Promise<boolean> {
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => {
      checkoutScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return checkoutScriptPromise;
}

export default function UpgradeRequestDialog({
  open,
  onOpenChange,
  requestedTier,
  moduleContext,
}: UpgradeRequestDialogProps) {
  const { profile, user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const tier = getTier(requestedTier);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Payment flow state
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [paying, setPaying] = useState(false);
  const [awaitingActivation, setAwaitingActivation] = useState(false);
  const [activationSlow, setActivationSlow] = useState(false);
  const [activated, setActivated] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setName(profile?.full_name || '');
      setPhone(business?.phone || '');
      setNote(moduleContext ? `Interested in unlocking ${moduleContext}.` : '');
      setDone(false);
      setAwaitingActivation(false);
      setActivationSlow(false);
      setActivated(false);
    } else if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [open, profile, business, moduleContext]);

  const rupees = cycle === 'annual' ? tier.annualPrice * 12 : tier.monthlyPrice;
  const totalWithGst = Math.round(rupees * (1 + GST_RATE));
  const isFree = tier.monthlyPrice === 0;

  const handleSubmit = async () => {
    if (!businessId) {
      toast.error('No business context');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('upgrade_requests').insert({
      business_id: businessId,
      requester_user_id: user?.id ?? null,
      requester_name: name.trim() || null,
      requester_phone: phone.trim() || null,
      requested_tier: requestedTier,
      module_context: moduleContext ?? null,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not send request. Please try again.');
      return;
    }
    setDone(true);
  };

  const pollForActivation = () => {
    if (!businessId) return;
    setAwaitingActivation(true);
    setActivationSlow(false);
    const startedAt = Date.now();
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('business_id', businessId)
        .maybeSingle();
      if (data && data.plan === requestedTier && data.status === 'active') {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setAwaitingActivation(false);
        setActivated(true);
        return;
      }
      if (Date.now() - startedAt > 15000) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setActivationSlow(true);
      }
    }, 1500);
  };

  const handlePayNow = async () => {
    if (isFree || !businessId) return;
    setPaying(true);
    try {
      const scriptLoaded = await loadCheckoutScript();
      if (!scriptLoaded) {
        toast.error('Could not load payment gateway. Please try again.');
        setPaying(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-payment-order', {
        body: { tier: requestedTier, billing_cycle: cycle },
      });
      if (error || !data?.razorpay_order_id) {
        toast.error('Could not start payment. Please try again.');
        setPaying(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        amount: data.amount_paise,
        currency: 'INR',
        name: business?.name || 'Suvee',
        description: `${tier.name} plan — ${cycle === 'annual' ? 'Annual' : 'Monthly'}`,
        order_id: data.razorpay_order_id,
        prefill: {
          name: profile?.full_name || '',
          email: user?.email || '',
          contact: business?.phone || phone || '',
        },
        theme: { color: '#166534' },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
        handler: () => {
          setPaying(false);
          pollForActivation();
        },
      });
      rzp.on('payment.failed', () => {
        setPaying(false);
        toast.error('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      toast.error('Could not start payment.');
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Request received</h3>
            <p className="text-sm text-muted-foreground">
              We'll be in touch within 24 hours to help you switch to {tier.name}.
            </p>
            <Button className="w-full mt-2" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : activated ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">You're on {tier.name} 🎉</h3>
            <p className="text-sm text-muted-foreground">
              All {tier.name} features are now unlocked for your business.
            </p>
            <Button className="w-full mt-2" onClick={() => { onOpenChange(false); window.location.reload(); }}>
              Continue
            </Button>
          </div>
        ) : awaitingActivation ? (
          <div className="py-6 text-center space-y-3">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <h3 className="text-lg font-bold">
              {activationSlow ? 'Payment successful, activating shortly' : 'Payment received — activating your plan…'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activationSlow
                ? 'Your plan will unlock within a few minutes. Feel free to close this window.'
                : 'This usually takes a few seconds.'}
            </p>
            {activationSlow && (
              <Button className="w-full mt-2" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Upgrade to {tier.name}
              </DialogTitle>
              <DialogDescription>
                {isFree
                  ? tier.tagline
                  : `Pay securely to unlock ${tier.name} instantly, or request a callback.`}
              </DialogDescription>
            </DialogHeader>

            {!isFree && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCycle('annual')}
                    className={`text-left rounded-md border p-2.5 transition ${cycle === 'annual' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="text-[11px] font-medium text-primary uppercase tracking-wide">Annual · Save</div>
                    <div className="text-sm font-semibold mt-0.5">{formatPrice(tier.annualPrice)}/mo</div>
                    <div className="text-[11px] text-muted-foreground">Billed {formatPrice(tier.annualPrice * 12)}/yr</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle('monthly')}
                    className={`text-left rounded-md border p-2.5 transition ${cycle === 'monthly' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Monthly</div>
                    <div className="text-sm font-semibold mt-0.5">{formatPrice(tier.monthlyPrice)}/mo</div>
                    <div className="text-[11px] text-muted-foreground">Billed monthly</div>
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>Total today (incl. 18% GST)</span>
                  <span className="font-semibold text-foreground">{formatPrice(totalWithGst)}</span>
                </div>
                <Button
                  className="w-full"
                  onClick={handlePayNow}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                  Pay {formatPrice(totalWithGst)} now
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Secure payment via Razorpay · UPI, Cards, Netbanking
                </p>
              </div>
            )}

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-2 text-muted-foreground">or request a callback</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ur-name">Your name</Label>
                <Input id="ur-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ur-phone">Phone</Label>
                <Input id="ur-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ur-note">Anything we should know? (optional)</Label>
                <Textarea id="ur-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting || paying}>Cancel</Button>
              <Button variant="outline" onClick={handleSubmit} disabled={submitting || paying || !phone.trim()}>
                {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Request callback
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
