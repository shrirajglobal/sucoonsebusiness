import { AlertTriangle, CalendarClock, CalendarDays } from 'lucide-react';

interface MyDaySummaryProps {
  overdue: number;
  today: number;
  upcoming: number;
  activeFilter: string | null;
  onFilter: (filter: string | null) => void;
}

export default function MyDaySummary({ overdue, today, upcoming, activeFilter, onFilter }: MyDaySummaryProps) {
  const cards = [
    { key: 'overdue', label: 'Overdue', count: overdue, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', activeBg: 'bg-destructive/20 border-destructive/40' },
    { key: 'today', label: 'Due Today', count: today, icon: CalendarClock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', activeBg: 'bg-warning/20 border-warning/40' },
    { key: 'upcoming', label: 'Next 3 Days', count: upcoming, icon: CalendarDays, color: 'text-info', bg: 'bg-info/10 border-info/20', activeBg: 'bg-info/20 border-info/40' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c) => {
        const isActive = activeFilter === c.key;
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            onClick={() => onFilter(isActive ? null : c.key)}
            className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border transition-all text-left ${isActive ? c.activeBg : c.bg} hover:scale-[1.02]`}
          >
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.color} shrink-0`} />
            <div className="min-w-0">
              <p className={`text-lg sm:text-xl font-bold ${c.color} leading-none`}>{c.count}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{c.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
