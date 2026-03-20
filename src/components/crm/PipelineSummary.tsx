import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Trophy, XCircle, Clock } from 'lucide-react';

interface PipelineSummaryProps {
  leads: any[];
  stages: string[];
  currency: string;
  activeStageFilter: string | null;
  onStageFilter: (stage: string | null) => void;
  overdueCount: number;
  todayCount: number;
}

export default function PipelineSummary({ leads, stages, currency, activeStageFilter, onStageFilter, overdueCount, todayCount }: PipelineSummaryProps) {
  const totalValue = leads.reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0);
  const wonLeads = leads.filter((l) => l.stage?.toLowerCase().includes('won'));
  const lostLeads = leads.filter((l) => l.stage?.toLowerCase().includes('lost'));
  const activeLeads = leads.filter((l) => !l.stage?.toLowerCase().includes('won') && !l.stage?.toLowerCase().includes('lost'));

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-3 card-shadow text-center">
          <Users className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold tabular-nums">{leads.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Leads</p>
        </Card>
        <Card className="p-3 card-shadow text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-info mb-1" />
          <p className="text-sm sm:text-lg font-bold tabular-nums truncate">{currency}{totalValue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground">Pipeline Value</p>
        </Card>
        <Card className="p-3 card-shadow text-center">
          <Trophy className="w-4 h-4 mx-auto text-success mb-1" />
          <p className="text-lg font-bold tabular-nums">{wonLeads.length}</p>
          <p className="text-[10px] text-muted-foreground">Won</p>
        </Card>
        <Card className="p-3 card-shadow text-center">
          <XCircle className="w-4 h-4 mx-auto text-destructive mb-1" />
          <p className="text-lg font-bold tabular-nums">{lostLeads.length}</p>
          <p className="text-[10px] text-muted-foreground">Lost</p>
        </Card>
      </div>

      {/* Follow-up alerts */}
      {(overdueCount > 0 || todayCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {overdueCount > 0 && (
            <button
              onClick={() => onStageFilter(activeStageFilter === '_overdue' ? null : '_overdue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeStageFilter === '_overdue' ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}
            >
              <Clock className="w-3 h-3" /> {overdueCount} Overdue Follow-ups
            </button>
          )}
          {todayCount > 0 && (
            <button
              onClick={() => onStageFilter(activeStageFilter === '_today' ? null : '_today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeStageFilter === '_today' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
            >
              <Clock className="w-3 h-3" /> {todayCount} Due Today
            </button>
          )}
        </div>
      )}

      {/* Stage pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onStageFilter(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${!activeStageFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
        >
          All ({activeLeads.length})
        </button>
        {stages.map((stg) => {
          const count = leads.filter((l) => l.stage === stg).length;
          return (
            <button
              key={stg}
              onClick={() => onStageFilter(activeStageFilter === stg ? null : stg)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${activeStageFilter === stg ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {stg} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
