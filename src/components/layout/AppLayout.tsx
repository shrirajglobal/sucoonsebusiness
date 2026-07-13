import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { isComingSoonModule } from '@/lib/prelaunch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, CheckSquare, Users, Clock, FileText,
  Heart, Settings, Menu, LogOut, BarChart3, Sparkles,
  IndianRupee, Package, Truck, CalendarCheck, Bot, GitBranch, MoreHorizontal,
  Contact, ScanLine, Lightbulb, LifeBuoy, HelpCircle, Gift, Handshake, Receipt, Lock, ChevronDown
} from 'lucide-react';
import dishaHorizontal from '@/assets/disha-horizontal.png';
import { getPartnerLabels, isModuleRelevantForVertical } from '@/lib/constants';
import { canAccessModuleForVertical, getRequiredTierForVertical, type PricingTierId } from '@/lib/pricing';
import { useCurrentPlan } from '@/lib/planGating';
import type { BusinessType } from '@/types';

type NavItem = { path: string; label: string; icon: any; module: string };
type NavGroup = { id: string; label: string; items: NavItem[]; collapsible?: boolean };

function buildNavGroups(businessType?: BusinessType | null): NavGroup[] {
  const partnerLabel = getPartnerLabels(businessType).navLabel ?? 'Partner Network';
  // Vertical-aware section labels — same idea as Tally's "Vouchers / Reports / Masters"
  const sellLabel =
    businessType === 'education' ? 'Admissions & Fees'
    : businessType === 'agency' ? 'Deals & Clients'
    : 'Sell & Collect';
  const operateLabel = businessType === 'agency' ? 'Deliver & Operate' : 'Operate';

  return [
    {
      id: 'daily',
      label: 'Daily',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
        { path: '/ideas', label: 'Idea Board', icon: Lightbulb, module: 'ideas' },
        { path: '/tasks', label: 'Tasks', icon: CheckSquare, module: 'tasks' },
      ],
    },
    {
      id: 'sell',
      label: sellLabel,
      collapsible: true,
      items: [
        { path: '/crm', label: 'CRM / Leads', icon: Users, module: 'crm' },
        { path: '/contacts', label: 'Contacts', icon: Contact, module: 'contacts' },
        { path: '/card-scanner', label: 'Card Scanner', icon: ScanLine, module: 'contacts' },
        { path: '/fee-plans', label: 'Fee Plans', icon: Receipt, module: 'fee_schedule' },
        { path: '/compliance', label: 'Compliance', icon: CalendarCheck, module: 'compliance' },
      ],
    },
    {
      id: 'operate',
      label: operateLabel,
      collapsible: true,
      items: [
        { path: '/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
        { path: '/vendors', label: 'Vendors & PO', icon: Truck, module: 'vendors' },
        { path: '/partners', label: partnerLabel, icon: Handshake, module: 'partner_network' },
        { path: '/finance', label: 'Finance', icon: IndianRupee, module: 'finance' },
        { path: '/attendance', label: 'Attendance', icon: Clock, module: 'attendance' },
        { path: '/forms', label: 'Forms', icon: FileText, module: 'forms' },
      ],
    },
    {
      id: 'grow',
      label: 'Grow',
      collapsible: true,
      items: [
        { path: '/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
        { path: '/reports', label: 'AI Reports', icon: Sparkles, module: 'reports' },
        { path: '/assistant', label: 'AI Assistant', icon: Bot, module: 'assistant' },
        { path: '/engagement', label: 'Engagement', icon: Heart, module: 'engagement' },
        { path: '/branches', label: 'Branches', icon: GitBranch, module: 'branches' },
      ],
    },
    {
      id: 'workspace',
      label: 'Workspace',
      collapsible: true,
      items: [
        { path: '/settings', label: 'Settings', icon: Settings, module: 'settings' },
        { path: '/help', label: 'Help', icon: HelpCircle, module: 'help' },
        { path: '/support', label: 'Support', icon: LifeBuoy, module: 'support' },
      ],
    },
  ];
}

const TIER_LABEL: Record<PricingTierId, string> = { starter: 'Starter', growth: 'Growth', scale: 'Scale' };

// (old buildNavGroups removed — replaced by outcome-based groups above)



const bottomNavItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/crm', label: 'CRM', icon: Users },
  { path: '/ideas', label: 'Ideas', icon: Lightbulb },
];

