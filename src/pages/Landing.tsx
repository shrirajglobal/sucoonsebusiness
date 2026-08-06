import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BUSINESS_TYPES } from '@/lib/constants';
import {
  CheckSquare, Users, ArrowRight, Shield, Smartphone, Zap, Star,
  Menu, X, Lightbulb, ScanLine, HeadphonesIcon, UserCog,
  Clock, IndianRupee, Package, Bot, Gift, TrendingUp,
  PhoneCall, Globe, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import suveeLogo from '@/assets/suvee-logo.png';
import { PRICING_TIERS, formatPrice, userLimitLabel, TRIAL_DAYS } from '@/lib/pricing';

const LIVE_FEATURES = [
  { icon: CheckSquare, title: 'Task Management', desc: 'Assign, track & complete tasks with voice notes, sub-tasks, recurring schedules & Kanban boards.', emoji: '✅', tag: 'Live' },
  { icon: Users, title: 'CRM & Pipeline', desc: 'Capture leads from IndiaMART, JustDial & more. Auto-track every follow-up through your sales pipeline.', emoji: '🤝', tag: 'Live' },
  { icon: Lightbulb, title: 'Idea Board', desc: 'Capture ideas on the fly with voice notes. Pin, discuss & convert them into actionable tasks.', emoji: '💡', tag: 'Live' },
  { icon: ScanLine, title: 'Card Scanner', desc: 'Snap a visiting card — AI extracts name, phone, email & saves as a contact instantly.', emoji: '📇', tag: 'Live' },
  { icon: HeadphonesIcon, title: 'Support Centre', desc: 'Built-in help centre with ticket tracking, priority levels & real-time chat with our team.', emoji: '🎧', tag: 'Live' },
  { icon: UserCog, title: 'Team & Roles', desc: 'Add team members, assign roles (Admin, Manager, Executive) & control access to every module.', emoji: '👥', tag: 'Live' },
];

const COMING_SOON_FEATURES = [
  { icon: IndianRupee, title: 'Finance & GST', emoji: '💰' },
  { icon: Package, title: 'Inventory', emoji: '📦' },
  { icon: Clock, title: 'Attendance', emoji: '⏰' },
  { icon: Bot, title: 'AI Assistant', emoji: '🤖' },
];

const PAIN_SOLUTIONS = [
  { before: 'Leads scattered across WhatsApp', after: 'Every lead in a pipeline with follow-up reminders', emoji: '📱' },
  { before: 'Tasks floating in your head', after: 'Tasks assigned with deadlines, voice notes & checklists', emoji: '🧠' },
  { before: 'Ideas lost on paper napkins', after: 'Idea Board that converts brainstorms into action', emoji: '📝' },
  { before: 'Visiting cards piling in drawers', after: 'AI Card Scanner saves contacts in 3 seconds', emoji: '🗄️' },
];

const STEPS = [
  { num: '1', title: 'Sign Up Free', desc: 'Create your account in 30 seconds. No credit card, no commitment.', emoji: '📱' },
  { num: '2', title: 'Pick Your Industry', desc: 'Choose your business type — Suvee auto-configures pipeline stages, task types & modules.', emoji: '⚡' },
  { num: '3', title: 'Start Managing', desc: 'Add your first lead, create tasks, invite your team. Your business, finally organized.', emoji: '🚀' },
];

const FAQS = [
  { q: 'Is Suvee really free?', a: 'Every new account gets a 90-day free trial of our Growth tier — full CRM, unlimited Card Scanner, team & roles, no credit card. After trial you choose: Starter (Free forever, 1 user), Growth (₹799/mo billed annually, up to 10 users), or Scale (₹1,999/mo billed annually, unlimited users + Finance/Inventory/Attendance/AI). All paid plans exclude 18% GST.' },
  { q: 'Is my business data safe?', a: 'Absolutely. Your data is encrypted with bank-grade security and stored on enterprise servers. We never share or sell your data — it belongs 100% to you.' },
  { q: 'Can I use it on my phone?', a: 'Yes! Suvee is designed mobile-first. It works perfectly on any smartphone browser — Android or iPhone. No app download needed. Works offline-ready too.' },
  { q: 'What features are live right now?', a: 'Tasks (with Kanban, calendar, sub-tasks, voice notes), CRM & Pipeline, Idea Board, Contacts & AI Card Scanner, Support Centre, and Team Management are all live. Finance, Inventory, Attendance & AI Assistant are coming soon.' },
  { q: 'Can my team members also use it?', a: 'Yes! Add unlimited team members during setup or anytime later. Assign roles (Admin, Manager, Executive, Field Staff) to control exactly what each person can see and do.' },
  { q: 'What industries does it support?', a: 'Suvee is pre-configured for Manufacturing, Trading, Services/IT, Real Estate, Education, Retail, Finance and more. Each comes with industry-specific pipeline stages and task types. You can also create a fully custom setup.' },
  { q: 'How does the referral program work?', a: 'Share your unique referral link from Settings. When a friend signs up and creates their business, you get 30 extra free days. Invite 3 friends = 90 more days. There\'s no limit!' },
  { q: 'Does it support GST billing?', a: 'Our Finance & GST module is currently in development and will be available soon. It will support GST rates (5%, 12%, 18%, 28%), transaction tracking, and basic reporting.' },
];

const TRUST_ITEMS = [
  { icon: Shield, label: 'Bank-Grade Security' },
  { icon: Smartphone, label: 'Mobile First' },
  { icon: PhoneCall, label: 'WhatsApp Support' },
  { icon: Globe, label: 'Data Stored in India' },
];

const TESTIMONIALS = [
  { name: 'Rajesh K.', role: 'Manufacturing, Pune', quote: 'Finally stopped losing leads that came from IndiaMART. Pipeline tracking is a game-changer for our team of 12.', avatar: '🏭' },
  { name: 'Priya S.', role: 'Interior Design, Bangalore', quote: 'The Idea Board alone is worth it. I capture client ideas on-site with voice notes and convert them to tasks instantly.', avatar: '🎨' },
  { name: 'Amit D.', role: 'Trading, Ahmedabad', quote: 'We were using 4 different apps before. Now everything — tasks, leads, contacts — is in one place on my phone.', avatar: '📦' },
];

const PricingToggle = () => {
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setAnnual(false)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!annual ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${annual ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Annual <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Save 20%</Badge>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PRICING_TIERS.map((tier) => {
          const price = annual ? tier.annualPrice : tier.monthlyPrice;
          return (
            <Card
              key={tier.id}
              className={`p-6 flex flex-col relative ${tier.popular ? 'border-2 border-primary shadow-lg md:scale-105' : 'border border-border'}`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3">Most Popular</Badge>
              )}
              <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 min-h-[2.5rem]">{tier.tagline}</p>
              <div className="mb-1">
                {price === 0 ? (
                  <span className="text-3xl font-bold">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">{formatPrice(price)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                {price === 0
                  ? 'Forever · 1 user'
                  : annual
                  ? `Billed annually · ${formatPrice(tier.monthlyPrice)}/mo monthly · + 18% GST`
                  : 'Billed monthly · + 18% GST'}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm font-medium">
                  <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{userLimitLabel(tier.userLimit)}</span>
                </li>
                {tier.highlights.slice(1).map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm">
                    <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <Button className="w-full h-11" variant={tier.popular ? 'default' : 'outline'}>
                  {tier.cta} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-6">
        All new signups get a 90-day Growth trial free. Downgrade to Starter (free forever) or upgrade to Scale anytime.
      </p>
    </>
  );
};



export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

  const selectedBiz = BUSINESS_TYPES.find(b => b.id === activeIndustry);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={suveeLogo} alt="Suvee Business Automation" className="h-7 w-auto" />
            <span className="hidden sm:inline text-sm font-medium text-muted-foreground border-l border-border pl-2">Business Automation</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Industries</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/signup"><Button size="sm">Start Free — 90 Days <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-2">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">Features</a>
            <a href="#industries" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">Industries</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">FAQ</a>
            <Link to="/signup" className="block"><Button className="w-full mt-1" size="sm">Start Free — 90 Days</Button></Link>
          </div>
        )}
      </header>

      {/* Hero — Pain-point first */}
      <section className="px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-medium px-3 py-1">
            🚀 Pre-Launch · 90 Days Free · No Credit Card
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            Stop losing ₹50,000/month to
            <span className="text-primary block">missed follow-ups & forgotten tasks</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-3">
            The all-in-one business OS built for Indian startups, MSMEs & growing teams. 
            Tasks, CRM, Idea Board, Contacts — everything from your phone.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Pre-configured for <span className="font-medium text-foreground">Manufacturing</span> · <span className="font-medium text-foreground">Trading</span> · <span className="font-medium text-foreground">Services</span> · <span className="font-medium text-foreground">Retail</span> & more
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                Start Free — 90 Days, No Card <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                See What's Live
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> No card needed</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Setup in 2 min</span>
            <span className="flex items-center gap-1"><Star className="w-3 h-3" /> 100% free for 90 days</span>
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border bg-card py-6">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-10">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pain → Solution */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Still juggling WhatsApp + Excel + Paper?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most Indian business owners waste 2-3 hours daily switching between apps. Here's what changes with Suvee:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PAIN_SOLUTIONS.map((item) => (
              <Card key={item.before} className="p-5 flex gap-4 items-start">
                <span className="text-2xl shrink-0">{item.emoji}</span>
                <div>
                  <p className="text-sm text-muted-foreground line-through mb-1">{item.before}</p>
                  <ChevronRight className="w-3 h-3 text-primary mb-1" />
                  <p className="text-sm font-semibold text-foreground">{item.after}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features — Live + Coming Soon */}
      <section id="features" className="px-4 py-16 md:py-20 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Everything you need. Nothing you don't.</h2>
            <p className="text-muted-foreground">6 modules live today. More launching soon.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {LIVE_FEATURES.map((f) => (
              <Card key={f.title} className="p-5 md:p-6 hover:shadow-md transition-shadow relative">
                <Badge variant="default" className="absolute top-3 right-3 text-[9px] px-2 py-0.5">✅ Live</Badge>
                <span className="text-3xl mb-3 block">{f.emoji}</span>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
          {/* Coming Soon strip */}
          <div className="mt-8">
            <p className="text-center text-sm font-medium text-muted-foreground mb-4">🔜 Coming Soon</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COMING_SOON_FEATURES.map((f) => (
                <Card key={f.title} className="p-4 text-center opacity-70">
                  <span className="text-2xl mb-2 block">{f.emoji}</span>
                  <span className="text-xs font-medium">{f.title}</span>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Get started in 3 simple steps</h2>
            <p className="text-muted-foreground">No training needed. No complicated setup.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl mx-auto mb-4">
                  {s.emoji}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-3">
                  {s.num}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block w-5 h-5 text-muted-foreground/40 absolute top-10 -right-3" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Your Industry — Interactive */}
      <section id="industries" className="px-4 py-16 md:py-20 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Built for your industry</h2>
            <p className="text-muted-foreground">Click your business type — see exactly what's pre-configured for you.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
            {BUSINESS_TYPES.map((bt) => (
              <Card
                key={bt.id}
                onClick={() => setActiveIndustry(activeIndustry === bt.id ? null : bt.id)}
                className={`p-4 text-center cursor-pointer transition-all ${activeIndustry === bt.id ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/30'}`}
              >
                <span className="text-2xl mb-2 block">{bt.emoji}</span>
                <span className="text-sm font-medium">{bt.label}</span>
              </Card>
            ))}
          </div>
          {selectedBiz && (
            <Card className="p-5 animate-in fade-in duration-200 border-primary/20">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span>{selectedBiz.emoji}</span> {selectedBiz.label} — Pre-configured Setup
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">📊 Pipeline Stages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBiz.stages.map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">✅ Task Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBiz.taskTypes.map(t => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3 text-xs">⭐ Early Access Feedback</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Founders are already loving it</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="p-5">
                <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xl">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — 3 tiers */}
      <section id="pricing" className="px-4 py-16 md:py-20 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="mb-4 text-xs px-3 py-1">🔥 Simple, transparent pricing</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Start free. Grow at your pace.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Try Growth free for {TRIAL_DAYS} days. No credit card. Cancel anytime. All paid plans exclude 18% GST.
            </p>
          </div>

          <PricingToggle />
        </div>
      </section>

      {/* Referral — Gamified */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            <Gift className="w-7 h-7 inline-block mr-2 text-primary" />
            Invite Friends. Earn Free Days.
          </h2>
          <p className="text-muted-foreground mb-8">
            Each friend who signs up gives you <span className="font-bold text-foreground">30 extra free days</span>. No limit!
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            {[
              { friends: '1 friend', days: '+30 days' },
              { friends: '3 friends', days: '+90 days' },
              { friends: '5 friends', days: '+150 days' },
            ].map((r) => (
              <Card key={r.friends} className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{r.friends}</p>
                <p className="text-lg font-bold text-primary">{r.days}</p>
              </Card>
            ))}
          </div>
          <Link to="/signup">
            <Button variant="outline" size="lg" className="text-base px-8 h-12">
              Sign Up & Get Your Referral Link <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Affiliate — Compact Banner */}
      <section className="px-4 py-10 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="text-xs mb-2">💼 Affiliate Program</Badge>
            <p className="text-sm font-semibold">CAs, consultants & influencers — earn up to 10% commission on every paid conversion.</p>
          </div>
          <Link to="/affiliate">
            <Button variant="outline" size="sm">
              Apply as Affiliate <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA — Urgency */}
      <section className="px-4 py-16 md:py-24 bg-card border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Your competitors are already organizing. Are you?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join hundreds of Indian business owners who switched from chaos to clarity — in under 2 minutes.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-base px-10 h-12">
              Start Free — 90 Days, No Card <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-4">
            90 days free · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <img src={suveeLogo} alt="Suvee Business Automation" className="h-6 w-auto" />
            <span className="text-xs text-muted-foreground">Business Automation · by Shri Raj Global</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 md:gap-6 text-sm text-muted-foreground justify-center">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/help" className="hover:text-foreground transition-colors">Help Centre</Link>
            <Link to="/support" className="hover:text-foreground transition-colors">Support</Link>
            <Link to="/affiliate" className="hover:text-foreground transition-colors">Affiliates</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <span aria-hidden>·</span>
          <Link to="/refund" className="hover:text-foreground">Refund & Cancellation</Link>
          <span aria-hidden>·</span>
          <Link to="/shipping" className="hover:text-foreground">Shipping & Delivery</Link>
          <span aria-hidden>·</span>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <span className="ml-2">© 2026 Suvee Business Automation — a Shri Raj Global venture. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
