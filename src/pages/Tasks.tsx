import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useTasks, useCreateTask, useUpdateTask, useDeleteTask, useTeamMembers, useLeads, useCustomers, useBulkUpdateTasks, useBulkDeleteTasks } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SearchableSelect, { type SearchableOption } from '@/components/shared/SearchableSelect';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants';
import { Plus, Search, List, Columns3, Trash2, Loader2, GanttChart, CheckSquare, CalendarDays, Check, Link2, Eye, FileText, Bell, X, Mic, MoreHorizontal, Clock } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import SubTaskChecklist from '@/components/tasks/SubTaskChecklist';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import AITaskCreator from '@/components/tasks/AITaskCreator';
import ExportMenu from '@/components/shared/ExportMenu';
import { exportTasksCSV, exportTasksPDF } from '@/lib/exportUtils';
import MyDaySummary from '@/components/tasks/MyDaySummary';
import TaskNotes from '@/components/tasks/TaskNotes';
import RecurrenceSelect, { getNextDueDate, type Recurrence } from '@/components/tasks/RecurrenceSelect';
import { TASK_TEMPLATES, type TaskTemplate } from '@/lib/taskTemplates';
import VoiceNoteRecorder from '@/components/shared/VoiceNoteRecorder';
import VoiceNotePlayer from '@/components/shared/VoiceNotePlayer';
import { useIsMobile } from '@/hooks/use-mobile';

type TaskPriority = Database['public']['Enums']['task_priority'];
type TaskStatus = Database['public']['Enums']['task_status'];

// Hook for tasks where I'm a watcher
function useMyWatchedTasks(userId?: string, businessId?: string) {
  return useQuery({
    queryKey: ['my_watched_tasks', userId],
    queryFn: async () => {
      const { data: watcherRows, error } = await supabase.from('task_watchers' as any).select('task_id').eq('user_id', userId!);
      if (error) throw error;
      if (!watcherRows?.length) return [];
      const taskIds = (watcherRows as any[]).map((w: any) => w.task_id);
      const { data: tasks, error: tErr } = await supabase.from('tasks').select('*').in('id', taskIds).order('created_at', { ascending: false });
      if (tErr) throw tErr;
      return tasks || [];
    },
    enabled: !!userId && !!businessId,
  });
}

