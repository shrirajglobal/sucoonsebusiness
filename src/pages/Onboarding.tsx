import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BUSINESS_TYPES, CORE_MODULES, DEFAULT_MODULES, DEFAULT_TIER_SETTINGS, getPartnerLabels, getFilteredAdvancedModules } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { BusinessType } from '@/types';
import { ArrowLeft, ArrowRight, Check, Building2, Users, Blocks, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { icon: Building2, title: 'Business Identity', subtitle: 'Tell us about your business' },
  { icon: Blocks, title: 'Business Type', subtitle: 'We\'ll auto-configure your setup' },
  { icon: Users, title: 'Your Team', subtitle: 'Add team members (optional)' },
  { icon: Sparkles, title: 'Modules', subtitle: 'Choose what you need' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const refCode = searchParams.get('ref') || localStorage.getItem('disha_ref') || null;
  const affCode = searchParams.get('aff') || localStorage.getItem('disha_aff') || null;

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [members, setMembers] = useState<{ name: string }[]>([]);
  const [memberName, setMemberName] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>(DEFAULT_MODULES);

  const canProceed = step === 0 ? name && ownerName : step === 1 ? !!selectedType : true;
  const typeConfig = BUSINESS_TYPES.find((t) => t.id === selectedType);
  const isPartnerNetworkVertical = selectedType === 'agency' || selectedType === 'real_estate' || selectedType === 'finance';
  const isFeeScheduleVertical = selectedType === 'education';

  // Auto-check partner_network when a three-party vertical is selected
  useEffect(() => {
    if (isPartnerNetworkVertical) {
      setEnabledModules((prev) => prev.includes('partner_network') ? prev : [...prev, 'partner_network']);
    }
    if (isFeeScheduleVertical) {
      setEnabledModules((prev) => prev.includes('fee_schedule') ? prev : [...prev, 'fee_schedule']);
    }
  }, [isPartnerNetworkVertical, isFeeScheduleVertical]);

  // Prevent enabling inventory/vendor modules when the business type doesn't hold stock
  useEffect(() => {
    const visible = getFilteredAdvancedModules(selectedType).map((m) => m.id);
    setEnabledModules((prev) => prev.filter((id) => visible.includes(id) || !ADVANCED_MODULES.some((m) => m.id === id)));
  }, [selectedType]);

  const toggleModule = (id: string) => {
    setEnabledModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const addMember = () => {
    if (memberName.trim()) {
      setMembers((prev) => [...prev, { name: memberName.trim() }]);
      setMemberName('');
    }
  };

  const finish = async () => {
    if (!selectedType || !typeConfig || !user) return;
    setSaving(true);

    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const taskTypes = typeConfig.taskTypes;

      // Build Partner Network seed data for Agency/Real Estate/Finance verticals
      let seedLeads: any[] = [
        { name: 'Rajesh Patel', company: 'Patel Industries', phone: '9876543210', value: 150000, source: 'IndiaMART', stage: typeConfig.stages[0] },
        { name: 'Sunita Sharma', company: 'Sharma Enterprises', phone: '9876543211', value: 85000, source: 'Referral', stage: typeConfig.stages[1] },
        { name: 'Amit Kumar', company: 'Kumar Trading', phone: '9876543212', value: 220000, source: 'Website', stage: typeConfig.stages[2] },
      ];
      let seedCustomers: any[] = [
        { name: 'Vikram Singh', company: 'Singh Manufacturing', phone: '9876543213', tier: 'A', last_contact_date: new Date(Date.now() - 10 * 86400000).toISOString(), last_contact_type: 'call', lifetime_value: 500000 },
        { name: 'Priya Gupta', company: 'Gupta Traders', phone: '9876543214', tier: 'B', last_contact_date: new Date(Date.now() - 35 * 86400000).toISOString(), last_contact_type: 'whatsapp', lifetime_value: 120000 },
        { name: 'Mohit Jain', company: 'Jain & Co', phone: '9876543215', tier: 'C', lifetime_value: 45000 },
      ];
      let seedPartnerNetwork: any = null;
      let seedFeePlan: any = null;

      if (isPartnerNetworkVertical) {
        // Skip generic sample leads/customers — the sample client is seeded via Partner Network block
        seedLeads = [];
        seedCustomers = [];
        const labels = getPartnerLabels(selectedType);
        seedPartnerNetwork = buildPartnerNetworkSeed(selectedType!, labels);
      }

      if (isFeeScheduleVertical) {
        seedFeePlan = buildFeePlanSeed();
      }

      const { error } = await supabase.rpc('complete_onboarding', {
        _name: name,
        _owner_name: ownerName,
        _phone: phone,
        _city: city,
        _business_type: selectedType,
        _modules: enabledModules,
        _pipeline_stages: typeConfig.stages,
        _task_types: taskTypes,
        _tier_settings: DEFAULT_TIER_SETTINGS as any,
        _members: members,
        _seed_tasks: [
          { title: 'Follow up with new inquiry', priority: 'high', status: 'todo', due_date: tomorrow, task_type: taskTypes[0] },
          { title: 'Prepare quotation for client', priority: 'medium', status: 'in_progress', due_date: nextWeek, task_type: taskTypes[1] },
          { title: 'Review pending orders', priority: 'low', status: 'todo', due_date: nextWeek, task_type: taskTypes[2] || taskTypes[0] },
        ],
        _seed_leads: seedLeads,
        _seed_customers: seedCustomers,
        _seed_partner_network: seedPartnerNetwork,
        _seed_fee_plan: seedFeePlan,
      } as any);

      if (error) throw error;

      // Create subscription (90-day Growth trial)
      const { data: profileData } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      if (profileData?.business_id) {
        // Generate referral code
        const code = `DISHA-${name.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await supabase.from('profiles').update({ referral_code: code } as any).eq('id', user.id);

        await supabase.from('subscriptions').insert({
          business_id: profileData.business_id,
          plan: 'growth',
          status: 'trialing',
          billing_cycle: 'monthly',
          trial_tier: 'growth',
          referred_by: refCode || null,
        } as any);

        // Process referral reward if referred
        if (refCode) {
          try {
            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('id, business_id, referral_code')
              .eq('referral_code', refCode)
              .maybeSingle();
            if (referrerProfile?.business_id) {
              await supabase.from('referrals').insert({
                referrer_business_id: referrerProfile.business_id,
                referrer_user_id: referrerProfile.id,
                referral_code: refCode,
                referred_email: user.email,
                referred_business_id: profileData.business_id,
                status: 'joined',
                reward_days: 30,
              } as any);
              // Add extra days to referrer's subscription
              const { data: refSub } = await supabase
                .from('subscriptions')
                .select('id, extra_days')
                .eq('business_id', referrerProfile.business_id)
                .maybeSingle();
              if (refSub) {
                await supabase.from('subscriptions').update({
                  extra_days: (refSub.extra_days || 0) + 30,
                } as any).eq('id', refSub.id);
              }
            }
          } catch (e) {
            console.error('Referral processing error:', e);
          }
          localStorage.removeItem('disha_ref');
        }

        // Process affiliate attribution
        if (affCode && profileData?.business_id) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
              body: JSON.stringify({ action: 'signup', affiliate_code: affCode, business_id: profileData.business_id }),
            });
          } catch (e) {
            console.error('Affiliate tracking error:', e);
          }
          localStorage.removeItem('disha_aff');
        }
      }

      toast.success('Your business is ready!');
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up business');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-1">{STEPS[step].title}</h1>
          <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
        </div>

        <Card className="p-6 card-shadow animate-in-up">
          {step === 0 && (
            <div className="space-y-4">
              <div><Label htmlFor="bname">Business Name *</Label><Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Industries" className="mt-1.5" /></div>
              <div><Label htmlFor="owner">Owner Name *</Label><Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Rakesh Sharma" className="mt-1.5" /></div>
              <div><Label htmlFor="phone">Business Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="mt-1.5" /></div>
              <div><Label htmlFor="city">City</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ahmedabad" className="mt-1.5" /></div>
            </div>
          )}

          {step === 1 && (() => {
            const GROUPS: { title: string; hint: string; ids: BusinessType[] }[] = [
              { title: 'Buy & Sell', hint: 'You hold stock and resell it.', ids: ['manufacturing', 'trading', 'retail'] },
              { title: 'Connect & Earn Commission', hint: 'You match clients to third-party partners.', ids: ['agency', 'real_estate', 'finance'] },
              { title: 'Deliver a Service', hint: 'You bill time, projects or retainers.', ids: ['services'] },
              { title: 'Education', hint: 'You collect fees on a schedule.', ids: ['education'] },
              { title: 'Something else', hint: 'Configure your own pipeline.', ids: ['custom'] },
            ];
            return (
              <div className="space-y-5">
                {GROUPS.map((g) => {
                  const items = BUSINESS_TYPES.filter((bt) => g.ids.includes(bt.id));
                  if (!items.length) return null;
                  return (
                    <div key={g.title}>
                      <div className="mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
                        <p className="text-[11px] text-muted-foreground/80">{g.hint}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {items.map((bt) => (
                          <button key={bt.id} onClick={() => setSelectedType(bt.id)}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                              selectedType === bt.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/30 hover:bg-accent/50'
                            }`}>
                            <span className="text-2xl mb-2 block">{bt.emoji}</span>
                            <span className="text-sm font-medium block">{bt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {selectedType && typeConfig && (
                  <div className="p-3 rounded-lg bg-accent text-xs text-accent-foreground">
                    <p className="font-medium mb-1">Auto-configured pipeline:</p>
                    <p className="text-muted-foreground">{typeConfig.stages.join(' → ')}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add up to 3 team members now, or skip and add later.</p>
              <div className="flex gap-2">
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Member name" onKeyDown={(e) => e.key === 'Enter' && addMember()} />
                <Button onClick={addMember} disabled={!memberName.trim() || members.length >= 3} size="sm">Add</Button>
              </div>
              {members.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent">
                  <span className="text-sm font-medium">{m.name}</span>
                  <button onClick={() => setMembers((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Core Modules</p>
                <div className="space-y-2">
                  {CORE_MODULES.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{mod.emoji}</span>
                        <span className="text-sm font-medium">{mod.label}</span>
                      </div>
                      <Switch checked={enabledModules.includes(mod.id)} onCheckedChange={() => toggleModule(mod.id)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Advanced Modules</p>
                <div className="space-y-2">
                  {getFilteredAdvancedModules(selectedType).map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{mod.emoji}</span>
                        <span className="text-sm font-medium">{mod.label}</span>
                      </div>
                      <Switch checked={enabledModules.includes(mod.id)} onCheckedChange={() => toggleModule(mod.id)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Launch My Business
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Vertical-specific Partner Network seed data. Uses PARTNER_LABELS-driven wording
// so /partners isn't empty on first visit for Agency / Real Estate / Finance businesses.
function buildPartnerNetworkSeed(
  businessType: BusinessType,
  labels: { partner: string; item: string },
) {
  const today = new Date().toISOString().slice(0, 10);

  const presets: Record<string, {
    vendors: { name: string; company?: string; phone?: string }[];
    products: { vendor_index: number; product_name: string; category?: string; unit_price?: number }[];
    client: { name: string; company?: string; phone?: string; tier?: 'A' | 'B' | 'C' };
    order: { vendor_index: number; product_index: number; amount: number };
    rule: { rate_type: 'percentage' | 'flat'; rate_value: number };
  }> = {
    agency: {
      vendors: [
        { name: 'Acme Suppliers', company: 'Acme Suppliers Pvt Ltd', phone: '9876500001' },
        { name: 'Zenith Traders', company: 'Zenith Traders LLP', phone: '9876500002' },
      ],
      products: [
        { vendor_index: 0, product_name: 'Steel rods (12mm)', category: 'Raw material', unit_price: 65 },
        { vendor_index: 0, product_name: 'Cement bag (50kg)', category: 'Raw material', unit_price: 380 },
        { vendor_index: 1, product_name: 'PVC pipes (1 inch)', category: 'Plumbing', unit_price: 120 },
      ],
      client: { name: 'Mehta Constructions', company: 'Mehta Constructions', phone: '9876511111', tier: 'A' },
      order: { vendor_index: 0, product_index: 0, amount: 45000 },
      rule: { rate_type: 'percentage', rate_value: 5 },
    },
    real_estate: {
      vendors: [
        { name: 'Skyline Builders', company: 'Skyline Builders Ltd', phone: '9876500003' },
        { name: 'Prime Properties', company: 'Prime Properties', phone: '9876500004' },
      ],
      products: [
        { vendor_index: 0, product_name: '2BHK · Andheri West', category: 'Apartment', unit_price: 12500000 },
        { vendor_index: 0, product_name: '3BHK · Bandra East', category: 'Apartment', unit_price: 22500000 },
        { vendor_index: 1, product_name: 'Plot · Whitefield 1800 sqft', category: 'Land', unit_price: 8500000 },
      ],
      client: { name: 'Anil Kapoor', company: null as any, phone: '9876522222', tier: 'A' },
      order: { vendor_index: 0, product_index: 0, amount: 12500000 },
      rule: { rate_type: 'percentage', rate_value: 2 },
    },
    finance: {
      vendors: [
        { name: 'HDFC Bank', company: 'HDFC Bank Ltd', phone: '9876500005' },
        { name: 'Bajaj Finserv', company: 'Bajaj Finance Ltd', phone: '9876500006' },
      ],
      products: [
        { vendor_index: 0, product_name: 'Business loan · up to 50L', category: 'Business loan', unit_price: 5000000 },
        { vendor_index: 0, product_name: 'Home loan · 20yr', category: 'Home loan', unit_price: 10000000 },
        { vendor_index: 1, product_name: 'Personal loan · 5yr', category: 'Personal loan', unit_price: 1500000 },
      ],
      client: { name: 'Rohit Verma', company: 'Verma Enterprises', phone: '9876533333', tier: 'B' },
      order: { vendor_index: 0, product_index: 0, amount: 2500000 },
      rule: { rate_type: 'percentage', rate_value: 1.5 },
    },
  };

  const preset = presets[businessType];
  if (!preset) return null;

  return {
    commission_rule: preset.rule,
    vendors: preset.vendors,
    vendor_products: preset.products.map((p) => ({
      vendor_index: p.vendor_index,
      product_name: p.product_name,
      category: p.category || labels.item,
      unit_price: p.unit_price,
    })),
    sample_client: preset.client,
    sample_order: {
      vendor_index: preset.order.vendor_index,
      product_index: preset.order.product_index,
      amount: preset.order.amount,
      order_date: today,
      notes: `Sample order · ${labels.partner} → client`,
    },
  };
}

// Education vertical fee-plan seed. Fictional client + a single sample plan
// ("Annual Course Fee", 3 installments). Installment rows are generated
// server-side inside complete_onboarding via public.generate_fee_installments,
// which is the same helper that create_fee_plan_with_installments uses — so
// rounding math is not duplicated here.
function buildFeePlanSeed() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    sample_client: {
      // Fictional student/parent — not a real institution or person
      name: 'Aarav Sample (Demo Student)',
      company: null as any,
      phone: '9876540000',
      tier: 'B',
    },
    plan: {
      plan_name: 'Annual Course Fee',
      total_amount: 30000,
      installment_count: 3,
      start_date: today,
    },
  };
}
