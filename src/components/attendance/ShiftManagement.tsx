import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShifts, useCreateShift, useDeleteShift } from '@/hooks/useAttendanceData';
import { useTeamMembers } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ShiftManagement() {
  const { businessId } = useAuth();
  const { data: shifts = [] } = useShifts();
  const { data: teamMembers = [] } = useTeamMembers();
  const createShift = useCreateShift();
  const deleteShift = useDeleteShift();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const handleCreate = async () => {
    if (!name.trim() || !businessId) return;
    try {
      await createShift.mutateAsync({ business_id: businessId, name, start_time: startTime, end_time: endTime });
      setName(''); setStartTime('09:00'); setEndTime('18:00'); setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const assignShift = async (memberId: string, shiftId: string | null) => {
    try {
      const { error } = await supabase.from('team_members').update({ shift_id: shiftId } as any).eq('id', memberId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Shift assigned');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="w-full gap-1"><Plus className="w-3 h-3" /> Create Shift</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Shift Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="e.g. Morning Shift" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start Time</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1" /></div>
              <div><Label>End Time</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1" /></div>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!name.trim() || createShift.isPending}>
              {createShift.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {shifts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Defined Shifts</h3>
          {shifts.map(s => (
            <Card key={s.id} className="p-3 card-shadow flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.start_time} – {s.end_time}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteShift.mutate(s.id)}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {teamMembers.length > 0 && shifts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Assign Shifts</h3>
          {teamMembers.map(member => (
            <Card key={member.id} className="p-3 card-shadow flex items-center justify-between">
              <p className="text-sm font-medium">{member.name}</p>
              <Select
                value={(member as any).shift_id || 'none'}
                onValueChange={v => assignShift(member.id, v === 'none' ? null : v)}
              >
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="No shift" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No shift</SelectItem>
                  {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Card>
          ))}
        </div>
      )}

      {shifts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No shifts defined yet. Create one above.</p>
      )}
    </div>
  );
}
