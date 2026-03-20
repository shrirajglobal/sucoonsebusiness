import { useParams, useNavigate } from 'react-router-dom';
import { useLead, useUpdateLead, useTasks, useBusiness, useTeamMembers } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Phone, Mail, Loader2, Trophy, XCircle, Clock, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/utils';
import LeadNotes from '@/components/crm/LeadNotes';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const { data: business } = useBusiness();
  const { data: tasks = [] } = useTasks();
  const { data: teamMembers = [] } = useTeamMembers();
  const updateLead = useUpdateLead();
  const stages = business?.pipeline_stages || [];

  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const linkedTasks = useMemo(() => tasks.filter((t) => t.linked_lead_id === id), [tasks, id]);

  const today = new Date().toISOString().split('T')[0];

  const handleStageChange = async (newStage: string) => {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, stage: newStage });
      toast.success(`Stage updated to ${newStage}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleMarkWon = async () => {
    if (!lead) return;
    const wonStage = stages.find((s) => s.toLowerCase().includes('won')) || stages[stages.length - 1] || 'Won';
    try {
      await updateLead.mutateAsync({ id: lead.id, stage: wonStage });
      toast.success('Lead marked as Won! 🎉');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleMarkLost = async () => {
    if (!lead) return;
    const lostStage = stages.find((s) => s.toLowerCase().includes('lost')) || 'Lost';
    try {
      await updateLead.mutateAsync({ id: lead.id, stage: lostStage, lost_reason: lostReason || null });
      toast.success('Lead marked as Lost');
      setLostDialogOpen(false);
      setLostReason('');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleFollowUpChange = async (date: string) => {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, next_follow_up: date || null } as any);
      toast.success('Follow-up date updated');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!lead) {
    return <AppLayout><div className="text-center py-20"><p className="text-muted-foreground">Lead not found</p><Button variant="outline" onClick={() => navigate('/crm')} className="mt-4">Back to CRM</Button></div></AppLayout>;
  }

  const isWon = lead.stage?.toLowerCase().includes('won');
  const isLost = lead.stage?.toLowerCase().includes('lost');
  const followUp = (lead as any).next_follow_up;
  const isOverdue = followUp && followUp < today && !isWon && !isLost;

  // Assigned team member name
  const assignedName = lead.assigned_to
    ? teamMembers.find((m) => m.user_id === lead.assigned_to || m.id === lead.assigned_to)?.name || null
    : null;

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="gap-1 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to CRM
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">{[lead.company, lead.city].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex gap-2">
            {!isWon && !isLost && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-success border-success/30" onClick={handleMarkWon}>
                  <Trophy className="w-4 h-4" /> Won
                </Button>
                <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30">
                      <XCircle className="w-4 h-4" /> Lost
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Mark as Lost</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Reason for loss</Label><Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Price too high, went with competitor, etc." className="mt-1" rows={3} /></div>
                      <Button onClick={handleMarkLost} variant="destructive" className="w-full">Confirm Lost</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {isWon && <Badge className="bg-success text-success-foreground">Won ✓</Badge>}
            {isLost && <Badge variant="destructive">Lost</Badge>}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          {lead.phone && <a href={`tel:${lead.phone}`}><Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> Call</Button></a>}
          {lead.phone && (() => { const cleaned = lead.phone!.replace(/\D/g, ''); const num = cleaned.startsWith('91') ? cleaned : '91' + cleaned; return <a href={`https://wa.me/${num}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">💬 WhatsApp</Button></a>; })()}
          {lead.email && <a href={`mailto:${encodeURIComponent(lead.email)}`}><Button size="sm" variant="outline"><Mail className="w-4 h-4 mr-1" /> Email</Button></a>}
        </div>

        {/* Follow-up alert */}
        {followUp && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            <Clock className="w-4 h-4" />
            <span className="font-medium">Follow-up: {formatDisplayDate(followUp, business?.date_format)}</span>
            {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
          </div>
        )}

        {/* Details grid */}
        <Card className="p-4 card-shadow">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-muted-foreground text-xs">Value</p><p className="font-medium tabular-nums">{lead.value ? `${business?.currency || '₹'}${Number(lead.value).toLocaleString('en-IN')}` : '—'}</p></div>
            <div><p className="text-muted-foreground text-xs">Source</p><p className="font-medium">{lead.source || '—'}</p></div>
            <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium font-mono text-xs">{lead.phone || '—'}</p></div>
            <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium text-xs truncate">{lead.email || '—'}</p></div>
            <div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium">{assignedName || '—'}</p></div>
            <div><p className="text-muted-foreground text-xs">Created</p><p className="font-medium">{lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy') : '—'}</p></div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Stage</p>
              <Select value={lead.stage} onValueChange={handleStageChange}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Next Follow-up</p>
              <Input type="date" defaultValue={followUp || ''} onChange={(e) => handleFollowUpChange(e.target.value)} className="h-8" />
            </div>
            {(lead as any).product_interest && (
              <div><p className="text-muted-foreground text-xs">Product Interest</p><p className="font-medium">{(lead as any).product_interest}</p></div>
            )}
          </div>

          {/* Tags */}
          {(lead as any).tags?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</p>
              <div className="flex gap-1.5 flex-wrap">
                {(lead as any).tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {lead.notes && <div className="mt-3 pt-3 border-t"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{lead.notes}</p></div>}
          {(lead as any).lost_reason && <div className="mt-3 p-2 rounded bg-destructive/10 text-sm"><span className="font-medium text-destructive">Lost reason:</span> {(lead as any).lost_reason}</div>}
        </Card>

        {/* Lead Activity Notes */}
        <Card className="p-4 card-shadow">
          <LeadNotes leadId={lead.id} />
        </Card>

        {/* Linked tasks */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Linked Tasks ({linkedTasks.length})</h2>
          {linkedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks linked to this lead.</p>
          ) : (
            <div className="space-y-1">
              {linkedTasks.map((t) => (
                <Card key={t.id} className="p-2 px-3 card-shadow text-sm flex items-center justify-between">
                  <span>{t.title}</span>
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Timeline</h2>
          <Card className="p-4 card-shadow">
            <div className="space-y-3">
              <div className="flex gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="font-medium">Lead created</p>
                  <p className="text-xs text-muted-foreground">{lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy, hh:mm a') : ''}</p>
                </div>
              </div>
              {lead.updated_at && lead.updated_at !== lead.created_at && (
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-info mt-2 shrink-0" />
                  <div>
                    <p className="font-medium">Last updated</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(lead.updated_at), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
