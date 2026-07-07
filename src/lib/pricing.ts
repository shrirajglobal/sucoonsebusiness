// Single source of truth for pricing tiers, user limits and module access.
// Never hardcode a price, tier name, or user limit anywhere else — always import from here.

export type PricingTierId = 'starter' | 'growth' | 'scale';
export type BillingCycle = 'monthly' | 'annual';

export const GST_RATE = 0.18;
export const TRIAL_DAYS = 90;
export const TRIAL_TIER: PricingTierId = 'growth';
export const CURRENCY = '₹';

export const AFFILIATE_COMMISSION_NOTE =
  'Commission is paid on successful Growth & Scale conversions only (Starter is free). Payouts processed monthly via UPI/Bank transfer.';

export interface PricingTier {
  id: PricingTierId;
  name: string;
  tagline: string;
  /** ₹ per month billed monthly (0 for Starter) */
  monthlyPrice: number;
  /** ₹ per month equivalent when billed annually */
  annualPrice: number;
  userLimit: number | 'unlimited';
  modules: string[];
  highlights: string[];
  popular?: boolean;
  cta: string;
}

// Module IDs align with ROUTE_MODULE_MAP in src/lib/prelaunch.ts
export const STARTER_MODULES = ['dashboard', 'tasks', 'ideas', 'contacts', 'cards', 'settings'];
export const GROWTH_MODULES = [
  ...STARTER_MODULES,
  'crm',
  'support',
  'team',
  'reports',
];
export const SCALE_MODULES = [
  ...GROWTH_MODULES,
  'finance',
  'inventory',
  'attendance',
  'compliance',
  'assistant',
  'analytics',
  'engagement',
  'branches',
  'vendors',
  'forms',
];

export const CARD_SCANNER_LIMITS: Record<PricingTierId, number | 'unlimited'> = {
  starter: 20,
  growth: 'unlimited',
  scale: 'unlimited',
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Free forever — for solo founders getting organized.',
    monthlyPrice: 0,
    annualPrice: 0,
    userLimit: 1,
    modules: STARTER_MODULES,
    highlights: [
      '1 user',
      'Tasks & Idea Board',
      'Contacts',
      'Card Scanner (20 scans/month)',
    ],
    cta: 'Start Free',
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Everything a growing team needs to close more deals.',
    monthlyPrice: 999,
    annualPrice: 799,
    userLimit: 10,
    modules: GROWTH_MODULES,
    highlights: [
      'Up to 10 users',
      'CRM & Sales Pipeline',
      'Unlimited Card Scanner',
      'Support Centre',
      'Team & Roles',
    ],
    popular: true,
    cta: 'Try Growth Free for 90 Days',
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'Full operations suite for multi-branch businesses.',
    monthlyPrice: 2499,
    annualPrice: 1999,
    userLimit: 'unlimited',
    modules: SCALE_MODULES,
    highlights: [
      'Unlimited users',
      'Finance & GST',
      'Inventory',
      'Attendance & Compliance',
      'AI Assistant',
      'Multi-branch',
    ],
    cta: 'Go Scale',
  },
];

export function getTier(id: PricingTierId | string | null | undefined): PricingTier {
  return PRICING_TIERS.find((t) => t.id === id) || PRICING_TIERS[0];
}

export function formatPrice(n: number): string {
  return `${CURRENCY}${n.toLocaleString('en-IN')}`;
}

export function formatPriceWithGst(n: number): string {
  if (n === 0) return 'Free';
  return `${formatPrice(n)} + 18% GST`;
}

/** Minimum tier that grants access to a given module. Falls back to 'scale' for unknown modules. */
export function getTierForModule(module: string): PricingTierId {
  if (STARTER_MODULES.includes(module)) return 'starter';
  if (GROWTH_MODULES.includes(module)) return 'growth';
  return 'scale';
}

export function canAccessModule(plan: PricingTierId, module: string): boolean {
  return getTier(plan).modules.includes(module);
}

export function isPaidTier(plan: PricingTierId): boolean {
  return plan === 'growth' || plan === 'scale';
}

export function userLimitLabel(limit: number | 'unlimited'): string {
  return limit === 'unlimited' ? 'Unlimited users' : `Up to ${limit} user${limit === 1 ? '' : 's'}`;
}
