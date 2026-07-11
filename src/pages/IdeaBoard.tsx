import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useTeamMembers } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import SearchableSelect, { type SearchableOption } from '@/components/shared/SearchableSelect';
import VoiceNoteRecorder from '@/components/shared/VoiceNoteRecorder';
import VoiceNotePlayer from '@/components/shared/VoiceNotePlayer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import {
  Plus, Lightbulb, Search, Loader2, ArrowRightCircle, Send, Trash2, MessageSquare,
  Users, Pin, Copy, Edit3, MoreVertical, Sparkles, Flame, TrendingUp, CheckCircle2, Archive,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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

function useAllIdeaMembers(ideaIds: string[]) {
  return useQuery({
    queryKey: ['idea_members_bulk', ideaIds],
    queryFn: async () => {
      if (ideaIds.length === 0) return [];
      const { data, error } = await supabase.from('idea_members' as any).select('*').in('idea_id', ideaIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: ideaIds.length > 0,
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

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-muted-foreground/40',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-muted text-muted-foreground',
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'converted', label: 'Converted' },
  { value: 'archived', label: 'Archived' },
];

const EXAMPLE_PROMPTS = [
  'New product idea',
  'Marketing thought',
  'Team suggestion',
  'Customer feedback',
];

const STALE_DAYS = 14;
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export default function IdeaBoard() {
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: ideas = [], isLoading } = useIdeas(businessId!);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const ideaIds = useMemo(() => ideas.map(i => i.id), [ideas]);
  const { data: allIdeaMembers = [] } = useAllIdeaMembers(ideaIds);

  const membersByIdea = useMemo(() => {
    const map = new Map<string, any[]>();
    allIdeaMembers.forEach(m => {
      const list = map.get(m.idea_id) || [];
      list.push(m);
      map.set(m.idea_id, list);
    });
    return map;
  }, [allIdeaMembers]);

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('medium');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [taggedMembers, setTaggedMembers] = useState<string[]>([]);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickVoiceUrl, setQuickVoiceUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus capture bar on mount (desktop only — avoid keyboard popup on mobile)
    if (!isMobile) quickInputRef.current?.focus();
  }, [isMobile]);

  const teamOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [];
    if (user?.id) opts.push({ value: user.id, label: business?.owner_name || 'Me (Owner)', hint: 'Owner' });
    teamMembers.forEach(m => {
      const id = m.user_id || m.id;
      opts.push({ value: id, label: m.name, hint: m.department || undefined });
    });
    return opts;
  }, [user, business, teamMembers]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { open: 0, in_progress: 0, converted: 0, archived: 0 };
    ideas.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return counts;
  }, [ideas]);

  const insights = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 86400000;
    const capturedThisWeek = ideas.filter(i => now - new Date(i.created_at).getTime() <= weekMs).length;
    const converted = ideas.filter(i => i.status === 'converted').length;
    const total = ideas.length || 1;
    const conversionPct = Math.round((converted / total) * 100);
    const staleOpen = ideas.filter(i => i.status === 'open' && daysSince(i.created_at) > STALE_DAYS).length;
    return { capturedThisWeek, converted, conversionPct, staleOpen };
  }, [ideas]);

  const filtered = useMemo(() => {
    let list = ideas.filter(i => {
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus === 'stale') {
        if (i.status !== 'open' || daysSince(i.created_at) <= STALE_DAYS) return false;
      } else if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      return true;
    });
    list.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [ideas, search, filterStatus]);

  const handleQuickAdd = async (overrideTitle?: string) => {
    const t = (overrideTitle ?? quickAddTitle).trim();
    if ((!t && !quickVoiceUrl) || !businessId || !user) return;
    try {
      await supabase.from('ideas' as any).insert({
        business_id: businessId,
        title: t || '🎤 Voice idea',
        priority: 'medium',
        voice_note_url: quickVoiceUrl || null,
        created_by: user.id,
        created_by_name: business?.owner_name || user.email || '',
      });
      qc.invalidateQueries({ queryKey: ['ideas'] });
      setQuickAddTitle('');
      setQuickVoiceUrl('');
      toast.success('Captured ✓ — added to your board');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !businessId || !user) return;
    try {
      const { data, error } = await (supabase.from('ideas' as any).insert({
        business_id: businessId,
        title: title.trim(),
        description: desc.trim() || null,
        priority,
        voice_note_url: voiceUrl || null,
        created_by: user.id,
        created_by_name: business?.owner_name || user.email || '',
      }) as any).select('id').single();
      if (error) throw error;

      if (taggedMembers.length > 0 && data) {
        const members = taggedMembers.map(userId => {
          const member = teamOptions.find(o => o.value === userId);
          return { idea_id: data.id, user_id: userId, user_name: member?.label || '' };
        });
        await supabase.from('idea_members' as any).insert(members);
      }

      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['idea_members_bulk'] });
      setTitle(''); setDesc(''); setPriority('medium'); setVoiceUrl(''); setTaggedMembers([]);
      setOpen(false);
      toast.success('Idea saved ✓');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConvertToTask = (idea: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.success('Turned into a task ➜');
    navigate('/tasks', { state: { fromIdea: { id: idea.id, title: idea.title, description: idea.description, priority: idea.priority } } });
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

  const handleStatusChange = async (id: string, newStatus: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await supabase.from('ideas' as any).update({ status: newStatus }).eq('id', id);
      qc.invalidateQueries({ queryKey: ['ideas'] });
      toast.success(`Status → ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      await supabase.from('ideas' as any).update({ is_pinned: !currentPinned }).eq('id', id);
      qc.invalidateQueries({ queryKey: ['ideas'] });
      toast.success(currentPinned ? 'Unpinned' : 'Pinned to top 📌');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopyIdea = (idea: any) => {
    const text = `${idea.title}${idea.description ? '\n' + idea.description : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleArchiveOld = async () => {
    const cutoff = Date.now() - 30 * 86400000;
    const targets = ideas.filter(i => i.status === 'open' && new Date(i.created_at).getTime() < cutoff);
    if (targets.length === 0) { toast.info('Nothing older than 30 days'); return; }
    try {
      await supabase.from('ideas' as any).update({ status: 'archived' }).in('id', targets.map(t => t.id));
      qc.invalidateQueries({ queryKey: ['ideas'] });
      toast.success(`Archived ${targets.length} old idea${targets.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startEditing = (idea: any) => {
    setEditTitle(idea.title);
    setEditDesc(idea.description || '');
    setEditPriority(idea.priority);
    setIsEditing(true);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await supabase.from('ideas' as any).update({ title: editTitle.trim(), description: editDesc.trim() || null, priority: editPriority }).eq('id', id);
      qc.invalidateQueries({ queryKey: ['ideas'] });
      setIsEditing(false);
      toast.success('Idea updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedIdea = ideas.find(i => i.id === detailId);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  const newIdeaForm = (
    <div className="space-y-3 pb-32">
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
            placeholder="Search & add member..."
          />
        </div>
      </div>
      <Button onClick={handleCreate} className="w-full" disabled={!title.trim()}>Save Idea</Button>
    </div>
  );

  const showStaleBanner = filterStatus === 'stale' && insights.staleOpen > 0;
  const topStaleIdea = showStaleBanner
    ? ideas.filter(i => i.status === 'open' && daysSince(i.created_at) > STALE_DAYS)
        .sort((a, b) => {
          const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
          return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
        })[0]
    : null;

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-warning" /> Idea Board</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Har bada business ek chhoti idea se shuru hota hai.</p>
          </div>
          {isMobile ? (
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader><DrawerTitle>Capture an Idea</DrawerTitle></DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto">{newIdeaForm}</div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Capture an Idea</DialogTitle></DialogHeader>
                {newIdeaForm}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Hero capture bar */}
        <Card className="p-4 border-2 border-primary/20 bg-gradient-to-br from-warning/5 via-background to-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning shrink-0" />
            <Input
              ref={quickInputRef}
              value={quickAddTitle}
              onChange={e => setQuickAddTitle(e.target.value)}
              placeholder="Kya idea aaya? Type it or tap 🎤 to record…"
              className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base bg-transparent px-1"
              onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            />
            <VoiceNoteRecorder onRecorded={(url) => { setQuickVoiceUrl(url); if (url) toast.success('Voice captured — tap ➜ to save'); }} existingUrl={quickVoiceUrl || undefined} bucketFolder={user?.id || 'general'} />
            <Button size="sm" onClick={() => handleQuickAdd()} disabled={!quickAddTitle.trim() && !quickVoiceUrl} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 pl-7 gap-2 flex-wrap">
            <p className="text-[11px] text-muted-foreground">Sirf title kaafi hai — details baad mein add karo.</p>
            <button onClick={() => setOpen(true)} className="text-[11px] text-primary hover:underline shrink-0">+ Add details</button>
          </div>
        </Card>

        {/* Insight strip */}
        {ideas.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" /> This week
              </div>
              <p className="text-lg font-semibold tabular-nums">{insights.capturedThisWeek}</p>
              <p className="text-[10px] text-muted-foreground">ideas captured</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <CheckCircle2 className="w-3 h-3 text-success" /> Converted
              </div>
              <p className="text-lg font-semibold tabular-nums">{insights.converted} <span className="text-xs text-muted-foreground font-normal">· {insights.conversionPct}%</span></p>
              <p className="text-[10px] text-muted-foreground">into tasks</p>
            </Card>
            <button
              onClick={() => setFilterStatus(insights.staleOpen > 0 ? 'stale' : 'all')}
              className={`text-left ${insights.staleOpen > 0 ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <Card className={`p-3 h-full transition-colors ${insights.staleOpen > 0 ? 'hover:bg-destructive/5 border-destructive/30' : ''}`}>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <Flame className={`w-3 h-3 ${insights.staleOpen > 0 ? 'text-destructive' : ''}`} /> Needs action
                </div>
                <p className={`text-lg font-semibold tabular-nums ${insights.staleOpen > 0 ? 'text-destructive' : ''}`}>{insights.staleOpen}</p>
                <p className="text-[10px] text-muted-foreground">open &gt; {STALE_DAYS} days</p>
              </Card>
            </button>
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setFilterStatus('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'}`}>
            All ({ideas.length})
          </button>
          {insights.staleOpen > 0 && (
            <button onClick={() => setFilterStatus(filterStatus === 'stale' ? 'all' : 'stale')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterStatus === 'stale' ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              <Flame className="w-3 h-3" /> Action needed ({insights.staleOpen})
            </button>
          )}
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === s.value ? 'bg-primary text-primary-foreground' : `${STATUS_COLORS[s.value]} border`}`}>
              {s.label} ({statusCounts[s.value] || 0})
            </button>
          ))}
        </div>

        {/* Stale banner */}
        {showStaleBanner && (
          <Card className="p-3 bg-destructive/5 border-destructive/20 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs">
                <span className="font-medium">You have {insights.staleOpen} ideas untouched.</span>{' '}
                <span className="text-muted-foreground">Archive old ones or convert the good ones.</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {topStaleIdea && (
                <Button size="sm" variant="default" onClick={() => setDetailId(topStaleIdea.id)}>
                  Convert best one <ArrowRightCircle className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
              <ConfirmDialog
                trigger={<Button size="sm" variant="outline"><Archive className="w-3.5 h-3.5 mr-1" /> Archive &gt;30d</Button>}
                title="Archive old ideas?"
                description="All open ideas older than 30 days will be moved to Archived. You can restore them anytime."
                onConfirm={handleArchiveOld}
              />
            </div>
          </Card>
        )}

        {/* Search */}
        {ideas.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..." className="pl-9" />
          </div>
        )}

        {ideas.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="text-5xl mb-3">💡</div>
            <p className="font-medium mb-1">Har bada business ek chhoti idea se shuru hota hai.</p>
            <p className="text-sm text-muted-foreground mb-4">Every big business starts with one small idea.</p>
            <p className="text-xs text-muted-foreground mb-2">Try one of these to start:</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {EXAMPLE_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => { setQuickAddTitle(p); quickInputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/70 transition-colors border"
                >
                  {p}
                </button>
              ))}
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No ideas match your filters.</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(idea => {
              const members = membersByIdea.get(idea.id) || [];
              const isStale = idea.status === 'open' && daysSince(idea.created_at) > STALE_DAYS;
              return (
                <Card
                  key={idea.id}
                  className={`p-4 card-shadow hover:card-shadow-hover cursor-pointer transition-all group relative ${idea.is_pinned ? 'border-l-4 border-l-warning bg-warning/5' : ''}`}
                  onClick={() => setDetailId(idea.id)}
                >
                  {isStale && (
                    <span
                      title={`Untouched for ${daysSince(idea.created_at)} days`}
                      className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive animate-pulse"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[idea.priority] || PRIORITY_DOT.medium}`} title={`${idea.priority} priority`} />
                      {idea.is_pinned && <Pin className="w-3 h-3 text-warning shrink-0" />}
                      <h3 className="text-sm font-medium line-clamp-2">{idea.title}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="p-0.5 rounded hover:bg-muted shrink-0"><MoreVertical className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        {STATUS_OPTIONS.map(s => (
                          <DropdownMenuItem key={s.value} onClick={(e) => { e.stopPropagation(); handleStatusChange(idea.id, s.value); }} className="text-xs">
                            {s.label} {idea.status === s.value && '✓'}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(idea.id, idea.is_pinned); }} className="text-xs">
                          {idea.is_pinned ? 'Unpin' : 'Pin to top'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {idea.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{idea.description}</p>}
                  {members.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-2">
                      <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                      {members.slice(0, 3).map((m: any) => (
                        <Badge key={m.id} variant="secondary" className="text-[10px] px-1.5 py-0">{m.user_name}</Badge>
                      ))}
                      {members.length > 3 && <span className="text-[10px] text-muted-foreground">+{members.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[idea.status] || ''}`}>{idea.status.replace('_', ' ')}</Badge>
                    {idea.voice_note_url && <VoiceNotePlayer url={idea.voice_note_url} />}
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span>
                    {idea.status !== 'converted' && (
                      <button
                        onClick={(e) => handleConvertToTask(idea, e)}
                        title="Convert to task"
                        className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                      >
                        <ArrowRightCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Sheet */}
        <Sheet open={!!detailId} onOpenChange={o => { if (!o) { setDetailId(null); setIsEditing(false); } }}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {selectedIdea && (
              <div className="space-y-4">
                <SheetHeader>
                  {isEditing ? (
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-lg font-semibold" />
                  ) : (
                    <SheetTitle className="text-left">{selectedIdea.title}</SheetTitle>
                  )}
                </SheetHeader>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedIdea.status} onValueChange={v => handleStatusChange(selectedIdea.id, v)}>
                    <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isEditing ? (
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={PRIORITY_COLORS[selectedIdea.priority] || ''}>{selectedIdea.priority}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">by {selectedIdea.created_by_name}</span>
                </div>

                {/* Primary action first */}
                {!isEditing && selectedIdea.status !== 'converted' && (
                  <Button className="w-full gap-2" onClick={() => handleConvertToTask(selectedIdea)}>
                    <ArrowRightCircle className="w-4 h-4" /> Convert to Task
                  </Button>
                )}

                {isEditing ? (
                  <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="Add description..." />
                ) : (
                  selectedIdea.description && <p className="text-sm text-muted-foreground">{selectedIdea.description}</p>
                )}

                {selectedIdea.voice_note_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Voice note:</span>
                    <VoiceNotePlayer url={selectedIdea.voice_note_url} />
                  </div>
                )}

                <IdeaMembersSection ideaId={selectedIdea.id} members={membersByIdea.get(selectedIdea.id) || []} />

                <IdeaCommentsSection ideaId={selectedIdea.id} />

                <div className="flex flex-col gap-2 pt-2 border-t">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleSaveEdit(selectedIdea.id)}>Save Changes</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => startEditing(selectedIdea)}>
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handleCopyIdea(selectedIdea)}>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleTogglePin(selectedIdea.id, selectedIdea.is_pinned)} title={selectedIdea.is_pinned ? 'Unpin' : 'Pin to top'}>
                        <Pin className={`w-3.5 h-3.5 ${selectedIdea.is_pinned ? 'text-warning' : ''}`} />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        }
                        title="Delete this idea?"
                        description={`"${selectedIdea.title}" will be permanently deleted.`}
                        onConfirm={() => handleDelete(selectedIdea.id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

function IdeaMembersSection({ ideaId, members }: { ideaId: string; members: any[] }) {
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
