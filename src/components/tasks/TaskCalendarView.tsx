import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_CONFIG, TASK_STATUS_CONFIG } from '@/lib/constants';
import { format, parseISO } from 'date-fns';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
}

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.due_date) {
        const key = t.due_date;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const datesWithTasks = useMemo(() => {
    return Object.keys(tasksByDate).map((d) => parseISO(d));
  }, [tasksByDate]);

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const dayTasks = selectedKey ? (tasksByDate[selectedKey] || []) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
      <Card className="p-2 card-shadow w-fit">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ hasTasks: datesWithTasks }}
          modifiersClassNames={{ hasTasks: 'bg-primary/10 font-bold text-primary' }}
        />
      </Card>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Select a date'}
        </h3>
        {dayTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks due on this date.</p>
        ) : (
          dayTasks.map((task) => (
            <Card key={task.id} className="p-3 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer" onClick={() => onTaskClick(task)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{task.title}</p>
                <div className="flex gap-1.5">
                  <Badge className={PRIORITY_CONFIG[task.priority || 'medium']?.color + ' text-[10px]'}>{task.priority}</Badge>
                  <Badge className={TASK_STATUS_CONFIG[task.status || 'todo']?.color + ' text-[10px]'}>{TASK_STATUS_CONFIG[task.status || 'todo']?.label}</Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
