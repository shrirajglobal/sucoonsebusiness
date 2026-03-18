import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useComplianceEvents, useCreateComplianceEvent, useUpdateComplianceEvent, useDeleteComplianceEvent } from '@/hooks/usePhase4Data';
import { Plus, Trash2, Loader2, CalendarCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, addDays, isBefore } from 'date-fns';

const TYPES = ['gst', 'tds', 'pf_esic', 'income_tax', 'roc', 'other'];
const STATUSES = ['pending', 'completed', 'overdue'];
const TYPE_LABELS: Record<string, string> = { gst: 'GST', tds: 'TDS', pf_esic: 'PF/ESIC', income_tax: 'Income Tax', roc: 'ROC Filing', other: 'Other' };
const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { pending: 'secondary', completed: 'default', overdue: 'destructive' };

// Common Indian compliance dates
const COMMON_EVENTS = [
  { title: 'GSTR-3B Filing', type: 'gst', dayOfMonth: 20 },
  { title: 'GSTR-1 Filing', type: 'gst', dayOfMonth: 11 },
  { title: 'TDS Payment', type: 'tds', dayOfMonth: 7 },
  { title: 'PF/ESIC Deposit', type: 'pf_esic', dayOfMonth: 15 },
];

export default function Compliance() {
  const { businessId } = useAuth();
  const { data: events, isLoading } = useComplianceEvents();
  const createEvent = useCreateComplianceEvent();
  const updateEvent = useUpdateComplianceEvent();
  const deleteEvent = useDeleteComplianceEvent();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'gst', due_date: '', notes: '' });

  // Auto-mark overdue
  const enriched = (events || []).map(e => ({
    ...e,
    displayStatus: e.status === 'completed' ? 'completed' : (isPast(new Date(e.due_date)) && !isToday(new Date(e.due_date)) ? 'overdue' : 'pending'),
  }));
  const upcoming = enriched.filter(e => e.displayStatus === 'pending').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const overdue = enriched.filter(e => e.displayStatus === 'overdue');
  const completed = enriched.filter(e => e.displayStatus === 'completed');
  const dueSoon = upcoming.filter(e => isBefore(new Date(e.due_date), addDays(new Date(), 7)));

  const handleSubmit = async () => {
    if (!form.title || !form.due_date) { toast.error('Title and date required'); return; }
    await createEvent.mutateAsync({ business_id: businessId!, title: form.title, type: form.type, due_date: form.due_date, notes: form.notes || null });
    toast.success('Event added'); setOpen(false); setForm({ title: '', type: 'gst', due_date: '', notes: '' });
  };

  const autoGenerate = async () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    for (const ce of COMMON_EVENTS) {
      const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), ce.dayOfMonth);
      await createEvent.mutateAsync({ business_id: businessId!, title: ce.title, type: ce.type, due_date: format(dueDate, 'yyyy-MM-dd') });
    }
    toast.success('Generated next month compliance events');
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Compliance Calendar</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={autoGenerate} disabled={createEvent.isPending}>Auto-Generate Next Month</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Event</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Compliance Event</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. GSTR-3B Filing" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Due Date *</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                  </div>
                  <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handleSubmit} disabled={createEvent.isPending}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total Events</div><p className="text-xl font-bold mt-1">{enriched.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-500" />Overdue</div><p className="text-xl font-bold mt-1 text-red-600">{overdue.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Due This Week</div><p className="text-xl font-bold mt-1 text-orange-600">{dueSoon.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" />Completed</div><p className="text-xl font-bold mt-1 text-green-600">{completed.length}</p></CardContent></Card>
        </div>

        {overdue.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Overdue Items</CardTitle></CardHeader>
            <CardContent><div className="space-y-2">
              {overdue.map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <div><span className="text-sm font-medium">{e.title}</span><span className="text-xs text-red-500 ml-2">Due {format(new Date(e.due_date), 'dd MMM yyyy')}</span></div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { updateEvent.mutate({ id: e.id, status: 'completed' }); toast.success('Marked complete'); }}>Mark Done</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { deleteEvent.mutate(e.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {upcoming.map(e => (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(e.due_date), 'dd MMM yyyy')} · <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[e.type] || e.type}</Badge></p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { updateEvent.mutate({ id: e.id, status: 'completed' }); toast.success('Done'); }}>Done</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { deleteEvent.mutate(e.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
              {!upcoming.length && <p className="text-sm text-muted-foreground text-center py-8">No upcoming events</p>}
            </div>
          </CardContent>
        </Card>

        {completed.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base text-muted-foreground">Completed</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {completed.slice(0, 20).map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 opacity-60">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm line-through">{e.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[e.type] || e.type}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEvent.mutate(e.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
