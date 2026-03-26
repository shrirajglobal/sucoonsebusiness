import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralCard({ compact = false }: { compact?: boolean }) {
  const { user, profile, businessId } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: referralCode } = useQuery({
    queryKey: ['my_referral_code', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user!.id)
        .single();
      return data?.referral_code || null;
    },
    enabled: !!user,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['my_referrals', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  if (!referralCode) return null;

  const referralLink = `https://sucoonsebusiness.lovable.app/signup?ref=${referralCode}`;
  const joinedCount = referrals.filter(r => r.status === 'joined' || r.status === 'rewarded').length;
  const earnedDays = joinedCount * 30;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hey! I'm using *Disha* to manage my business — tasks, CRM, contacts, all in one app. Try it FREE for 90 days! 🚀\n\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (compact) {
    return (
      <Card className="p-4 card-shadow bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <Gift className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Invite & Earn 30 days free</p>
            <p className="text-xs text-muted-foreground">Share Disha with a friend</p>
          </div>
          <Button size="sm" onClick={shareWhatsApp} className="shrink-0">
            <Share2 className="w-3.5 h-3.5 mr-1" /> Share
          </Button>
        </div>
        {earnedDays > 0 && (
          <p className="text-xs text-primary mt-2">🎉 You've earned {earnedDays} extra days from {joinedCount} referral{joinedCount > 1 ? 's' : ''}!</p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5 card-shadow">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-semibold">Invite & Earn</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Share Disha with another business owner. When they sign up, you get <span className="font-semibold text-foreground">30 days free</span> added to your account!
      </p>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-accent rounded-lg px-3 py-2 text-xs font-mono truncate">
          {referralLink}
        </div>
        <Button size="sm" variant="outline" onClick={copyLink}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <Button onClick={shareWhatsApp} className="w-full" size="sm">
        <Share2 className="w-4 h-4 mr-1" /> Share on WhatsApp
      </Button>

      {referrals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Your referrals</span>
            {earnedDays > 0 && (
              <Badge variant="secondary" className="text-xs">+{earnedDays} days earned</Badge>
            )}
          </div>
          <div className="space-y-1">
            {referrals.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.referred_email || 'Pending'}</span>
                <Badge variant={r.status === 'rewarded' ? 'default' : 'outline'} className="text-[10px]">
                  {r.status === 'pending' ? 'Invited' : r.status === 'joined' ? 'Joined' : 'Rewarded'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
