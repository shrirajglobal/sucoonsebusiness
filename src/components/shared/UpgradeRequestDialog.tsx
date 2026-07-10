import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/hooks/useSupabaseData';
import { getTier, formatPrice, type PricingTierId } from '@/lib/pricing';
import { toast } from 'sonner';

interface UpgradeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestedTier: PricingTierId;
  /** Optional: which locked module triggered this request */
  moduleContext?: string;
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

  useEffect(() => {
    if (open) {
      setName(profile?.full_name || '');
      setPhone(business?.phone || '');
      setNote(moduleContext ? `Interested in unlocking ${moduleContext}.` : '');
      setDone(false);
    }
  }, [open, profile, business, moduleContext]);

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
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Upgrade to {tier.name}
              </DialogTitle>
              <DialogDescription>
                {tier.monthlyPrice === 0
                  ? tier.tagline
                  : `${formatPrice(tier.annualPrice)}/mo billed annually · + 18% GST. Leave your details — our team will call to help you switch.`}
              </DialogDescription>
            </DialogHeader>
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
                <Textarea id="ur-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !phone.trim()}>
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
