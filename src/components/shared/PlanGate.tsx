import { Loader2, Compass } from 'lucide-react';
import { useCanAccessModule } from '@/lib/planGating';
import UpgradePrompt from '@/components/shared/UpgradePrompt';
import { useBusiness } from '@/hooks/useSupabaseData';
import { isModuleRelevantForVertical, BUSINESS_TYPES } from '@/lib/constants';
import type { BusinessType } from '@/types';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface PlanGateProps {
  module: string;
  moduleName?: string;
  children: React.ReactNode;
}

export default function PlanGate({ module, moduleName, children }: PlanGateProps) {
  const { loading, allowed, requiredTier } = useCanAccessModule(module);
  const { data: business, isLoading: businessLoading } = useBusiness();
  const businessType = (business?.business_type ?? null) as BusinessType | null;

  if (loading || businessLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Structural relevance beats plan gating. If the module isn't relevant for
  // this vertical (typed URL or legacy nav link), show a friendly redirect
  // rather than an upsell — you can't upgrade your way into a feature that
  // isn't part of your workflow.
  if (!isModuleRelevantForVertical(module, businessType)) {
    const label = BUSINESS_TYPES.find((t) => t.id === businessType)?.label ?? 'your business';
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Compass className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Not part of {label} workflows</h2>
            <p className="text-sm text-muted-foreground">
              {moduleName ?? 'This feature'} is built for a different business type.
              Your sidebar already shows everything relevant for you.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <UpgradePrompt requiredTier={requiredTier} moduleName={moduleName} />;
  }

  return <>{children}</>;
}
