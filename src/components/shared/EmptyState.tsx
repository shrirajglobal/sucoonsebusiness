import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="p-8 md:p-12 text-center card-shadow">
      <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          <Plus className="w-4 h-4 mr-1" /> {actionLabel}
        </Button>
      )}
    </Card>
  );
}
