import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useTasks, useUpdateTask } from '@/hooks/useSupabaseData';
import { useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry } from '@/hooks/useTimeTracking';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants';
import { ArrowLeft, Play, Pause, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function GanttTasks() {
  const { user, businessId } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: timeEntries = [] } = useTimeEntries();
  const createTimeEntry = useCreateTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();
  const updateTask = useUpdateTask();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Find active timer from DB
  useEffect(() => {
    const active = timeEntries.find((e) => !e.ended_at && e.user_id === user?.id);
    if (active) {
      setActiveTimer(active.task_id);
      setElapsed(Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000));
    }
  }, [timeEntries, user]);

  // Tick
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = async (taskId: string) => {
    if (!user || !businessId) return;
    // Stop existing timer first
    if (activeTimer) await stopTimer();
    try {
      await createTimeEntry.mutateAsync({ task_id: taskId, business_id: businessId, user_id: user.id });
      setActiveTimer(taskId);
      setElapsed(0);
    } catch (err: any) { toast.error(err.message); }
  };

  const stopTimer = async () => {
    const active = timeEntries.find((e) => !e.ended_at && e.user_id === user?.id);
    if (active) {
      const mins = Math.max(1, Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000));
      try {
        await updateTimeEntry.mutateAsync({ id: active.id, ended_at: new Date().toISOString(), duration_minutes: mins });
      } catch (err: any) { toast.error(err.message); }
    }
    setActiveTimer(null);
    setElapsed(0);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Gantt chart data - tasks with due dates
  const ganttTasks = useMemo(() => {
    return tasks
      .filter((t) => t.due_date && t.status !== 'cancelled')
      .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1));
  }, [tasks]);

  // Date range for Gantt
  const { startDate, endDate, totalDays, dayWidth } = useMemo(() => {
    if (ganttTasks.length === 0) return { startDate: new Date(), endDate: new Date(), totalDays: 14, dayWidth: 40 };
    const dates = ganttTasks.map((t) => new Date(t.due_date!).getTime());
    const created = ganttTasks.map((t) => t.created_at ? new Date(t.created_at).getTime() : Date.now());
    const minDate = new Date(Math.min(...created, ...dates) - 2 * 86400000);
    const maxDate = new Date(Math.max(...dates) + 3 * 86400000);
    const days = Math.max(14, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000));
    return { startDate: minDate, endDate: maxDate, totalDays: days, dayWidth: 40 };
  }, [ganttTasks]);

  const getTaskTotalTime = (taskId: string) => {
    return timeEntries.filter((e) => e.task_id === taskId && e.duration_minutes).reduce((s, e) => s + (e.duration_minutes || 0), 0);
  };

  // Generate dates array for header
  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      arr.push(d);
    }
    return arr;
  }, [startDate, totalDays]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = Math.floor((today.getTime() - startDate.getTime()) / 86400000);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center gap-3">
          <Link to="/tasks"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-xl font-semibold">Gantt View & Time Tracking</h1>
        </div>

        {/* Active Timer Banner */}
        {activeTimer && (
          <Card className="p-4 card-shadow bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <p className="text-sm font-medium">
                  Tracking: {tasks.find((t) => t.id === activeTimer)?.title}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold tabular-nums">{formatTime(elapsed)}</span>
                <Button size="sm" variant="destructive" onClick={stopTimer} className="gap-1">
                  <Pause className="w-3 h-3" /> Stop
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Time Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tasks.filter((t) => t.status !== 'cancelled').slice(0, 8).map((task) => {
            const totalMins = getTaskTotalTime(task.id);
            const isActive = activeTimer === task.id;
            return (
              <Card key={task.id} className={`p-3 card-shadow ${isActive ? 'ring-2 ring-primary' : ''}`}>
                <p className="text-xs font-medium truncate mb-1">{task.title}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {totalMins > 0 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : '0m'}
                    </span>
                  </div>
                  {isActive ? (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={stopTimer}>
                      <Pause className="w-3 h-3 text-destructive" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startTimer(task.id)}>
                      <Play className="w-3 h-3 text-primary" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Gantt Chart */}
        <Card className="card-shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Gantt Timeline</h2>
            <p className="text-xs text-muted-foreground">{ganttTasks.length} tasks with due dates</p>
          </div>
          {ganttTasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Add due dates to tasks to see them on the Gantt chart.</p>
            </div>
          ) : (
            <div className="flex">
              {/* Task list */}
              <div className="w-[200px] flex-shrink-0 border-r">
                <div className="h-10 border-b bg-muted/50 px-3 flex items-center">
                  <span className="text-xs font-semibold text-muted-foreground">Task</span>
                </div>
                {ganttTasks.map((task) => (
                  <div key={task.id} className="h-10 border-b px-3 flex items-center">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div className="flex-1 overflow-x-auto" ref={scrollRef}>
                <div style={{ width: totalDays * dayWidth, minWidth: '100%' }}>
                  {/* Date header */}
                  <div className="h-10 border-b bg-muted/50 flex">
                    {dates.map((d, i) => {
                      const isToday = d.toDateString() === today.toDateString();
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={`flex-shrink-0 flex items-center justify-center border-r text-[10px] ${isToday ? 'bg-primary/10 font-semibold text-primary' : isWeekend ? 'bg-muted/80 text-muted-foreground' : 'text-muted-foreground'}`}
                          style={{ width: dayWidth }}
                        >
                          {d.getDate()}/{d.getMonth() + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Task bars */}
                  {ganttTasks.map((task) => {
                    const createdDate = task.created_at ? new Date(task.created_at) : new Date();
                    const dueDate = new Date(task.due_date!);
                    const startOffset = Math.max(0, Math.floor((createdDate.getTime() - startDate.getTime()) / 86400000));
                    const endOffset = Math.floor((dueDate.getTime() - startDate.getTime()) / 86400000);
                    const barWidth = Math.max(1, endOffset - startOffset) * dayWidth;
                    const barLeft = startOffset * dayWidth;
                    const statusColor = task.status === 'done' ? 'hsl(var(--success))' : task.status === 'in_progress' ? 'hsl(var(--info))' : task.status === 'on_hold' ? 'hsl(var(--warning))' : 'hsl(var(--primary))';

                    return (
                      <div key={task.id} className="h-10 border-b relative">
                        {/* Weekend bg */}
                        {dates.map((d, i) => {
                          if (d.getDay() === 0 || d.getDay() === 6) {
                            return <div key={i} className="absolute top-0 bottom-0 bg-muted/40" style={{ left: i * dayWidth, width: dayWidth }} />;
                          }
                          return null;
                        })}
                        {/* Today line */}
                        {todayOffset >= 0 && todayOffset < totalDays && (
                          <div className="absolute top-0 bottom-0 w-px bg-primary/50" style={{ left: todayOffset * dayWidth + dayWidth / 2 }} />
                        )}
                        {/* Bar */}
                        <div
                          className="absolute top-2 h-6 rounded-md flex items-center px-2 text-[10px] text-white font-medium"
                          style={{ left: barLeft, width: barWidth, backgroundColor: statusColor, minWidth: 20 }}
                          title={`${task.title} — ${task.status}`}
                        >
                          <span className="truncate">{barWidth > 60 ? task.title : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
