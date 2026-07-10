import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';
import { getTier, formatPrice, type PricingTierId } from '@/lib/pricing';
import UpgradeRequestDialog from '@/components/shared/UpgradeRequestDialog';

interface UpgradePromptProps {
  requiredTier: PricingTierId;
  moduleName?: string;
}

export default function UpgradePrompt({ requiredTier, moduleName }: UpgradePromptProps) {
  const tier = getTier(requiredTier);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in-up px-4">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-primary" />
      </div>
      <Badge className="mb-3">{tier.name} plan required</Badge>
      <h1 className="text-2xl font-bold mb-2">
        {moduleName ? `${moduleName} is a ${tier.name} feature` : `Unlock with ${tier.name}`}
      </h1>
      <p className="text-muted-foreground max-w-md mb-6">{tier.tagline}</p>
      <Card className="p-5 max-w-sm w-full mb-6 border-2 border-primary/30">
        <div className="flex items-baseline justify-center gap-1 mb-1">
          <span className="text-3xl font-bold">{formatPrice(tier.annualPrice)}</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Billed annually · or {formatPrice(tier.monthlyPrice)}/mo monthly · + 18% GST
        </p>
        <ul className="text-left text-sm space-y-2">
          {tier.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Button size="lg" onClick={() => setOpen(true)}>
        Request upgrade to {tier.name} <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
      <UpgradeRequestDialog
        open={open}
        onOpenChange={setOpen}
        requestedTier={requiredTier}
        moduleContext={moduleName}
      />
    </div>
  );
}
