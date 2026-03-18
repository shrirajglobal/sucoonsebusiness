import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, MessageSquare } from 'lucide-react';

interface Props {
  customers: any[];
  tierSettings: any;
  onLog: (customer: any) => void;
}

export default function DormantReport({ customers, tierSettings, onLog }: Props) {
  const dormant = useMemo(() => {
    return customers
      .map((c) => {
        const freq = tierSettings[c.tier || 'B']?.frequency || 30;
        const days = c.last_contact_date
          ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000)
          : null;
        const isDormant = days === null || days > freq * 2;
        const isZero = !c.last_contact_date;
        return { ...c, days, isDormant, isZero, freq };
      })
      .filter((c) => c.isDormant || c.isZero)
      .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));
  }, [customers, tierSettings]);

  const zeroContact = dormant.filter((c) => c.isZero);
  const trueDormant = dormant.filter((c) => !c.isZero);

  if (dormant.length === 0) {
    return (
      <Card className="p-8 text-center card-shadow">
        <p className="text-sm text-muted-foreground">🎉 No dormant or zero-contact customers. Great work!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {zeroContact.length > 0 && (
        <Card className="p-5 card-shadow border-destructive/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-semibold">Zero-Contact Customers ({zeroContact.length})</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">These customers have never been contacted.</p>
          <div className="space-y-2">
            {zeroContact.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.company || '—'} · Tier {c.tier} · {c.lifetime_value ? `₹${Number(c.lifetime_value).toLocaleString('en-IN')}` : 'No value set'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.phone && <a href={`tel:${c.phone}`}><Button size="icon" variant="ghost" className="h-7 w-7"><Phone className="w-3.5 h-3.5" /></Button></a>}
                  {c.phone && <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" className="h-7 w-7"><MessageSquare className="w-3.5 h-3.5" /></Button></a>}
                  <Button size="sm" variant="outline" onClick={() => onLog(c)} className="text-xs">Log</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {trueDormant.length > 0 && (
        <Card className="p-5 card-shadow border-warning/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">Dormant Customers ({trueDormant.length})</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Last contact &gt; 2× their tier frequency.</p>
          <div className="space-y-2">
            {trueDormant.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.company || '—'} · Tier {c.tier} · Last contact: {c.days}d ago (limit: {c.freq}d)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.phone && <a href={`tel:${c.phone}`}><Button size="icon" variant="ghost" className="h-7 w-7"><Phone className="w-3.5 h-3.5" /></Button></a>}
                  <Button size="sm" variant="outline" onClick={() => onLog(c)} className="text-xs">Log</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
