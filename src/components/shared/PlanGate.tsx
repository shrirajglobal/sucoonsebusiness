import { Loader2 } from 'lucide-react';
import { useCanAccessModule } from '@/lib/planGating';
import UpgradePrompt from '@/components/shared/UpgradePrompt';

interface PlanGateProps {
  module: string;
  moduleName?: string;
  children: React.ReactNode;
}

export default function PlanGate({ module, moduleName, children }: PlanGateProps) {
  const { loading, allowed, requiredTier } = useCanAccessModule(module);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return <UpgradePrompt requiredTier={requiredTier} moduleName={moduleName} />;
  }

  return <>{children}</>;
}
