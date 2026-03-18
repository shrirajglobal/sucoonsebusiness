import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useAttendance, useCreateAttendance, useUpdateAttendance, useTeamMembers } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, LogIn, LogOut, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AttendanceStatus = Database['public']['Enums']['attendance_status'];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', half_day: 'Half Day', leave: 'Leave', wfh: 'WFH', on_duty: 'On Duty', late: 'Late',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-success text-success-foreground', absent: 'bg-destructive text-destructive-foreground',
  half_day: 'bg-warning text-warning-foreground', leave: 'bg-muted text-muted-foreground',
  wfh: 'bg-info text-info-foreground', on_duty: 'bg-primary text-primary-foreground', late: 'bg-warning text-warning-foreground',
};

export default function Attendance() {
  const { user, businessId, profile } = useAuth();
  const { data: business } = useBusiness();
  const today = new Date().toISOString().split('T')[0];
  const { data: attendanceRecords = [], isLoading } = useAttendance(today);
  const { data: teamMembers = [] } = useTeamMembers();
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();

  const ownerRecord = useMemo(() =>
    attendanceRecords.find((r) => r.user_id === user?.id),
    [attendanceRecords, user]
  );

  const punchIn = async () => {
    if (!user || !businessId) return;
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    try {
      await createAttendance.mutateAsync({
        business_id: businessId, user_id: user.id, user_name: profile?.full_name || 'Owner',
        date: today, status: 'present', punch_in: now,
      });
    } catch (err: any) { toast.error(err.message); }
  };

  const punchOut = async () => {
    if (ownerRecord) {
      const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      try {
        await updateAttendance.mutateAsync({ id: ownerRecord.id, punch_out: now });
      } catch (err: any) { toast.error(err.message); }
    }
  };

  const markTeam = async (memberId: string, memberName: string, status: AttendanceStatus) => {
    if (!businessId) return;
    const existing = attendanceRecords.find((r) => r.user_id === memberId);
    try {
      if (existing) {
        await updateAttendance.mutateAsync({ id: existing.id, status });
      } else {
        await createAttendance.mutateAsync({ business_id: businessId, user_id: memberId, user_name: memberName, date: today, status });
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const presentCount = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'wfh' || r.status === 'late').length;

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        <h1 className="text-xl font-semibold">Attendance</h1>

        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Your Attendance</h2>
          <div className="flex items-center gap-4">
            {!ownerRecord ? (
              <Button onClick={punchIn} className="gap-2" disabled={createAttendance.isPending}>
                {createAttendance.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Punch In
              </Button>
            ) : !ownerRecord.punch_out ? (
              <div className="flex items-center gap-4">
                <p className="text-sm">Punched in at <span className="font-mono font-medium">{ownerRecord.punch_in}</span></p>
                <Button onClick={punchOut} variant="outline" className="gap-2" disabled={updateAttendance.isPending}>
                  <LogOut className="w-4 h-4" /> Punch Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Badge className={STATUS_COLORS.present}>Present</Badge>
                <span className="font-mono text-muted-foreground">{ownerRecord.punch_in} — {ownerRecord.punch_out}</span>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{attendanceRecords.filter((r) => r.status === 'absent').length}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </Card>
          <Card className="p-4 card-shadow text-center">
            <p className="text-2xl font-semibold tabular-nums">{attendanceRecords.filter((r) => r.status === 'leave').length}</p>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </Card>
        </div>

        {teamMembers.length > 0 && (
          <Card className="p-5 card-shadow">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Team Attendance</h2>
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const record = attendanceRecords.find((r) => r.user_id === (member.user_id || member.id));
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.department || 'Team Member'}</p>
                    </div>
                    <Select value={record?.status || ''} onValueChange={(v) => markTeam(member.user_id || member.id, member.name, v as AttendanceStatus)}>
                      <SelectTrigger className="w-[130px]"><SelectValue placeholder="Mark" /></SelectTrigger>
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
