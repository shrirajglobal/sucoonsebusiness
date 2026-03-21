import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useTeamMembers, useCreateTask } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import SearchableSelect, { type SearchableOption } from '@/components/shared/SearchableSelect';
import VoiceNoteRecorder from '@/components/shared/VoiceNoteRecorder';
import VoiceNotePlayer from '@/components/shared/VoiceNotePlayer';
import EmptyState from '@/components/shared/EmptyState';
import { Plus, Lightbulb, Search, Loader2, ArrowRightCircle, Send, Trash2, MessageSquare, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Hooks
function useIdeas(businessId?: string) {
  return useQuery({
    queryKey: ['ideas', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ideas' as any).select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!businessId,
  });
}

function useIdeaMembers(ideaId?: string) {
  return useQuery({
    queryKey: ['idea_members', ideaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('idea_members' as any).select('*').eq('idea_id', ideaId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ideaId,
  });
}

function useIdeaComments(ideaId?: string) {
  return useQuery({
    queryKey: ['idea_comments', ideaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('idea_comments' as any).select('*').eq('idea_id', ideaId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ideaId,
  });
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-info/10 text-info',
  in_progress: 'bg-warning/10 text-warning',
  converted: 'bg-success/10 text-success',
  archived: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-muted text-muted-foreground',
};

export default function IdeaBoard() {
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: ideas = [], isLoading } = useIdeas(businessId!);
  const createTask = useCreateTask();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('medium');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [taggedMembers, setTaggedMembers] = useState<string[]>([]);

  const teamOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [];
    if (user?.id) opts.push({ value: user.id, label: business?.owner_name || 'Me (Owner)', hint: 'Owner' });
    teamMembers.filter(m => m.user_id).forEach(m => opts.push({ value: m.user_id!, label: m.name, hint: m.department || undefined }));
    return opts;
  }, [user, business, teamMembers]);

  const filtered = useMemo(() => {
    return ideas.filter(i => {
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      return true;
    });
  }, [ideas, search, filterStatus]);

  const handleCreate = async () => {
    if (!title.trim() || !businessId || !user) return;
    try {
      const { data, error } = await supabase.from('ideas' as any).insert({
        business_id: businessId,
        title: title.trim(),
        description: desc.trim() || null,
        priority,
        voice_note_url: voiceUrl || null,
        created_by: user.id,
        created_by_name: business?.owner_name || user.email || '',
      }).select('id').single();
      if (error) throw error;

      // Add tagged members
      if (taggedMembers.length > 0 && data) {
        const members = taggedMembers.map(userId => {
          const member = teamOptions.find(o => o.value === userId);
          return { idea_id: data.id, user_id: userId, user_name: member?.label || '' };
        });
        await supabase.from('idea_members' as any).insert(members);
      }

      qc.invalidateQueries({ queryKey: ['ideas'] });
      setTitle(''); setDesc(''); setPriority('medium'); setVoiceUrl(''); setTaggedMembers([]);
      setOpen(false);
      toast.success('Idea saved!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConvertToTask = async (idea: any) => {
    if (!businessId || !user) return;
    try {
      await createTask.mutateAsync({
        business_id: businessId,
        title: idea.title,
        description: idea.description || '',
        priority: idea.priority === 'high' ? 'high' : idea.priority === 'low' ? 'low' : 'medium',
        status: 'todo',
        created_by: user.id,
      });
      await supabase.from('ideas' as any).update({ status: 'converted' }).eq('id', idea.id);
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Idea converted to task!');
      setDetailId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('ideas' as any).delete().eq('id', id);
      qc.invalidateQueries({ queryKey: ['ideas'] });
      setDetailId(null);
      toast.success('Idea deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedIdea = ideas.find(i => i.id === detailId);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-xl font-semibold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-warning" /> Idea Board</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Idea</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Capture an Idea</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" maxLength={150} placeholder="What's the idea?" /></div>
                <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} className="mt-1" rows={3} placeholder="Add details..." /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Voice Note</Label>
                    <div className="mt-1">
                      <VoiceNoteRecorder onRecorded={setVoiceUrl} existingUrl={voiceUrl || undefined} bucketFolder={user?.id || 'general'} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Tag Team Members</Label>
                  <div className="mt-1 space-y-1">
                    {taggedMembers.map(uid => {
                      const m = teamOptions.find(o => o.value === uid);
                      return (
                        <Badge key={uid} variant="secondary" className="mr-1 gap-1 text-xs">
                          {m?.label}
                          <button onClick={() => setTaggedMembers(prev => prev.filter(id => id !== uid))} className="ml-0.5 hover:text-destructive">×</button>
                        </Badge>
                      );
                    })}
                    <SearchableSelect
                      options={teamOptions.filter(o => !taggedMembers.includes(o.value))}
                      value=""
                      onValueChange={v => { if (v && !taggedMembers.includes(v)) setTaggedMembers(prev => [...prev, v]); }}
                      placeholder="Add member..."
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!title.trim()}>Save Idea</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..." className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {ideas.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No ideas yet" description="Capture your first idea — quick thoughts, business plans, or team brainstorms." actionLabel="New Idea" onAction={() => setOpen(true)} />
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No ideas match your filters.</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(idea => (
              <Card key={idea.id} className="p-4 card-shadow hover:card-shadow-hover cursor-pointer transition-shadow" onClick={() => setDetailId(idea.id)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium line-clamp-2">{idea.title}</h3>
                  <Badge className={`text-[10px] shrink-0 ${PRIORITY_COLORS[idea.priority] || ''}`}>{idea.priority}</Badge>
                </div>
                {idea.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{idea.description}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[idea.status] || ''}`}>{idea.status.replace('_', ' ')}</Badge>
                  {idea.voice_note_url && <VoiceNotePlayer url={idea.voice_note_url} />}
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Sheet */}
        <Sheet open={!!detailId} onOpenChange={o => { if (!o) setDetailId(null); }}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {selectedIdea && (
              <div className="space-y-4">
                <SheetHeader>
                  <SheetTitle className="text-left">{selectedIdea.title}</SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_COLORS[selectedIdea.status] || ''}>{selectedIdea.status.replace('_', ' ')}</Badge>
                  <Badge className={PRIORITY_COLORS[selectedIdea.priority] || ''}>{selectedIdea.priority}</Badge>
                  <span className="text-xs text-muted-foreground">by {selectedIdea.created_by_name}</span>
                </div>
                {selectedIdea.description && <p className="text-sm text-muted-foreground">{selectedIdea.description}</p>}
                {selectedIdea.voice_note_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Voice note:</span>
                    <VoiceNotePlayer url={selectedIdea.voice_note_url} />
                  </div>
                )}

                {/* Tagged Members */}
                <IdeaMembersSection ideaId={selectedIdea.id} />

                {/* Comments */}
                <IdeaCommentsSection ideaId={selectedIdea.id} />

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  {selectedIdea.status !== 'converted' && (
                    <Button size="sm" className="gap-1 flex-1" onClick={() => handleConvertToTask(selectedIdea)}>
                      <ArrowRightCircle className="w-3.5 h-3.5" /> Convert to Task
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(selectedIdea.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

function IdeaMembersSection({ ideaId }: { ideaId: string }) {
  const { data: members = [], isLoading } = useIdeaMembers(ideaId);
  if (isLoading) return null;
  if (members.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tagged Members</p>
      <div className="flex flex-wrap gap-1">
        {members.map((m: any) => (
          <Badge key={m.id} variant="secondary" className="text-xs">{m.user_name}</Badge>
        ))}
      </div>
    </div>
  );
}

function IdeaCommentsSection({ ideaId }: { ideaId: string }) {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: comments = [], isLoading } = useIdeaComments(ideaId);
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');

  const handleAdd = async () => {
    if ((!text.trim() && !voiceUrl) || !user) return;
    try {
      await supabase.from('idea_comments' as any).insert({
        idea_id: ideaId,
        content: text.trim() || '🎤 Voice note',
        voice_note_url: voiceUrl || null,
        created_by: user.id,
        user_name: business?.owner_name || user.email || '',
      });
      qc.invalidateQueries({ queryKey: ['idea_comments', ideaId] });
      setText('');
      setVoiceUrl('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        <MessageSquare className="w-3 h-3 inline mr-1" />
        Discussion ({comments.length})
      </p>
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto mb-2">
          {comments.map((c: any) => (
            <div key={c.id} className="p-2 rounded-md bg-muted/50 text-xs">
              <p>{c.content}</p>
              {c.voice_note_url && <VoiceNotePlayer url={c.voice_note_url} />}
              <p className="text-muted-foreground mt-0.5">{c.user_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 items-center">
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." className="text-xs h-8" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <VoiceNoteRecorder onRecorded={setVoiceUrl} existingUrl={voiceUrl || undefined} bucketFolder={user?.id || 'general'} />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleAdd} disabled={!text.trim() && !voiceUrl}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
