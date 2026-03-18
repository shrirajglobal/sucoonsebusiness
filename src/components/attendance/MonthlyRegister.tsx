import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyAttendance } from '@/hooks/useAttendanceData';
import { useTeamMembers } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_SHORT: Record<string, string> = {
  present: 'P', absent: 'A', half_day: 'H', leave: 'L', wfh: 'W', on_duty: 'D', late: 'Lt',
};

const STATUS_CELL_COLORS: Record<string, string> = {
  present: 'bg-success/20 text-success-foreground',
  absent: 'bg-destructive/20 text-destructive-foreground',
  half_day: 'bg-warning/20 text-warning-foreground',
  leave: 'bg-muted text-muted-foreground',
  wfh: 'bg-info/20 text-info-foreground',
  on_duty: 'bg-primary/20 text-primary-foreground',
  late: 'bg-warning/20 text-warning-foreground',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlyRegister() {
  const { user, profile } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: records = [], isLoading } = useMonthlyAttendance(year, month);
  const { data: teamMembers = [] } = useTeamMembers();

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const allMembers = useMemo(() => {
    const members = [{ id: user?.id || '', name: profile?.full_name || 'Owner' }];
    teamMembers.forEach(m => members.push({ id: m.user_id || m.id, name: m.name }));
    return members;
  }, [user, profile, teamMembers]);

  const getStatus = (userId: string, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = records.find(r => r.user_id === userId && r.date === dateStr);
    return record?.status || null;
  };

  const getSummary = (userId: string) => {
    const userRecords = records.filter(r => r.user_id === userId);
    const present = userRecords.filter(r => r.status === 'present' || r.status === 'wfh' || r.status === 'late' || r.status === 'on_duty').length;
    const absent = userRecords.filter(r => r.status === 'absent').length;
    const leaves = userRecords.filter(r => r.status === 'leave' || r.status === 'half_day').length;
    return { present, absent, leaves, total: userRecords.length };
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm font-semibold">{MONTHS[month - 1]} {year}</span>
        <Button size="icon" variant="ghost" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      {/* Summary cards */}
      <div className="space-y-2">
        {allMembers.map(member => {
          const summary = getSummary(member.id);
          return (
            <Card key={member.id} className="p-3 card-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{member.name}</p>
                <div className="flex gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-success/20">P:{summary.present}</span>
                  <span className="px-1.5 py-0.5 rounded bg-destructive/20">A:{summary.absent}</span>
                  <span className="px-1.5 py-0.5 rounded bg-warning/20">L:{summary.leaves}</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-1">
                {days.map(day => {
                  const status = getStatus(member.id, day);
                  const isWeekend = [0, 6].includes(new Date(year, month - 1, day).getDay());
                  return (
                    <div
                      key={day}
                      className={`text-center text-[10px] py-1 rounded ${
                        status ? STATUS_CELL_COLORS[status] || 'bg-muted' : isWeekend ? 'bg-muted/50 text-muted-foreground' : 'bg-background border border-border'
                      }`}
                      title={`${day} - ${status || (isWeekend ? 'Weekend' : 'No record')}`}
                    >
                      <div className="font-medium">{day}</div>
                      {status && <div className="font-bold">{STATUS_SHORT[status] || '?'}</div>}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {Object.entries(STATUS_SHORT).map(([k, v]) => (
          <span key={k} className={`px-1.5 py-0.5 rounded ${STATUS_CELL_COLORS[k]}`}>{v} = {k.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  );
}
