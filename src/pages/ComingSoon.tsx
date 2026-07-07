import { Link, useLocation } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowLeft, Sparkles } from 'lucide-react';
import { getTierForModule, getTier, formatPrice, TRIAL_DAYS } from '@/lib/pricing';
import { ROUTE_MODULE_MAP } from '@/lib/prelaunch';

export default function ComingSoon() {
  const location = useLocation();
  const moduleId = ROUTE_MODULE_MAP[location.pathname];
  const requiredTier = moduleId ? getTierForModule(moduleId) : 'growth';
  const tier = getTier(requiredTier);
  const isScaleOnly = requiredTier === 'scale';

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in-up px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Rocket className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Coming Soon!</h1>
        <p className="text-muted-foreground max-w-sm mb-2">
          We're building this feature for you. Stay tuned — it'll be worth the wait!
        </p>
        <div className="flex items-center gap-2 text-sm text-primary mb-8 max-w-md">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>
            {isScaleOnly
              ? `Requires the ${tier.name} plan (${formatPrice(tier.annualPrice)}/mo billed annually) once live. Free during your ${TRIAL_DAYS}-day trial.`
              : `Included in your ${TRIAL_DAYS}-day Growth trial.`}
          </span>
        </div>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