function TrialBanner() {
  const { user, businessId } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId!)
        .maybeSingle();
      return data;
    },
    enabled: !!businessId,
  });

  if (!subscription) return null;

  const trialEnd = new Date(subscription.trial_end);
  const extraMs = (subscription.extra_days || 0) * 86400000;
  const effectiveEnd = new Date(trialEnd.getTime() + extraMs);
  const daysLeft = Math.max(0, Math.ceil((effectiveEnd.getTime() - Date.now()) / 86400000));

  if (daysLeft <= 0) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-center">
      <p className="text-xs text-primary font-medium">
        🎉 Free for {daysLeft} more day{daysLeft !== 1 ? 's' : ''} — Enjoy!
        {subscription.extra_days > 0 && (
          <span className="ml-1 opacity-70">(+{subscription.extra_days}d from referrals)</span>
        )}
      </p>
    </div>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { data: business } = useBusiness();
  const { data: currentPlan } = useCurrentPlan();
  const userEmail = user?.email;
  const businessType = (business?.business_type ?? null) as BusinessType | null;
  const effectivePlan: PricingTierId = currentPlan?.effectivePlan || 'starter';

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4">
        {business?.logo_url ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{business?.name}</h2>
              <p className="text-xs text-muted-foreground truncate">{business?.owner_name}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <img src={dishaHorizontal} alt="Disha" className="h-10 w-auto object-contain object-left" />
            {business?.owner_name && (
              <p className="text-[11px] text-muted-foreground truncate pl-0.5">{business.owner_name}</p>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {buildNavGroups(businessType ?? undefined).map((group) => {
          const visibleItems = group.items.filter((item) =>
            isModuleRelevantForVertical(item.module, businessType)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const comingSoon = isComingSoonModule(item.module, userEmail);
                  const locked = !canAccessModuleForVertical(effectivePlan, item.module, businessType);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : comingSoon
                          ? 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {comingSoon ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-dashed opacity-60">Soon</Badge>
                      ) : locked && !isActive ? (
                        <Lock className="w-3 h-3 opacity-50" aria-label="Upgrade required" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>


      <div className="p-4 border-t border-border space-y-3">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors"
        >
          <Gift className="w-3.5 h-3.5" />
          <span className="font-medium">Invite & Earn 30 days</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
            {(profile?.full_name || '?')[0].toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1">{profile?.full_name}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} title="Sign out">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">Disha v2.0 · Pre-Launch</p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-30" style={{ boxShadow: 'var(--shadow-sidebar)' }}>
        <NavContent />
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b border-border flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <NavContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <img src={dishaHorizontal} alt="Disha" className="h-7 w-auto object-contain" />
      </header>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-14" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="w-5 h-5" />
          More
        </button>
      </div>

      <main className="flex-1 md:ml-60 min-h-screen">
        <TrialBanner />
        <div className="pt-14 md:pt-0 pb-16 md:pb-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
          <div className="hidden md:flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-6 text-[11px] text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <span aria-hidden>·</span>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <span aria-hidden>·</span>
            <Link to="/refund" className="hover:text-foreground">Refund</Link>
            <span aria-hidden>·</span>
            <Link to="/shipping" className="hover:text-foreground">Shipping</Link>
            <span aria-hidden>·</span>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <span aria-hidden>·</span>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <span className="ml-2">© {new Date().getFullYear()} Disha</span>
          </div>
        </div>
      </main>

      {/* Floating help button - mobile only */}
      {!['/help', '/support'].includes(location.pathname) && (
        <Link
          to="/help"
          className="md:hidden fixed bottom-[4.5rem] right-4 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <HelpCircle className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}
