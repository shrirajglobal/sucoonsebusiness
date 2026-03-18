import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants';
import type { Task, TaskPriority, TaskStatus } from '@/types';
import { Plus, Search, List, Columns3, Trash2 } from 'lucide-react';

function generateId() { return Math.random().toString(36).substring(2, 10); }

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, business, teamMembers } = useAppStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // New task form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskType, setTaskType] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle(''); setDesc(''); setPriority('medium'); setStatus('todo'); setDueDate(''); setAssignedTo(''); setTaskType(''); setEditingId(null);
  };

  const openEdit = (t: Task) => {
    setTitle(t.title); setDesc(t.description || ''); setPriority(t.priority); setStatus(t.status);
    setDueDate(t.dueDate || ''); setAssignedTo(t.assignedTo || ''); setTaskType(t.taskType || ''); setEditingId(t.id);
    setOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      updateTask(editingId, { title, description: desc, priority, status, dueDate, assignedTo, taskType });
    } else {
      addTask({ id: generateId(), title, description: desc, priority, status, dueDate, assignedTo, taskType, createdAt: now, updatedAt: now });
    }
    resetForm(); setOpen(false);
  };

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const today = new Date().toISOString().split('T')[0];
  const statusColumns: TaskStatus[] = ['todo', 'in_progress', 'on_hold', 'done'];

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tasks</h1>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
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
                        <SelectItem value="owner">{business?.ownerName || 'Owner'}</SelectItem>
                        {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {business?.taskTypes && business.taskTypes.length > 0 && (
                  <div>
                    <Label>Task Type</Label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{business.taskTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleSave} className="w-full">{editingId ? 'Save Changes' : 'Create Task'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list" className="gap-1"><List className="w-4 h-4" /> List</TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1"><Columns3 className="w-4 h-4" /> Kanban</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {filtered.length === 0 ? (
              <Card className="p-8 text-center card-shadow"><p className="text-sm text-muted-foreground">No tasks found.</p></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((task) => (
                  <Card key={task.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow duration-150 cursor-pointer" onClick={() => openEdit(task)}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium truncate">{task.title}</h3>
                          {task.taskType && <Badge variant="outline" className="text-[10px]">{task.taskType}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <span className={task.dueDate < today && task.status !== 'done' ? 'text-destructive font-medium' : ''}>
                              {task.dueDate < today && task.status !== 'done' ? 'Overdue · ' : ''}{task.dueDate}
                            </span>
                          )}
                          {task.assignedTo && <span>· {task.assignedTo === 'owner' ? business?.ownerName : teamMembers.find((m) => m.id === task.assignedTo)?.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Badge className={PRIORITY_CONFIG[task.priority]?.color + ' text-[10px]'}>{task.priority}</Badge>
                        <Badge className={TASK_STATUS_CONFIG[task.status]?.color + ' text-[10px]'}>{TASK_STATUS_CONFIG[task.status]?.label}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
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
                          <p className="text-sm font-medium mb-1.5">{task.title}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge className={PRIORITY_CONFIG[task.priority]?.color + ' text-[10px]'}>{task.priority}</Badge>
                            {task.dueDate && <span className="text-[10px] text-muted-foreground">{task.dueDate}</span>}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
