import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, IndianRupee, Share2, CheckCircle, Loader2 } from 'lucide-react';
import suveeLogo from '@/assets/suvee-logo.png';

const BENEFITS = [
  { icon: IndianRupee, title: 'Earn Commission', desc: 'Get up to 10% commission on every paid subscription from your referrals' },
  { icon: Share2, title: 'Easy Sharing', desc: 'Get a unique link — share via WhatsApp, social media, or your network' },
  { icon: Users, title: 'Track Everything', desc: 'Real-time dashboard to track clicks, signups, conversions & payouts' },
];

export default function AffiliateSignup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', payout_upi: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setLoading(true);
    try {
      const code = `DISHA-AFF-${form.name.slice(0, 3).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { error } = await supabase.from('affiliates').insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        payout_upi: form.payout_upi.trim() || null,
        affiliate_code: code,
        status: 'pending',
      } as any);

      if (error) {
        if (error.code === '23505') toast.error('This email is already registered as an affiliate');
        else throw error;
        return;
      }

      setSuccess(true);
      toast.success('Application submitted!');
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-xl font-bold">Application Submitted! 🎉</h2>
          <p className="text-sm text-muted-foreground">
            We've received your application. Our team will review and approve it shortly.
            You'll receive your unique affiliate link via email.
          </p>
          <p className="text-xs text-muted-foreground">
            For any queries, reach out to us at support@REPLACE-ME.in
          </p>
          <Button asChild variant="outline">
            <a href="/">← Back to Home</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={suveeLogo} alt="Suvee" className="w-8 h-8" />
          <h1 className="text-lg font-bold">Suvee Business Automation — Affiliate Program</h1>
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <a href="/">← Home</a>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Earn by Helping Indian Businesses Grow 🇮🇳</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join Suvee's affiliate program and earn commission for every business you bring on board.
            Perfect for CA firms, business consultants, digital agencies & influencers.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="p-5 text-center">
              <b.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">{b.title}</h3>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </Card>
          ))}
        </div>

        {/* Who it's for */}
        <Card className="p-5 mb-10 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-3 text-center">Perfect For</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
            {[
              { emoji: '📊', label: 'CA / Tax Consultants' },
              { emoji: '💼', label: 'Business Consultants' },
              { emoji: '📱', label: 'Digital Marketers' },
              { emoji: '🎓', label: 'Startup Mentors' },
              { emoji: '🏭', label: 'Industry Associations' },
              { emoji: '📢', label: 'Social Media Influencers' },
              { emoji: '🏢', label: 'Co-working Spaces' },
              { emoji: '🤝', label: 'Business Networks' },
            ].map((item) => (
              <div key={item.label} className="p-2">
                <span className="text-xl">{item.emoji}</span>
                <p className="mt-1 text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Form */}
        <Card className="max-w-md mx-auto p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Apply Now — It's Free</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Phone (WhatsApp)</Label>
              <Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>UPI ID (for payouts)</Label>
              <Input placeholder="yourname@upi" value={form.payout_upi} onChange={(e) => setForm({ ...form, payout_upi: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              By applying, you agree to Suvee's affiliate terms. Commission rates are subject to change.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
