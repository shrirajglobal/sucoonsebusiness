import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import VoiceNoteRecorder from '@/components/shared/VoiceNoteRecorder';
import VoiceNotePlayer from '@/components/shared/VoiceNotePlayer';

interface TaskNotesProps {
  taskId: string;
}

export default function TaskNotes({ taskId }: TaskNotesProps) {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['task_notes', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_notes')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });

  const addNote = useMutation({
    mutationFn: async ({ text, voice }: { text: string; voice: string }) => {
      const { error } = await supabase.from('task_notes').insert({
        task_id: taskId,
        content: text || '🎤 Voice note',
        created_by: user!.id,
        user_name: business?.owner_name || user?.email || '',
        voice_note_url: voice || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_notes', taskId] });
      setContent('');
      setVoiceUrl('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_notes', taskId] }),
  });

  const handleSubmit = () => {
    if (!content.trim() && !voiceUrl) return;
    addNote.mutate({ text: content.trim(), voice: voiceUrl });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes & Updates</p>
      
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      
      {notes.length > 0 && (
        <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs group">
              <div className="flex-1 min-w-0">
                <p className="text-foreground">{n.content}</p>
                {(n as any).voice_note_url && <VoiceNotePlayer url={(n as any).voice_note_url} />}
                <p className="text-muted-foreground mt-0.5">
                  {n.user_name} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {n.created_by === user?.id && (
                <button
                  onClick={() => deleteNote.mutate(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 items-center">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a quick note..."
          className="text-xs h-8"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <VoiceNoteRecorder onRecorded={setVoiceUrl} existingUrl={voiceUrl || undefined} bucketFolder={user?.id || 'general'} />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSubmit} disabled={addNote.isPending || (!content.trim() && !voiceUrl)}>
          {addNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}
