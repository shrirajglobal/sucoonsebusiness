import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  customers: any[];
  tierSettings: any;
}

export default function CoverageHeatmap({ customers, tierSettings }: Props) {
  const weeks = useMemo(() => {
    const now = Date.now();
    const result: { label: string; tiers: Record<string, { contacted: number; total: number }> }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = now - w * 7 * 86400000;
      const weekStart = weekEnd - 7 * 86400000;
      const tiers: Record<string, { contacted: number; total: number }> = { A: { contacted: 0, total: 0 }, B: { contacted: 0, total: 0 }, C: { contacted: 0, total: 0 } };
      customers.forEach((c) => {
        const t = c.tier || 'B';
        if (!tiers[t]) return;
        tiers[t].total++;
        if (c.last_contact_date) {
          const ct = new Date(c.last_contact_date).getTime();
          if (ct >= weekStart && ct < weekEnd) tiers[t].contacted++;
        }
      });
      result.push({ label: w === 0 ? 'This Week' : `${w}w ago`, tiers });
    }
    return result;
  }, [customers]);

  const getColor = (pct: number) => {
    if (pct === 0) return 'bg-muted';
    if (pct < 25) return 'bg-destructive/30';
    if (pct < 50) return 'bg-warning/40';
    if (pct < 75) return 'bg-success/40';
    return 'bg-success/70';
  };

  return (
    <Card className="p-5 card-shadow">
      <h3 className="text-sm font-semibold mb-4">Coverage Heatmap (Last 4 Weeks)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Tier</th>
              {weeks.map((w) => (
                <th key={w.label} className="text-center py-2 px-2 text-muted-foreground font-medium">{w.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {['A', 'B', 'C'].map((tier) => (
              <tr key={tier}>
                <td className="py-2 px-2 font-medium">Tier {tier}</td>
                {weeks.map((w) => {
                  const d = w.tiers[tier];
                  const pct = d.total > 0 ? Math.round((d.contacted / d.total) * 100) : 0;
                  return (
                    <td key={w.label} className="py-2 px-2 text-center">
                      <div className={`rounded-md px-2 py-1.5 ${getColor(pct)} inline-block min-w-[48px]`}>
                        <span className="font-semibold tabular-nums">{d.contacted}</span>
                        <span className="text-muted-foreground">/{d.total}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/70" /> 75%+</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/40" /> 50-74%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/40" /> 25-49%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30" /> 1-24%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> 0%</span>
      </div>
    </Card>
  );
}
