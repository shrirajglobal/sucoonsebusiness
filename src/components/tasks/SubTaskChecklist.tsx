import { useState } from 'react';
import { useSubTasks, useCreateSubTask, useUpdateSubTask, useDeleteSubTask } from '@/hooks/useSupabaseData';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SubTaskChecklistProps {
  taskId: string;
}

export default function SubTaskChecklist({ taskId }: SubTaskChecklistProps) {
  const { data: subTasks = [], isLoading } = useSubTasks(taskId);
  const createSubTask = useCreateSubTask();
  const updateSubTask = useUpdateSubTask();
  const deleteSubTask = useDeleteSubTask();
  const [newTitle, setNewTitle] = useState('');

  const completed = subTasks.filter((s) => s.is_completed).length;
  const total = subTasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createSubTask.mutateAsync({ task_id: taskId, title: newTitle.trim(), sort_order: total });
    setNewTitle('');
  };

  const handleToggle = (sub: typeof subTasks[0]) => {
    updateSubTask.mutate({ id: sub.id, task_id: taskId, is_completed: !sub.is_completed });
  };

  if (isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Checklist {total > 0 && `(${completed}/${total})`}</p>
      </div>
      {total > 0 && <Progress value={progress} className="h-1.5" />}
      <div className="space-y-1">
        {subTasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 group">
            <Checkbox checked={sub.is_completed} onCheckedChange={() => handleToggle(sub)} />
            <span className={`text-sm flex-1 ${sub.is_completed ? 'line-through text-muted-foreground' : ''}`}>{sub.title}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteSubTask.mutate({ id: sub.id, task_id: taskId })}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add checklist item..."
          className="h-7 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleAdd} disabled={createSubTask.isPending}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
