import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessModuleForVertical,
  getRequiredTierForVertical,
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
  businessType: string | null;
  activationSource: string | null;
  grantedAt: string | null;
  grantReason: string | null;
  currentPeriodEnd: string | null;
}

export function useCurrentPlan() {
  const { businessId } = useAuth();

  return useQuery<CurrentPlan | null>({
    queryKey: ['current-plan', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [{ data, error }, { data: biz }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('business_id', businessId!).maybeSingle(),
        supabase.from('businesses').select('business_type').eq('id', businessId!).maybeSingle(),
      ]);

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
        businessType: (biz as any)?.business_type ?? null,
        activationSource: ((data as any).activation_source ?? null) as string | null,
        grantedAt: ((data as any).granted_at ?? null) as string | null,
        grantReason: ((data as any).grant_reason ?? null) as string | null,
        currentPeriodEnd: ((data as any).current_period_end ?? null) as string | null,
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
  const businessType = data?.businessType ?? null;
  const requiredTier = getRequiredTierForVertical(module, businessType);
  const plan = data?.effectivePlan || 'starter';
  return {
    loading: isLoading,
    allowed: canAccessModuleForVertical(plan, module, businessType),
    requiredTier,
  };
}
