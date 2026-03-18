import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityLogs } from '@/hooks/useRBAC';
import { Loader2, Activity } from 'lucide-react';

const ACTION_ICONS: Record<string, string> = {
  created: '➕',
  updated: '✏️',
  deleted: '🗑️',
  imported: '📥',
  exported: '📤',
  logged: '📝',
  approved: '✅',
  rejected: '❌',
};

const ENTITY_COLORS: Record<string, string> = {
  task: 'bg-primary/10 text-primary',
  lead: 'bg-warning/10 text-warning',
  customer: 'bg-success/10 text-success',
  contact: 'bg-accent text-accent-foreground',
  attendance: 'bg-muted text-muted-foreground',
  transaction: 'bg-primary/10 text-primary',
};

export default function ActivityLogList() {
  const { data: logs = [], isLoading } = useActivityLogs(100);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    logs.forEach((log) => {
      const day = log.created_at ? new Date(log.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Unknown';
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return Object.entries(groups);
  }, [logs]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No activity recorded yet. Actions will appear here as your team works.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {grouped.map(([day, dayLogs]) => (
          <div key={day}>
            <p className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-card py-1">{day}</p>
            <div className="space-y-1.5">
              {dayLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <span className="text-sm mt-0.5">{ACTION_ICONS[log.action] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-medium">{log.user_name || 'System'}</span>
                      {' '}{log.action}{' '}
                      <Badge variant="outline" className={`text-[10px] ${ENTITY_COLORS[log.entity_type] || ''}`}>{log.entity_type}</Badge>
                      {log.entity_label && <span className="font-medium"> "{log.entity_label}"</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
