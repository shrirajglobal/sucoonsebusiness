import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Loader2, Mic, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTask } from '@/hooks/useSupabaseData';
import { useBusiness, useTeamMembers } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';

export default function AITaskCreator() {
  const { businessId, user } = useAuth();
  const createTask = useCreateTask();
  const { data: business } = useBusiness();
  const { data: teamMembers } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(blob);
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopVoiceRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const { data, error } = await supabase.functions.invoke('voice-transcribe', { body: formData });
      if (error) throw error;
      const text = data?.text || '';
      if (text) {
        setPrompt(prev => prev ? `${prev} ${text}` : text);
        toast.success('Voice transcribed!');
      } else {
        toast.error('Could not transcribe audio');
      }
    } catch (err: any) {
      toast.error(err.message || 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  const handleCreate = async () => {
    if (!prompt.trim() || !businessId) return;
    setLoading(true);
    try {
      const taskTypes = business?.task_types?.join(', ') || 'General';
      const memberNames = teamMembers?.map(m => m.name).join(', ') || '';

      const systemPrompt = `You are a task parser. Given a plain-language task description, extract a structured task. Return ONLY valid JSON with these fields:
- title (string, concise)
- description (string or null)
- priority ("high"|"medium"|"low")
- due_date (YYYY-MM-DD or null, relative to today ${new Date().toISOString().split('T')[0]})
- due_time (HH:MM 24h format or null)
- task_type (one of: ${taskTypes}, or null if unclear)
- recurrence (object with "type": "none"|"daily"|"weekly"|"monthly"|"custom" and optional "interval": number for custom, or null if not recurring)
- assigned_to_name (string matching one of these team members: ${memberNames || 'none available'}, or null if not mentioned)
No markdown, no explanation. Only valid JSON.`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        }
      });
      if (error) throw error;
      const text = typeof data === 'string' ? data : data?.reply || data?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);

      let assignedTo: string | null = null;
      if (parsed.assigned_to_name && teamMembers?.length) {
        const match = teamMembers.find(m =>
          m.name.toLowerCase() === parsed.assigned_to_name.toLowerCase()
        ) || teamMembers.find(m =>
          m.name.toLowerCase().includes(parsed.assigned_to_name.toLowerCase()) ||
          parsed.assigned_to_name.toLowerCase().includes(m.name.toLowerCase())
        );
        if (match) assignedTo = match.id;
      }

      let recurrence = null;
      if (parsed.recurrence && parsed.recurrence.type && parsed.recurrence.type !== 'none') {
        recurrence = parsed.recurrence;
      }

      await createTask.mutateAsync({
        business_id: businessId,
        title: parsed.title || prompt,
        description: parsed.description || null,
        priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
        status: 'todo',
        due_date: parsed.due_date || null,
        due_time: parsed.due_time || null,
        task_type: parsed.task_type || null,
        recurrence: recurrence,
        assigned_to: assignedTo,
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
          <p className="text-sm text-muted-foreground">Describe the task in plain language or use voice. AI will extract title, priority, due date, recurrence, type, and assignee.</p>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "Call Minu for coffee every month — high priority, assign to Rahul"'
            rows={3}
          />
          <div className="flex gap-2">
            {recording ? (
              <Button type="button" variant="destructive" size="sm" className="gap-1" onClick={stopVoiceRecording}>
                <Square className="w-3.5 h-3.5" /> Stop Recording
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={startVoiceRecording} disabled={transcribing}>
                {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                {transcribing ? 'Transcribing...' : 'Voice'}
              </Button>
            )}
            <Button onClick={handleCreate} className="flex-1" disabled={loading || !prompt.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
