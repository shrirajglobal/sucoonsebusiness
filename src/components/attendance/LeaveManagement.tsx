import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveTypes, useCreateLeaveType, useDeleteLeaveType, useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest } from '@/hooks/useAttendanceData';
import { useTeamMembers } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Check, X, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

export default function LeaveManagement() {
  const { user, businessId, profile } = useAuth();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: leaveRequests = [] } = useLeaveRequests();
  const { data: teamMembers = [] } = useTeamMembers();
  const createLeaveType = useCreateLeaveType();
  const deleteLeaveType = useDeleteLeaveType();
  const createLeaveRequest = useCreateLeaveRequest();
  const updateLeaveRequest = useUpdateLeaveRequest();

  const [typeOpen, setTypeOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeDays, setTypeDays] = useState('12');
  const [typeIsPaid, setTypeIsPaid] = useState(true);

  const [reqLeaveType, setReqLeaveType] = useState('');
  const [reqStartDate, setReqStartDate] = useState('');
  const [reqEndDate, setReqEndDate] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqFor, setReqFor] = useState('self');

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(1, diff + 1);
  };

  const handleCreateType = async () => {
    if (!typeName.trim() || !businessId) return;
    try {
      await createLeaveType.mutateAsync({ business_id: businessId, name: typeName, days_per_year: Number(typeDays) || 12, is_paid: typeIsPaid });
      setTypeName(''); setTypeDays('12'); setTypeIsPaid(true); setTypeOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateRequest = async () => {
    if (!reqLeaveType || !reqStartDate || !reqEndDate || !businessId || !user) return;
    const lt = leaveTypes.find(t => t.id === reqLeaveType);
    const isForSelf = reqFor === 'self';
    const member = !isForSelf ? teamMembers.find(m => m.id === reqFor) : null;
    try {
      await createLeaveRequest.mutateAsync({
        business_id: businessId,
        user_id: isForSelf ? user.id : (member?.user_id || member?.id || user.id),
        user_name: isForSelf ? (profile?.full_name || 'Owner') : (member?.name || ''),
        leave_type_id: reqLeaveType,
        leave_type_name: lt?.name || '',
        start_date: reqStartDate,
        end_date: reqEndDate,
        days: calculateDays(reqStartDate, reqEndDate),
        reason: reqReason || undefined,
      });
      setReqLeaveType(''); setReqStartDate(''); setReqEndDate(''); setReqReason(''); setReqFor('self'); setRequestOpen(false);
      toast.success('Leave request created');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      await updateLeaveRequest.mutateAsync({ id, status, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
      toast.success(`Leave ${status}`);
    } catch (err: any) { toast.error(err.message); }
  };

  // Calculate balances
  const getBalance = (userId: string, leaveTypeId: string) => {
    const lt = leaveTypes.find(t => t.id === leaveTypeId);
    if (!lt) return { total: 0, used: 0, remaining: 0 };
    const currentYear = new Date().getFullYear();
    const used = leaveRequests
      .filter(r => r.user_id === userId && r.leave_type_id === leaveTypeId && r.status === 'approved' && new Date(r.start_date).getFullYear() === currentYear)
      .reduce((sum, r) => sum + Number(r.days), 0);
    return { total: lt.days_per_year, used, remaining: lt.days_per_year - used };
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="requests">
        <TabsList className="w-full">
          <TabsTrigger value="requests" className="flex-1">Requests</TabsTrigger>
          <TabsTrigger value="balances" className="flex-1">Balances</TabsTrigger>
          <TabsTrigger value="types" className="flex-1">Leave Types</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3 mt-3">
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-1"><Plus className="w-3 h-3" /> Apply Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Apply For</Label>
                  <Select value={reqFor} onValueChange={setReqFor}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leave Type *</Label>
                  <Select value={reqLeaveType} onValueChange={setReqLeaveType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Start Date *</Label><Input type="date" value={reqStartDate} onChange={e => setReqStartDate(e.target.value)} className="mt-1" /></div>
                  <div><Label>End Date *</Label><Input type="date" value={reqEndDate} onChange={e => setReqEndDate(e.target.value)} className="mt-1" /></div>
                </div>
                {reqStartDate && reqEndDate && <p className="text-xs text-muted-foreground">{calculateDays(reqStartDate, reqEndDate)} day(s)</p>}
                <div><Label>Reason</Label><Input value={reqReason} onChange={e => setReqReason(e.target.value)} className="mt-1" placeholder="Optional" /></div>
                <Button onClick={handleCreateRequest} className="w-full" disabled={!reqLeaveType || !reqStartDate || !reqEndDate || createLeaveRequest.isPending}>
                  {createLeaveRequest.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {leaveRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No leave requests yet.</p>
          ) : leaveRequests.map(req => (
            <Card key={req.id} className="p-3 card-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{req.user_name}</p>
                  <p className="text-xs text-muted-foreground">{req.leave_type_name} · {Number(req.days)} day(s)</p>
                  <p className="text-xs text-muted-foreground">{req.start_date} → {req.end_date}</p>
                  {req.reason && <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={STATUS_COLORS[req.status] || 'bg-muted'}>{req.status}</Badge>
                  {req.status === 'pending' && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => handleReview(req.id, 'approved')}><Check className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleReview(req.id, 'rejected')}><X className="w-4 h-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="balances" className="space-y-3 mt-3">
          {leaveTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Add leave types first in the Types tab.</p>
          ) : (
            <div className="space-y-3">
              <Card className="p-3 card-shadow">
                <p className="text-sm font-semibold mb-2">{profile?.full_name || 'Owner'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {leaveTypes.map(lt => {
                    const b = getBalance(user?.id || '', lt.id);
                    return (
                      <div key={lt.id} className="text-center p-2 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground">{lt.name}</p>
                        <p className="text-lg font-semibold tabular-nums">{b.remaining}</p>
                        <p className="text-[10px] text-muted-foreground">{b.used}/{b.total} used</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
              {teamMembers.map(member => (
                <Card key={member.id} className="p-3 card-shadow">
                  <p className="text-sm font-semibold mb-2">{member.name}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {leaveTypes.map(lt => {
                      const b = getBalance(member.user_id || member.id, lt.id);
                      return (
                        <div key={lt.id} className="text-center p-2 rounded-lg bg-accent/50">
                          <p className="text-xs text-muted-foreground">{lt.name}</p>
                          <p className="text-lg font-semibold tabular-nums">{b.remaining}</p>
                          <p className="text-[10px] text-muted-foreground">{b.used}/{b.total} used</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="types" className="space-y-3 mt-3">
          <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full gap-1"><Plus className="w-3 h-3" /> Add Leave Type</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Leave Type</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={typeName} onChange={e => setTypeName(e.target.value)} className="mt-1" placeholder="e.g. Casual Leave" /></div>
                <div><Label>Days per Year</Label><Input type="number" value={typeDays} onChange={e => setTypeDays(e.target.value)} className="mt-1" /></div>
                <div className="flex items-center gap-2"><Switch checked={typeIsPaid} onCheckedChange={setTypeIsPaid} /><Label>Paid Leave</Label></div>
                <Button onClick={handleCreateType} className="w-full" disabled={!typeName.trim() || createLeaveType.isPending}>
                  {createLeaveType.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {leaveTypes.map(lt => (
            <Card key={lt.id} className="p-3 card-shadow flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{lt.name}</p>
                <p className="text-xs text-muted-foreground">{lt.days_per_year} days/yr · {lt.is_paid ? 'Paid' : 'Unpaid'}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteLeaveType.mutate(lt.id)}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </Card>
          ))}
          {leaveTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No leave types. Add Casual, Sick, etc.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
