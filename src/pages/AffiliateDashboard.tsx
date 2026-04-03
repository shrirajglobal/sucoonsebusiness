import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Copy, Share2, Loader2, MousePointerClick, UserPlus, IndianRupee, CreditCard, LogIn } from 'lucide-react';
import dishaLogo from '@/assets/disha-logo.png';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchAffiliateData();
  }, [user, authLoading]);

  const fetchAffiliateData = async () => {
    setLoading(true);
    try {
      // RLS ensures only own record is returned (matched by JWT email)
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setAffiliate(null);
        setLoading(false);
        return;
      }

      setAffiliate(data);

      const { data: evts } = await supabase
        .from('affiliate_events')
        .select('*')
        .eq('affiliate_id', data.id)
        .order('created_at', { ascending: false });

      setEvents(evts || []);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const affiliateLink = affiliate
    ? `${window.location.origin}/signup?aff=${affiliate.affiliate_code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    toast.success('Link copied!');
  };

  const shareWhatsApp = () => {
    const msg = `Hi! I recommend Disha — an all-in-one business management app for Indian startups & MSMEs. Try it free for 90 days: ${affiliateLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Not logged in — prompt to log in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-6 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <img src={dishaLogo} alt="Disha" className="w-8 h-8" />
            <h2 className="text-lg font-bold">Affiliate Dashboard</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Please log in to access your affiliate dashboard.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            <LogIn className="w-4 h-4 mr-2" /> Log In
          </Button>
          <Button variant="link" size="sm" className="w-full" asChild>
            <a href="/affiliate">Not an affiliate? Apply here →</a>
          </Button>
        </Card>
      </div>
    );
  }

  // Loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Logged in but no affiliate record
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-6 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <img src={dishaLogo} alt="Disha" className="w-8 h-8" />
            <h2 className="text-lg font-bold">Affiliate Dashboard</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            No affiliate account found for your email. Apply to become an affiliate partner.
          </p>
          <Button className="w-full" asChild>
            <a href="/affiliate">Apply as Affiliate →</a>
          </Button>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'Total Clicks', value: affiliate.total_clicks, icon: MousePointerClick },
    { label: 'Signups', value: affiliate.total_signups, icon: UserPlus },
    { label: 'Paid Conversions', value: affiliate.total_paid_conversions, icon: CreditCard },
    { label: 'Commission Earned', value: `₹${affiliate.total_commission || 0}`, icon: IndianRupee },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={dishaLogo} alt="Disha" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold">Welcome, {affiliate.name}!</h1>
            <p className="text-xs text-muted-foreground">Affiliate Code: {affiliate.affiliate_code}</p>
          </div>
          <Badge className="ml-auto" variant={affiliate.status === 'approved' ? 'default' : 'secondary'}>
            {affiliate.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {affiliate.status === 'pending' && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-primary font-medium">
              ⏳ Your application is under review. You'll get your affiliate link once approved.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="p-4 text-center">
              <s.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {affiliate.status === 'approved' && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Your Affiliate Link</h3>
            <div className="flex gap-2">
              <Input value={affiliateLink} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
              <Button onClick={shareWhatsApp} className="bg-[#25D366] hover:bg-[#20BD5A] text-white">
                <Share2 className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Commission Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Commission Rate</p>
              <p className="font-bold text-lg">{affiliate.commission_rate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payout Method</p>
              <p className="font-medium">{affiliate.payout_upi ? `UPI: ${affiliate.payout_upi}` : 'Not set'}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Commission is paid on successful paid subscriptions only. Payouts processed monthly via UPI/Bank transfer.
          </p>
        </Card>

        {events.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Activity Log</h3>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Badge variant="outline">{e.event_type}</Badge>
                      </TableCell>
                      <TableCell>{e.amount > 0 ? `₹${e.amount}` : '—'}</TableCell>
                      <TableCell>{format(new Date(e.created_at), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
