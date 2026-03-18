import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AttendanceStatus } from '@/types';
import { Clock, LogIn, LogOut, Users } from 'lucide-react';

function generateId() { return Math.random().toString(36).substring(2, 10); }

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', half_day: 'Half Day', leave: 'Leave', wfh: 'WFH', on_duty: 'On Duty', late: 'Late',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-success text-success-foreground', absent: 'bg-destructive text-destructive-foreground',
  half_day: 'bg-warning text-warning-foreground', leave: 'bg-muted text-muted-foreground',
  wfh: 'bg-info text-info-foreground', on_duty: 'bg-primary text-primary-foreground', late: 'bg-warning text-warning-foreground',
};

export default function Attendance() {
  const { business, teamMembers, attendanceRecords, addAttendance, updateAttendance } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const ownerRecord = useMemo(() =>
    attendanceRecords.find((r) => r.userId === 'owner' && r.date === today),
    [attendanceRecords, today]
  );

  const punchIn = () => {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    addAttendance({
      id: generateId(), userId: 'owner', userName: business?.ownerName || 'Owner',
      date: today, status: 'present', punchIn: now,
    });
  };

  const punchOut = () => {
    if (ownerRecord) {
      const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      updateAttendance(ownerRecord.id, { punchOut: now });
    }
  };

  const markTeam = (memberId: string, memberName: string, status: AttendanceStatus) => {
    const existing = attendanceRecords.find((r) => r.userId === memberId && r.date === today);
    if (existing) {
      updateAttendance(existing.id, { status });
    } else {
      addAttendance({ id: generateId(), userId: memberId, userName: memberName, date: today, status });
    }
  };

  const todayRecords = attendanceRecords.filter((r) => r.date === today);
  const presentCount = todayRecords.filter((r) => r.status === 'present' || r.status === 'wfh' || r.status === 'late').length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        <h1 className="text-xl font-semibold">Attendance</h1>

        {/* Owner Punch In/Out */}
        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Your Attendance</h2>
          <div className="flex items-center gap-4">
            {!ownerRecord ? (
              <Button onClick={punchIn} className="gap-2"><LogIn className="w-4 h-4" /> Punch In</Button>
            ) : !ownerRecord.punchOut ? (
              <div className="flex items-center gap-4">
                <p className="text-sm">Punched in at <span className="font-mono font-medium">{ownerRecord.punchIn}</span></p>
                <Button onClick={punchOut} variant="outline" className="gap-2"><LogOut className="w-4 h-4" /> Punch Out</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Badge className={STATUS_COLORS.present}>Present</Badge>
                <span className="font-mono text-muted-foreground">{ownerRecord.punchIn} — {ownerRecord.punchOut}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Today's Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{todayRecords.filter((r) => r.status === 'absent').length}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{todayRecords.filter((r) => r.status === 'leave').length}</p>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </Card>
        </div>

        {/* Team Attendance */}
        {teamMembers.length > 0 && (
          <Card className="p-5 card-shadow">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Team Attendance</h2>
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const record = attendanceRecords.find((r) => r.userId === member.id && r.date === today);
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</p>
                    </div>
                    <Select value={record?.status || ''} onValueChange={(v) => markTeam(member.id, member.name, v as AttendanceStatus)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Mark" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {teamMembers.length === 0 && (
          <Card className="p-8 text-center card-shadow">
            <p className="text-sm text-muted-foreground">Add team members in Settings to mark their attendance.</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
