import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useTasks, useCreateTask, useUpdateTask, useDeleteTask, useTeamMembers, useLeads, useBulkUpdateTasks, useBulkDeleteTasks } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants';
import { Plus, Search, List, Columns3, Trash2, Loader2, GanttChart, CheckSquare, CalendarDays, Check, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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

type TaskPriority = Database['public']['Enums']['task_priority'];
type TaskStatus = Database['public']['Enums']['task_status'];

export default function Tasks() {
  const { user, businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: leads = [] } = useLeads();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskType, setTaskType] = useState('');
  const [linkedLeadId, setLinkedLeadId] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'none' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  // My Day counts
  const counts = useMemo(() => {
    let overdue = 0, todayCount = 0, upcoming = 0;
    tasks.forEach((t) => {
      if (t.status === 'done' || t.status === 'cancelled') return;
      if (!t.due_date) return;
      if (t.due_date < today) overdue++;
      else if (t.due_date === today) todayCount++;
      else if (t.due_date <= in3Days) upcoming++;
    });
    return { overdue, today: todayCount, upcoming };
  }, [tasks, today, in3Days]);

  const resetForm = () => {
    setTitle(''); setDesc(''); setPriority('medium'); setStatus('todo'); setDueDate(''); setAssignedTo(''); setTaskType(''); setLinkedLeadId(''); setRecurrence({ type: 'none' }); setEditingId(null);
  };

  const openEdit = (t: typeof tasks[0]) => {
    setTitle(t.title); setDesc(t.description || ''); setPriority(t.priority || 'medium'); setStatus(t.status || 'todo');
    setDueDate(t.due_date || ''); setAssignedTo(t.assigned_to || ''); setTaskType(t.task_type || '');
    setLinkedLeadId(t.linked_lead_id || '');
    const rec = t.recurrence as unknown as Recurrence | null;
    setRecurrence(rec || { type: 'none' });
    setEditingId(t.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !businessId) return;
    const recurrenceData = recurrence.type === 'none' ? null : recurrence;
    try {
      if (editingId) {
        await updateTask.mutateAsync({ id: editingId, title, description: desc, priority, status, due_date: dueDate || null, assigned_to: assignedTo || null, task_type: taskType || null, linked_lead_id: linkedLeadId || null, recurrence: recurrenceData as any });
      } else {
        await createTask.mutateAsync({ business_id: businessId, title, description: desc, priority, status, due_date: dueDate || null, assigned_to: assignedTo || null, task_type: taskType || null, created_by: user?.id, linked_lead_id: linkedLeadId || null, recurrence: recurrenceData as any });
      }
      resetForm(); setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleQuickDone = async (task: typeof tasks[0], e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask.mutateAsync({ id: task.id, status: newStatus });
      // If marking done and has recurrence + due_date, create next occurrence
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

  // Filtering
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterAssigned !== 'all' && t.assigned_to !== filterAssigned) return false;
      // Day filter
      if (dayFilter === 'overdue' && (t.status === 'done' || t.status === 'cancelled' || !t.due_date || t.due_date >= today)) return false;
      if (dayFilter === 'today' && t.due_date !== today) return false;
      if (dayFilter === 'upcoming' && (!t.due_date || t.due_date <= today || t.due_date > in3Days)) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterAssigned, dayFilter, today, in3Days]);

  const statusColumns: TaskStatus[] = ['todo', 'in_progress', 'on_hold', 'done'];

  // Bulk actions
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

  // Lead name lookup
  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l.name])), [leads]);
  // Assigned name lookup
  const assignedMap = useMemo(() => {
    const m = new Map<string, string>();
    if (user?.id) m.set(user.id, business?.owner_name || 'Owner');
    teamMembers.forEach((tm) => { if (tm.user_id) m.set(tm.user_id, tm.name); m.set(tm.id, tm.name); });
    return m;
  }, [user, business, teamMembers]);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tasks</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportMenu onCSV={() => exportTasksCSV(tasks)} onPDF={() => exportTasksPDF(tasks)} />
            <AITaskCreator />
            <Link to="/tasks/gantt">
              <Button size="sm" variant="outline" className="gap-1"><GanttChart className="w-4 h-4" /> Gantt & Time</Button>
            </Link>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Task</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingId ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
                  <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" rows={2} /></div>
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
                    <div>
                      <Label>Assigned To</Label>
                      <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={user?.id || 'owner'}>{business?.owner_name || 'Owner'}</SelectItem>
                          {teamMembers.map((m) => <SelectItem key={m.id} value={m.user_id || m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
                    {leads.length > 0 && (
                      <div>
                        <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Link to Lead</Label>
                        <Select value={linkedLeadId} onValueChange={setLinkedLeadId}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}{l.company ? ` (${l.company})` : ''}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
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
                      <div className="border-t pt-3">
                        <SubTaskChecklist taskId={editingId} />
                      </div>
                      <div className="border-t pt-3">
                        <TaskNotes taskId={editingId} />
                      </div>
                    </>
                  )}
                  <Button onClick={handleSave} className="w-full" disabled={createTask.isPending || updateTask.isPending}>
                    {(createTask.isPending || updateTask.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    {editingId ? 'Save Changes' : 'Create Task'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* My Day Summary */}
        {tasks.length > 0 && (
          <MyDaySummary
            overdue={counts.overdue}
            today={counts.today}
            upcoming={counts.upcoming}
            activeFilter={dayFilter}
            onFilter={setDayFilter}
          />
        )}

        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create your first task to start tracking work, follow-ups, and deadlines."
            actionLabel="Add Task"
            onAction={() => setOpen(true)}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
              </div>
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
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value={user?.id || 'owner'}>{business?.owner_name || 'Owner'}</SelectItem>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.user_id || m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border">
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
                {filtered.length === 0 ? (
                  <Card className="p-8 text-center card-shadow"><p className="text-sm text-muted-foreground">No tasks match your filters.</p></Card>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((task) => {
                      const linkedLead = task.linked_lead_id ? leadMap.get(task.linked_lead_id) : null;
                      const assignedName = task.assigned_to ? assignedMap.get(task.assigned_to) : null;
                      const rec = task.recurrence as Recurrence | null;
                      return (
                        <Card key={task.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow duration-150 cursor-pointer" onClick={() => openEdit(task)}>
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
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h3>
                                {task.task_type && <Badge variant="outline" className="text-[10px]">{task.task_type}</Badge>}
                                {rec && rec.type !== 'none' && <Badge variant="outline" className="text-[10px] gap-0.5">🔁 {rec.type}</Badge>}
                                {linkedLead && (
                                  <Link to={`/crm`} onClick={(e) => e.stopPropagation()}>
                                    <Badge variant="secondary" className="text-[10px] gap-0.5 cursor-pointer hover:bg-primary/10"><Link2 className="w-2.5 h-2.5" />{linkedLead}</Badge>
                                  </Link>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {task.due_date && (
                                  <span className={task.due_date < today && task.status !== 'done' ? 'text-destructive font-medium' : ''}>
                                    {task.due_date < today && task.status !== 'done' ? 'Overdue · ' : ''}{task.due_date}
                                  </span>
                                )}
                                {assignedName && <span className="text-muted-foreground">→ {assignedName}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <Badge className={PRIORITY_CONFIG[task.priority || 'medium']?.color + ' text-[10px]'}>{task.priority}</Badge>
                              <Badge className={TASK_STATUS_CONFIG[task.status || 'todo']?.color + ' text-[10px]'}>{TASK_STATUS_CONFIG[task.status || 'todo']?.label}</Badge>
                              <ConfirmDialog
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
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
                )}
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