export default function Tasks() {
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: leads = [] } = useLeads();
  const { data: customers = [] } = useCustomers();
  const { data: watchedTasks = [] } = useMyWatchedTasks(user?.id, businessId!);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mainTab, setMainTab] = useState('my_tasks');

  // Form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskType, setTaskType] = useState('');
  const [linkedLeadId, setLinkedLeadId] = useState('');
  const [linkedCustomerId, setLinkedCustomerId] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'none' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  // CC/Loop
  const [ccMembers, setCcMembers] = useState<string[]>([]);
  // Reminders
  const [reminders, setReminders] = useState<Array<{ date: string; time: string; channels: string[] }>>([]);
  // Track idea conversion
  const [fromIdeaId, setFromIdeaId] = useState<string | null>(null);
  // Quick-add bar
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  // Collapsible sections in form
  const [showDetails, setShowDetails] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  // Group view state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['done', 'later']));

  // Handle pre-fill from Idea Board conversion
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromIdea) {
      const idea = state.fromIdea;
      setTitle(idea.title || '');
      setDesc(idea.description || '');
      setPriority(idea.priority === 'high' ? 'high' : idea.priority === 'low' ? 'low' : 'medium');
      setStatus('todo');
      setFromIdeaId(idea.id);
      setOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const startOfWeek = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();

  const counts = useMemo(() => {
    let overdue = 0, todayCount = 0, upcoming = 0, doneThisWeek = 0, assignedByMe = 0;
    tasks.forEach((t) => {
      if (t.status === 'done' && t.updated_at && t.updated_at.split('T')[0] >= startOfWeek) doneThisWeek++;
      if (t.created_by === user?.id && t.assigned_to && t.assigned_to !== user?.id && t.status !== 'done' && t.status !== 'cancelled') assignedByMe++;
      if (t.status === 'done' || t.status === 'cancelled') return;
      if (!t.due_date) return;
      if (t.due_date < today) overdue++;
      else if (t.due_date === today) todayCount++;
      else if (t.due_date <= in3Days) upcoming++;
    });
    return { overdue, today: todayCount, upcoming, doneThisWeek, assignedByMe };
  }, [tasks, today, in3Days, startOfWeek, user]);

  // Money-task heuristic
  const MONEY_RE = /payment|invoice|follow.?up|due|paisa|rupee|₹|\brs\.?\b/i;
  const [moneyOnly, setMoneyOnly] = useState(false);
  const [assignedByMeOnly, setAssignedByMeOnly] = useState(false);

  const handleQuickAdd = async () => {
    const t = quickTitle.trim();
    if (!t || !businessId || quickSaving) return;
    setQuickSaving(true);
    try {
      await (supabase.from('tasks').insert({
        business_id: businessId, title: t, priority: 'medium', status: 'todo',
        created_by: user?.id, assigned_to: user?.id,
      } as any) as any);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setQuickTitle('');
      toast.success('Added ✓ — tap to set due date');
    } catch (err: any) { toast.error(err.message); }
    finally { setQuickSaving(false); }
  };

  const toggleGroup = (k: string) => setCollapsedGroups(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });


  const resetForm = () => {
    setTitle(''); setDesc(''); setPriority('medium'); setStatus('todo'); setDueDate(''); setDueTime(''); setAssignedTo(''); setTaskType(''); setLinkedLeadId(''); setLinkedCustomerId(''); setRecurrence({ type: 'none' }); setEditingId(null); setCcMembers([]); setReminders([]); setFromIdeaId(null); setVoiceNoteUrl('');
  };

  const openEdit = (t: typeof tasks[0]) => {
    setTitle(t.title); setDesc(t.description || ''); setPriority(t.priority || 'medium'); setStatus(t.status || 'todo');
    setDueDate(t.due_date || ''); setDueTime(t.due_time || ''); setAssignedTo(t.assigned_to || ''); setTaskType(t.task_type || '');
    setLinkedLeadId(t.linked_lead_id || '');
    setLinkedCustomerId((t as any).linked_customer_id || '');
    setVoiceNoteUrl((t as any).voice_note_url || '');
    const rec = t.recurrence as unknown as Recurrence | null;
    setRecurrence(rec || { type: 'none' });
    setEditingId(t.id);
    setCcMembers([]);
    setReminders([]);
    setOpen(true);
    supabase.from('task_watchers' as any).select('user_id').eq('task_id', t.id).then(({ data }) => {
      if (data) setCcMembers((data as any[]).map((w: any) => w.user_id));
    });
  };

  const applyTemplate = (tpl: TaskTemplate) => {
    setTitle(tpl.title);
    setPriority(tpl.priority);
    setTaskType(tpl.task_type);
    if (tpl.recurrence) setRecurrence(tpl.recurrence as Recurrence);
    else setRecurrence({ type: 'none' });
  };

  const handleSave = async () => {
    if (!title.trim() || !businessId) return;
    const recurrenceData = recurrence.type === 'none' ? null : recurrence;
    try {
      const leadId = linkedLeadId || null;
      const customerId = linkedCustomerId || null;
      const assignee = assignedTo || null;
      let taskId = editingId;
      if (editingId) {
        await updateTask.mutateAsync({ id: editingId, title, description: desc, priority, status, due_date: dueDate || null, due_time: dueTime || null, assigned_to: assignee, task_type: taskType || null, linked_lead_id: leadId, linked_customer_id: customerId, recurrence: recurrenceData as any, voice_note_url: voiceNoteUrl || null } as any);
      } else {
        const { data, error } = await (supabase.from('tasks').insert({
          business_id: businessId,
          title,
          description: desc || null,
          priority,
          status,
          due_date: dueDate || null,
          due_time: dueTime || null,
          assigned_to: assignee,
          task_type: taskType || null,
          created_by: user?.id,
          linked_lead_id: leadId,
          linked_customer_id: customerId,
          recurrence: recurrenceData as any,
          voice_note_url: voiceNoteUrl || null,
        } as any) as any).select('id').single();
        if (error) throw error;
        taskId = data?.id;
        qc.invalidateQueries({ queryKey: ['tasks'] });
      }

      // Save CC/Loop watchers
      if (taskId) {
        await supabase.from('task_watchers' as any).delete().eq('task_id', taskId);
        if (ccMembers.length > 0) {
          const watchers = ccMembers.map(uid => {
            const member = teamOptions.find(o => o.value === uid);
            return { task_id: taskId, user_id: uid, user_name: member?.label || '' };
          });
          await supabase.from('task_watchers' as any).insert(watchers);
        }

        // Save reminders
        if (reminders.length > 0) {
          await supabase.from('task_reminders' as any).delete().eq('task_id', taskId);
          const reminderRows = reminders.filter(r => r.date).map(r => ({
            task_id: taskId,
            remind_at: `${r.date}T${r.time || '09:00'}:00`,
            channels: r.channels.length > 0 ? r.channels : ['web'],
            created_by: user?.id,
          }));
          if (reminderRows.length > 0) {
            await supabase.from('task_reminders' as any).insert(reminderRows);
          }
        }
      }

      // If converting from idea, update the idea status
      if (fromIdeaId && taskId) {
        await supabase.from('ideas' as any).update({ status: 'converted', converted_task_id: taskId }).eq('id', fromIdeaId);
        qc.invalidateQueries({ queryKey: ['ideas'] });
        toast.success('Idea converted to task!');
      }

      resetForm(); setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleQuickDone = async (task: typeof tasks[0], e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask.mutateAsync({ id: task.id, status: newStatus });
      const rec = task.recurrence as unknown as Recurrence | null;
      if (newStatus === 'done' && rec && rec.type !== 'none' && task.due_date) {
        const nextDue = getNextDueDate(task.due_date, rec);
        await createTask.mutateAsync({
          business_id: task.business_id, title: task.title, description: task.description,
          priority: task.priority, status: 'todo', due_date: nextDue,
          assigned_to: task.assigned_to, task_type: task.task_type,
          created_by: user?.id, linked_lead_id: task.linked_lead_id,
          recurrence: rec as any,
        });
        toast.success(`Next occurrence created for ${nextDue}`);
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteTask.mutateAsync(id); } catch (err: any) { toast.error(err.message); }
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterAssigned !== 'all' && t.assigned_to !== filterAssigned) return false;
      if (dayFilter === 'overdue' && (t.status === 'done' || t.status === 'cancelled' || !t.due_date || t.due_date >= today)) return false;
      if (dayFilter === 'today' && t.due_date !== today) return false;
      if (dayFilter === 'upcoming' && (!t.due_date || t.due_date <= today || t.due_date > in3Days)) return false;
      if (moneyOnly && !MONEY_RE.test(t.title)) return false;
      if (assignedByMeOnly && !(t.created_by === user?.id && t.assigned_to && t.assigned_to !== user?.id)) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterAssigned, dayFilter, today, in3Days, moneyOnly, assignedByMeOnly, user]);

  // Group filtered tasks by time bucket
  const grouped = useMemo(() => {
    const g: Record<string, typeof tasks> = { overdue: [], today: [], tomorrow: [], week: [], later: [], done: [] };
    filtered.forEach((t) => {
      if (t.status === 'done') { g.done.push(t); return; }
      if (t.status === 'cancelled') return;
      if (!t.due_date) { g.later.push(t); return; }
      if (t.due_date < today) g.overdue.push(t);
      else if (t.due_date === today) g.today.push(t);
      else if (t.due_date === tomorrow) g.tomorrow.push(t);
      else if (t.due_date <= in7Days) g.week.push(t);
      else g.later.push(t);
    });
    const priOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    Object.keys(g).forEach(k => g[k].sort((a, b) => (priOrder[a.priority || 'medium'] - priOrder[b.priority || 'medium'])));
    return g;
  }, [filtered, today, tomorrow, in7Days]);

  const statusColumns: TaskStatus[] = ['todo', 'in_progress', 'on_hold', 'done'];


  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((t) => t.id)));
  };
  const handleBulkDone = async () => {
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), updates: { status: 'done' } });
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} tasks marked done`);
    } catch (err: any) { toast.error(err.message); }
  };
  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success('Tasks deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l.name])), [leads]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const assignedMap = useMemo(() => {
    const m = new Map<string, string>();
    if (user?.id) m.set(user.id, business?.owner_name || 'Owner');
    teamMembers.forEach((tm) => { if (tm.user_id) m.set(tm.user_id, tm.name); m.set(tm.id, tm.name); });
    return m;
  }, [user, business, teamMembers]);

  const teamOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [];
    if (user?.id) opts.push({ value: user.id, label: business?.owner_name || 'Owner', hint: 'Owner' });
    teamMembers.forEach((m) => opts.push({ value: m.user_id || m.id, label: m.name, hint: m.department || undefined }));
    return opts;
  }, [user, business, teamMembers]);

  const leadOptions: SearchableOption[] = useMemo(() =>
    leads.map((l) => ({ value: l.id, label: l.name, hint: l.company || undefined })), [leads]);

  const customerOptions: SearchableOption[] = useMemo(() =>
    customers.map((c) => ({ value: c.id, label: c.name, hint: c.company || undefined })), [customers]);

  const addReminder = () => {
    setReminders(prev => [...prev, { date: '', time: '09:00', channels: ['web'] }]);
  };

  const updateReminder = (idx: number, field: string, value: any) => {
    setReminders(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const toggleReminderChannel = (idx: number, channel: string) => {
    setReminders(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const channels = r.channels.includes(channel) ? r.channels.filter(c => c !== channel) : [...r.channels, channel];
      return { ...r, channels };
    }));
  };

  const removeReminder = (idx: number) => {
    setReminders(prev => prev.filter((_, i) => i !== idx));
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  // Quick-add bar (persistent, one-tap capture)
  const quickAddBar = (
    <Card className="p-2.5 card-shadow border-primary/20 overflow-hidden">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Plus className="w-3.5 h-3.5 text-primary" />
        </div>
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
          placeholder="Kya karna hai? Type & Enter"
          className="border-0 shadow-none focus-visible:ring-0 px-1 text-sm bg-transparent min-w-0 flex-1 h-8"
        />
        <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0 px-2 hidden sm:inline-flex" onClick={() => setOpen(true)}>
          Details
        </Button>
        <Button size="sm" className="h-8 shrink-0 px-3" onClick={handleQuickAdd} disabled={!quickTitle.trim() || quickSaving}>
          {quickSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
        </Button>
      </div>
    </Card>

  );

  // Insight strip
  const insightStrip = (
    <div className="grid grid-cols-3 gap-2">
      <button onClick={() => setDayFilter(dayFilter === 'today' ? null : 'today')} className={`p-3 rounded-lg border text-left transition-colors ${dayFilter === 'today' ? 'bg-primary/10 border-primary/40' : 'bg-card hover:bg-muted/50'}`}>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Aaj ka focus</p>
        <p className="text-lg font-bold tabular-nums mt-0.5">{counts.today}</p>
        <p className="text-[10px] text-muted-foreground">due today</p>
      </button>
      <div className="p-3 rounded-lg border bg-card">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Done this week</p>
        <p className="text-lg font-bold tabular-nums mt-0.5 flex items-center gap-1">
          {counts.doneThisWeek} {counts.doneThisWeek >= 5 && <span className="text-sm">🔥</span>}
        </p>
        <p className="text-[10px] text-muted-foreground">keep going</p>
      </div>
      <button onClick={() => setAssignedByMeOnly(v => !v)} className={`p-3 rounded-lg border text-left transition-colors ${assignedByMeOnly ? 'bg-primary/10 border-primary/40' : 'bg-card hover:bg-muted/50'}`}>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">From team</p>
        <p className="text-lg font-bold tabular-nums mt-0.5">{counts.assignedByMe}</p>
        <p className="text-[10px] text-muted-foreground">pending</p>
      </button>
    </div>
  );

  const groupMeta: Array<{ key: string; label: string; icon: string; tone?: string }> = [
    { key: 'overdue', label: 'Overdue', icon: '🔴', tone: 'text-destructive' },
    { key: 'today', label: 'Aaj / Today', icon: '📅' },
    { key: 'tomorrow', label: 'Kal / Tomorrow', icon: '⏭️' },
    { key: 'week', label: 'Is hafte / This week', icon: '📆' },
    { key: 'later', label: 'Baad mein / Later', icon: '🗓️' },
    { key: 'done', label: 'Done', icon: '✅', tone: 'text-muted-foreground' },
  ];
  const renderGrouped = () => {
    const anyVisible = groupMeta.some(g => (grouped[g.key] || []).length > 0);
    if (!anyVisible) {
      return <Card className="p-8 text-center card-shadow"><p className="text-sm text-muted-foreground">No tasks match your filters.</p></Card>;
    }
    return (
      <div className="space-y-4">
        {groupMeta.map(({ key, label, icon, tone }) => {
          const list = grouped[key] || [];
          if (list.length === 0) return null;
          const collapsed = collapsedGroups.has(key);
          return (
            <div key={key}>
              <button onClick={() => toggleGroup(key)} className="w-full flex items-center gap-2 px-1 mb-2">
                <span className="text-base">{icon}</span>
                <h3 className={`text-xs font-semibold uppercase tracking-wide ${tone || 'text-foreground'}`}>{label}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
                <span className="ml-auto text-xs text-muted-foreground opacity-60">{collapsed ? '▸' : '▾'}</span>
              </button>
              {!collapsed && renderTaskList(list)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTaskList = (taskList: typeof tasks) => (
    <div className="space-y-2">
      {taskList.map((task) => {
        const linkedLead = task.linked_lead_id ? leadMap.get(task.linked_lead_id) : null;
        const assignedName = task.assigned_to ? assignedMap.get(task.assigned_to) : null;
        const rec = task.recurrence as unknown as Recurrence | null;
        const isOverdue = task.due_date && task.due_date < today && task.status !== 'done' && task.status !== 'cancelled';
        return (
          <Card key={task.id} className={`p-4 card-shadow hover:card-shadow-hover transition-shadow duration-150 cursor-pointer ${isOverdue ? 'border-l-4 border-l-destructive bg-destructive/5' : ''}`} onClick={() => openEdit(task)}>
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selectedIds.has(task.id)} onCheckedChange={() => toggleSelect(task.id)} />
                <button
                  onClick={(e) => handleQuickDone(task, e)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.status === 'done' ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground/40 hover:border-success'}`}
                >
                  {task.status === 'done' && <Check className="w-3 h-3" />}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-medium ${isMobile ? 'line-clamp-2' : 'truncate'} ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge className={PRIORITY_CONFIG[task.priority || 'medium']?.color + ' text-[10px]'}>{task.priority}</Badge>
                  <Badge className={TASK_STATUS_CONFIG[task.status || 'todo']?.color + ' text-[10px]'}>{TASK_STATUS_CONFIG[task.status || 'todo']?.label}</Badge>
                  {task.task_type && <Badge variant="outline" className="text-[10px]">{task.task_type}</Badge>}
                  {rec && rec.type !== 'none' && <Badge variant="outline" className="text-[10px] gap-0.5">🔁 {rec.type}</Badge>}
                  {!isMobile && linkedLead && (
                    <Link to={`/crm`} onClick={(e) => e.stopPropagation()}>
                      <Badge variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-primary/10"><Link2 className="w-2.5 h-2.5" />{linkedLead}</Badge>
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                  {task.due_date && (
                    <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                      {isOverdue ? 'Overdue · ' : ''}{task.due_date}
                      {task.due_time && ` ${task.due_time.slice(0, 5)}`}
                    </span>
                  )}
                  {assignedName && <span className="text-muted-foreground">→ {assignedName}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  }
                  title="Delete this task?"
                  description={`"${task.title}" will be permanently deleted.`}
                  onConfirm={() => handleDelete(task.id)}
                />
              </div>

            </div>
          </Card>
        );
      })}
    </div>
  );

  // Task form content (shared between Dialog and Drawer)
  const taskFormContent = (
    <div className="space-y-4 px-1 pb-8">


      <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
      <div>
        <Label>Description</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" rows={2} />
      </div>
      {/* Voice Note */}
      <div>
        <Label className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Voice Note</Label>
        <div className="mt-1 flex items-center gap-2">
          <VoiceNoteRecorder onRecorded={setVoiceNoteUrl} existingUrl={voiceNoteUrl || undefined} bucketFolder={user?.id || 'general'} />
          {voiceNoteUrl && <VoiceNotePlayer url={voiceNoteUrl} />}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{['high', 'medium', 'low'].map((p) => <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" /></div>
        <div><Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Due Time</Label><Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="mt-1" /></div>
      </div>
      <div>
        <Label>Assigned To</Label>
        <div className="mt-1">
          <SearchableSelect options={teamOptions} value={assignedTo} onValueChange={setAssignedTo} placeholder="Search member..." />
        </div>
      </div>

      {/* CC / Loop */}
      <div>
        <Label className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> CC / Loop</Label>
        <div className="mt-1 space-y-1">
          {ccMembers.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {ccMembers.map(uid => {
                const m = teamOptions.find(o => o.value === uid);
                return (
                  <Badge key={uid} variant="secondary" className="text-xs gap-1">
                    {m?.label || uid}
                    <button onClick={() => setCcMembers(prev => prev.filter(id => id !== uid))} className="hover:text-destructive">×</button>
                  </Badge>
                );
              })}
            </div>
          )}
          <SearchableSelect
            options={teamOptions.filter(o => !ccMembers.includes(o.value) && o.value !== assignedTo)}
            value=""
            onValueChange={v => { if (v && !ccMembers.includes(v)) setCcMembers(prev => [...prev, v]); }}
            placeholder="Add to loop..."
          />
        </div>
      </div>

      {/* Reminders */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Reminders</Label>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addReminder}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {reminders.map((rem, idx) => (
          <div key={idx} className="mt-2 p-2 rounded-md border bg-muted/30 space-y-2">
            <div className="flex gap-2">
              <Input type="date" value={rem.date} onChange={e => updateReminder(idx, 'date', e.target.value)} className="text-xs h-7 flex-1" />
              <Input type="time" value={rem.time} onChange={e => updateReminder(idx, 'time', e.target.value)} className="text-xs h-7 w-24" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeReminder(idx)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-2 text-xs">
              {['web', 'whatsapp', 'email'].map(ch => (
                <label key={ch} className="flex items-center gap-1 cursor-pointer">
                  <Checkbox checked={rem.channels.includes(ch)} onCheckedChange={() => toggleReminderChannel(idx, ch)} className="h-3.5 w-3.5" />
                  <span className="capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
        {leads.length > 0 && (
          <div>
            <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Link to Lead</Label>
            <div className="mt-1">
              <SearchableSelect options={leadOptions} value={linkedLeadId} onValueChange={setLinkedLeadId} placeholder="Search lead..." />
            </div>
          </div>
        )}
      </div>
      {customers.length > 0 && (
        <div>
          <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Link to Customer</Label>
          <div className="mt-1">
            <SearchableSelect options={customerOptions} value={linkedCustomerId} onValueChange={setLinkedCustomerId} placeholder="Search customer..." />
          </div>
        </div>
      )}
      {business?.task_types && business.task_types.length > 0 && (
        <div>
          <Label>Task Type</Label>
          <Select value={taskType} onValueChange={setTaskType}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{business.task_types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {editingId && (
        <>
          <div className="border-t pt-3"><SubTaskChecklist taskId={editingId} /></div>
          <div className="border-t pt-3"><TaskNotes taskId={editingId} /></div>
        </>
      )}
      <Button onClick={handleSave} className="w-full" disabled={createTask.isPending || updateTask.isPending}>
        {(createTask.isPending || updateTask.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {editingId ? 'Save Changes' : 'Create Task'}
      </Button>
    </div>
  );

  const taskFormHeader = (
    <div className="flex items-center justify-between">
      {editingId ? 'Edit Task' : 'New Task'}
      {!editingId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7"><FileText className="w-3 h-3" /> Template</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {TASK_TEMPLATES.map((tpl, i) => (
              <DropdownMenuItem key={i} onClick={() => applyTemplate(tpl)} className="text-xs">
                <span className="flex-1">{tpl.title}</span>
                <Badge variant="outline" className="text-[9px] ml-2">{tpl.priority}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  // Quick filter chips for mobile
  const quickFilterChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {counts.overdue > 0 && (
        <button onClick={() => setDayFilter(dayFilter === 'overdue' ? null : 'overdue')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dayFilter === 'overdue' ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
          Overdue ({counts.overdue})
        </button>
      )}
      <button onClick={() => setDayFilter(dayFilter === 'today' ? null : 'today')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dayFilter === 'today' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border border-primary/20'}`}>
        Today ({counts.today})
      </button>
      <button onClick={() => setMoneyOnly(v => !v)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${moneyOnly ? 'bg-warning text-warning-foreground' : 'bg-warning/10 text-warning-foreground border border-warning/20'}`}>
        🔥 Money tasks
      </button>
      <button onClick={() => setAssignedByMeOnly(v => !v)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${assignedByMeOnly ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'}`}>
        👤 By me ({counts.assignedByMe})
      </button>
      {['high', 'medium', 'low'].map(p => {
        const count = tasks.filter(t => t.priority === p && t.status !== 'done' && t.status !== 'cancelled').length;
        if (count === 0) return null;
        return (
          <button key={p} onClick={() => setFilterPriority(filterPriority === p ? 'all' : p)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterPriority === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'}`}>
            {PRIORITY_CONFIG[p].label} ({count})
          </button>
        );
      })}
    </div>
  );


  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Tasks</h1>
          <div className="flex items-center gap-2">
            {/* On mobile, collapse secondary actions into More menu */}
            {isMobile ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportTasksCSV(tasks)}>Export CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportTasksPDF(tasks)}>Export PDF</DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/tasks/gantt">Gantt & Time</Link></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AITaskCreator />
              </>
            ) : (
              <>
                <ExportMenu onCSV={() => exportTasksCSV(tasks)} onPDF={() => exportTasksPDF(tasks)} />
                <AITaskCreator />
                <Link to="/tasks/gantt">
                  <Button size="sm" variant="outline" className="gap-1"><GanttChart className="w-4 h-4" /> Gantt & Time</Button>
                </Link>
              </>
            )}

            {/* Responsive task form: Drawer on mobile, Dialog on desktop */}
            {isMobile ? (
              <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
                <DrawerTrigger asChild>
                  <Button size="sm" className="h-8 w-8 p-0"><Plus className="w-4 h-4" /></Button>

                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh]">
                  <DrawerHeader><DrawerTitle>{taskFormHeader}</DrawerTitle></DrawerHeader>
                  <div className="px-4 pb-6 overflow-y-auto">{taskFormContent}</div>
                </DrawerContent>
              </Drawer>
            ) : (
              <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Task</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>{taskFormHeader}</DialogTitle></DialogHeader>
                  {taskFormContent}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Quick-add bar — one-line capture */}
        {quickAddBar}

        {/* Insight strip */}
        {tasks.length > 0 && insightStrip}

        {/* Quick filter chips */}
        {tasks.length > 0 && quickFilterChips}

        {tasks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-lg font-semibold mb-2">Aaj kya karna hai?</h2>
            <p className="text-sm text-muted-foreground mb-4">Ek chhota kaam bhi likh do — 30 second lagega.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Payment follow-up', 'Team meeting kal 11am', 'Site visit is hafte'].map(ex => (
                <button key={ex} onClick={() => { setQuickTitle(ex); }} className="px-3 py-1.5 rounded-full text-xs border bg-card hover:bg-muted/50 transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (

          <>
            <Tabs value={mainTab} onValueChange={setMainTab}>
              <TabsList className="mb-2">
                <TabsTrigger value="my_tasks" className="gap-1"><CheckSquare className="w-4 h-4" /> My Tasks</TabsTrigger>
                <TabsTrigger value="looped_in" className="gap-1"><Eye className="w-4 h-4" /> Looped In {watchedTasks.length > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{watchedTasks.length}</Badge>}</TabsTrigger>
              </TabsList>

              <TabsContent value="looped_in" className="mt-2">
                {watchedTasks.length === 0 ? (
                  <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No tasks where you're in the loop.</p></Card>
                ) : renderTaskList(watchedTasks)}
              </TabsContent>

              <TabsContent value="my_tasks" className="mt-0">
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
                  </div>
                  {!isMobile && (
                    <>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priority</SelectItem>
                          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="w-[150px]">
                        <SearchableSelect
                          options={[{ value: 'all', label: 'All Members' }, ...teamOptions]}
                          value={filterAssigned}
                          onValueChange={(v) => setFilterAssigned(v || 'all')}
                          placeholder="All Members"
                          allowClear={false}
                        />
                      </div>
                    </>
                  )}
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border mb-4">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <Button size="sm" variant="outline" className="gap-1" onClick={handleBulkDone} disabled={bulkUpdate.isPending}>
                      <Check className="w-3.5 h-3.5" /> Mark Done
                    </Button>
                    <ConfirmDialog
                      trigger={<Button size="sm" variant="destructive" className="gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>}
                      title="Delete selected tasks?"
                      description={`${selectedIds.size} tasks will be permanently deleted.`}
                      onConfirm={handleBulkDelete}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                  </div>
                )}

                <Tabs defaultValue="list">
                  <TabsList>
                    <TabsTrigger value="list" className="gap-1"><List className="w-4 h-4" /> List</TabsTrigger>
                    <TabsTrigger value="kanban" className="gap-1"><Columns3 className="w-4 h-4" /> Kanban</TabsTrigger>
                    <TabsTrigger value="calendar" className="gap-1"><CalendarDays className="w-4 h-4" /> Calendar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="list" className="mt-4">
                    {filtered.length > 0 && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} />
                        <span className="text-xs text-muted-foreground">Select All</span>
                      </div>
                    )}
                    {renderGrouped()}
                  </TabsContent>


                  <TabsContent value="kanban" className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {statusColumns.map((col) => {
                        const colTasks = filtered.filter((t) => t.status === col);
                        return (
                          <div key={col}>
                            <div className="flex items-center gap-2 mb-3 px-1">
                              <div className={`w-2 h-2 rounded-full ${col === 'todo' ? 'bg-muted-foreground' : col === 'in_progress' ? 'bg-info' : col === 'on_hold' ? 'bg-warning' : 'bg-success'}`} />
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TASK_STATUS_CONFIG[col].label}</h3>
                              <span className="text-xs text-muted-foreground tabular-nums">{colTasks.length}</span>
                            </div>
                            <div className="space-y-2 min-h-[100px]">
                              {colTasks.map((task) => (
                                <Card key={task.id} className="p-3 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => openEdit(task)}>
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={(e) => handleQuickDone(task, e)}
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${task.status === 'done' ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground/40 hover:border-success'}`}
                                    >
                                      {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                                    </button>
                                    <div className="min-w-0">
                                      <p className={`text-sm font-medium mb-1.5 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge className={PRIORITY_CONFIG[task.priority || 'medium']?.color + ' text-[10px]'}>{task.priority}</Badge>
                                        {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
                                        {task.assigned_to && assignedMap.get(task.assigned_to) && (
                                          <span className="text-[10px] text-muted-foreground">→ {assignedMap.get(task.assigned_to)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="calendar" className="mt-4">
                    <TaskCalendarView tasks={filtered} onTaskClick={(t) => openEdit(t as typeof tasks[0])} />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
