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
  CheckSquare, Users, IndianRupee, Package, Clock, Bot,
  ArrowRight, Shield, Smartphone, Zap, Star, ChevronRight,
  Menu, X
} from 'lucide-react';
import { useState } from 'react';
import dishaLogo from '@/assets/disha-logo.png';

const FEATURES = [
  { icon: CheckSquare, title: 'Task Management', desc: 'Assign, track & complete tasks. Never miss a follow-up again.', emoji: '✅' },
  { icon: Users, title: 'CRM & Leads', desc: 'Manage leads from IndiaMART, TradeIndia & more. Track every inquiry.', emoji: '🤝' },
  { icon: IndianRupee, title: 'Finance & GST', desc: 'Track income, expenses & GST. Know your profit anytime.', emoji: '💰' },
  { icon: Package, title: 'Inventory', desc: 'Stock tracking with low-stock alerts. SKU & category management.', emoji: '📦' },
  { icon: Clock, title: 'Attendance', desc: 'Punch in/out, leave tracking & daily attendance reports.', emoji: '⏰' },
  { icon: Bot, title: 'AI Assistant', desc: 'Get AI-powered insights, reports & business recommendations.', emoji: '🤖' },
];

const STEPS = [
  { num: '1', title: 'Sign Up Free', desc: 'Create your account in 30 seconds. No credit card needed.', emoji: '📱' },
  { num: '2', title: 'Setup in 2 Minutes', desc: 'Choose your industry — we auto-configure everything for you.', emoji: '⚡' },
  { num: '3', title: 'Start Managing', desc: 'Add tasks, leads & start tracking. Your business, organized.', emoji: '🚀' },
];

const FAQS = [
  { q: 'Is Disha really free?', a: 'Yes! You can start using Disha completely free. No credit card required. We offer premium features for growing businesses.' },
  { q: 'Is my business data safe?', a: 'Absolutely. Your data is encrypted and stored securely on enterprise-grade servers. We never share your data with anyone.' },
  { q: 'Can I use it on my phone?', a: 'Yes! Disha is designed mobile-first. It works perfectly on any smartphone browser — Android or iPhone. No app download needed.' },
  { q: 'Does it support GST billing?', a: 'Yes, our finance module supports GST rates (5%, 12%, 18%, 28%) and tracks GST amounts on all transactions.' },
  { q: 'Can my team members also use it?', a: 'Yes! You can add team members during setup or later. Assign tasks, track attendance and manage your team from one place.' },
  { q: 'What industries does it support?', a: 'Disha is pre-configured for Manufacturing, Trading, Services/IT, Real Estate, Education, Retail, Finance and more. You can also create a custom setup.' },
];

const TRUST_ITEMS = [
  { icon: Shield, label: 'GST Ready' },
  { icon: Smartphone, label: 'Mobile First' },
  { icon: Zap, label: 'Setup in 2 Min' },
  { icon: Star, label: 'Made for India' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={dishaLogo} alt="Disha" className="h-8 w-auto" />
            <span className="font-semibold text-foreground">Disha</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/signup"><Button size="sm">Start Free <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-2">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">How It Works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">FAQ</a>
            <Link to="/signup" className="block"><Button className="w-full mt-1" size="sm">Start Free</Button></Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-medium px-3 py-1">
            🇮🇳 Built for Indian SMEs & MSMEs
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            Run your entire business
            <span className="text-primary block">from your phone</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Tasks, CRM, Finance, Inventory, Attendance — all in one simple app.
            No training needed. Start in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                Start Free — No Card Needed <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                See Features
              </Button>
            </a>
          </div>
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

      {/* Problem statement */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Still juggling WhatsApp + Excel + Paper?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            Most Indian business owners waste 2-3 hours daily switching between WhatsApp groups, 
            Excel sheets, paper registers and random apps. Disha brings everything into one place.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg sm:max-w-none mx-auto">
            {[
              { before: '📱 WhatsApp Groups', after: '✅ Task Board' },
              { before: '📊 Excel Sheets', after: '💰 Auto Finance' },
              { before: '📝 Paper Registers', after: '📦 Digital Inventory' },
            ].map((item) => (
              <Card key={item.before} className="p-4 text-center">
                <p className="text-sm text-muted-foreground line-through mb-2">{item.before}</p>
                <ChevronRight className="w-4 h-4 mx-auto text-primary mb-2 rotate-90" />
                <p className="text-sm font-semibold text-primary">{item.after}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 md:py-20 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Everything you need. Nothing you don't.</h2>
            <p className="text-muted-foreground">Six powerful modules, one simple app.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-5 md:p-6 hover:shadow-md transition-shadow">
                <span className="text-3xl mb-3 block">{f.emoji}</span>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Get started in 3 simple steps</h2>
            <p className="text-muted-foreground">No training, no complicated setup.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl mx-auto mb-4">
                  {s.emoji}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-3">
                  {s.num}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business types */}
      <section className="px-4 py-16 md:py-20 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Pre-configured for your industry</h2>
            <p className="text-muted-foreground">Choose your business type and we set up everything — pipeline stages, task types, and more.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {BUSINESS_TYPES.map((bt) => (
              <Card key={bt.id} className="p-4 text-center hover:border-primary/30 transition-colors cursor-default">
                <span className="text-2xl mb-2 block">{bt.emoji}</span>
                <span className="text-sm font-medium">{bt.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-16 md:py-20">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Free for 90 days. No credit card.</h2>
          <p className="text-muted-foreground mb-8">
            Start managing your business today with full access for 90 days. Zero cost, zero risk.
          </p>
          <Card className="p-6 md:p-8 border-2 border-primary">
            <Badge className="mb-4">🚀 Pre-Launch Offer</Badge>
            <h3 className="text-3xl font-bold mb-1">₹0</h3>
            <p className="text-sm text-muted-foreground mb-6">Free for 90 days · No card needed</p>
            <ul className="text-left space-y-3 mb-8">
              {[
                'Tasks, CRM & Idea Board',
                'Contact management & Card Scanner',
                'Team & role management',
                'AI-powered insights (coming soon)',
                'Finance & Inventory (coming soon)',
                'Refer a friend → earn 30 days free',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="w-3 h-3 text-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/signup">
              <Button className="w-full h-12 text-base">
                Start Free — 90 Days Access <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-16 md:py-20 bg-card border-y border-border">
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

      {/* Final CTA */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Start managing your business today
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of Indian business owners who switched from chaos to clarity.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-base px-10 h-12">
              Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-4">No credit card · Setup in 2 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={dishaLogo} alt="Disha" className="h-7 w-auto" />
            <span className="text-sm font-semibold">Disha</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Disha. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}