import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTask } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';

export default function AITaskCreator() {
  const { businessId, user } = useAuth();
  const createTask = useCreateTask();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!prompt.trim() || !businessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are a task parser. Given a plain-language task description, extract a structured task. Return ONLY valid JSON with these fields: title (string, concise), description (string or null), priority ("high"|"medium"|"low"), due_date (YYYY-MM-DD or null, relative to today ${new Date().toISOString().split('T')[0]}). No markdown, no explanation.`
            },
            { role: 'user', content: prompt }
          ]
        }
      });
      if (error) throw error;
      const text = typeof data === 'string' ? data : data?.reply || data?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      await createTask.mutateAsync({
        business_id: businessId,
        title: parsed.title || prompt,
        description: parsed.description || null,
        priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
        status: 'todo',
        due_date: parsed.due_date || null,
        created_by: user?.id,
      });
      toast.success(`Task created: ${parsed.title}`);
      setPrompt('');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Sparkles className="w-4 h-4" /> AI Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Task with AI</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Describe the task in plain language. AI will extract the title, priority, and due date.</p>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "Call Ramesh tomorrow about the quotation — high priority"'
            rows={3}
          />
          <Button onClick={handleCreate} className="w-full" disabled={loading || !prompt.trim()}>
            {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
