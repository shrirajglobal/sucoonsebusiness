import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessModule,
  getTier,
  TRIAL_TIER,
  type PricingTierId,
} from '@/lib/pricing';

export interface CurrentPlan {
  plan: PricingTierId;
  billingCycle: 'monthly' | 'annual';
  status: string;
  trialEnd: string | null;
  extraDays: number;
  isTrialing: boolean;
  daysLeftInTrial: number;
  effectivePlan: PricingTierId;
}

export function useCurrentPlan() {
  const { businessId } = useAuth();

  return useQuery<CurrentPlan | null>({
    queryKey: ['current-plan', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId!)
        .maybeSingle();

      if (error || !data) return null;

      const plan = (data.plan as PricingTierId) || 'starter';
      const trialEnd = (data as any).trial_end as string | null;
      const extraDays = (data as any).extra_days || 0;
      const status = data.status as string;

      const now = Date.now();
      const trialEndMs = trialEnd
        ? new Date(trialEnd).getTime() + extraDays * 86400000
        : 0;
      const isTrialing = status === 'trialing' && trialEndMs > now;
      const daysLeftInTrial = isTrialing
        ? Math.ceil((trialEndMs - now) / 86400000)
        : 0;

      // During the 90-day trial, treat as Growth features (spec).
      const effectivePlan: PricingTierId = isTrialing ? TRIAL_TIER : plan;

      return {
        plan,
        billingCycle: ((data as any).billing_cycle || 'monthly') as 'monthly' | 'annual',
        status,
        trialEnd,
        extraDays,
        isTrialing,
        daysLeftInTrial,
        effectivePlan,
      };
    },
  });
}

export function useCanAccessModule(module: string): {
  loading: boolean;
  allowed: boolean;
  requiredTier: PricingTierId;
} {
  const { data, isLoading } = useCurrentPlan();
  const requiredTier = getRequiredTier(module);
  const plan = data?.effectivePlan || 'starter';
  return {
    loading: isLoading,
    allowed: canAccessModule(plan, module),
    requiredTier,
  };
}

function getRequiredTier(module: string): PricingTierId {
  for (const tier of ['starter', 'growth', 'scale'] as PricingTierId[]) {
    if (getTier(tier).modules.includes(module)) return tier;
  }
  return 'scale';
}
