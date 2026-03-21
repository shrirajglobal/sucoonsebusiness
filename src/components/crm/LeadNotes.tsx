import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, MessageSquare, Mail, Users, StickyNote, Loader2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import VoiceNoteRecorder from '@/components/shared/VoiceNoteRecorder';
import VoiceNotePlayer from '@/components/shared/VoiceNotePlayer';

const NOTE_TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'note', label: 'Note', icon: StickyNote },
];

const NOTE_TYPE_COLORS: Record<string, string> = {
  call: 'bg-info/10 text-info',
  whatsapp: 'bg-success/10 text-success',
  email: 'bg-primary/10 text-primary',
  meeting: 'bg-warning/10 text-warning',
  note: 'bg-muted text-muted-foreground',
};

function useLeadNotes(leadId?: string) {
  return useQuery({
    queryKey: ['lead_notes', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_notes' as any)
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!leadId,
  });
}

function useCreateLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { lead_id: string; content: string; note_type: string; created_by: string; user_name: string; voice_note_url?: string | null }) => {
      const { error } = await supabase.from('lead_notes' as any).insert(note);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['lead_notes', v.lead_id] });
    },
  });
}

function useDeleteLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lead_id }: { id: string; lead_id: string }) => {
      const { error } = await supabase.from('lead_notes' as any).delete().eq('id', id);
      if (error) throw error;
      return lead_id;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['lead_notes', v.lead_id] });
    },
  });
}

interface LeadNotesProps {
  leadId: string;
}

export default function LeadNotes({ leadId }: LeadNotesProps) {
  const { user } = useAuth();
  const { data: notes = [], isLoading } = useLeadNotes(leadId);
  const createNote = useCreateLeadNote();
  const deleteNote = useDeleteLeadNote();

  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [showForm, setShowForm] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState('');

  const handleAdd = async () => {
    if ((!content.trim() && !voiceUrl) || !user) return;
    try {
      await createNote.mutateAsync({
        lead_id: leadId,
        content: content.trim() || '🎤 Voice note',
        note_type: noteType,
        created_by: user.id,
        user_name: user.email || '',
        voice_note_url: voiceUrl || null,
      });
      setContent('');
      setNoteType('note');
      setVoiceUrl('');
      setShowForm(false);
      toast.success('Note added');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync({ id, lead_id: leadId });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Activity Notes ({notes.length})</h2>
        {!showForm && (
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3" /> Add Note
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-lg border bg-accent/20 space-y-2">
          <div className="flex gap-2 items-center">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <VoiceNoteRecorder onRecorded={setVoiceUrl} existingUrl={voiceUrl || undefined} bucketFolder={user?.id || 'general'} />
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened? E.g. Called, discussed pricing..."
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={createNote.isPending || (!content.trim() && !voiceUrl)} className="h-7 text-xs">
              {createNote.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setVoiceUrl(''); }} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No activity notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any) => {
            const typeConfig = NOTE_TYPES.find((t) => t.value === note.note_type);
            const Icon = typeConfig?.icon || StickyNote;
            return (
              <div key={note.id} className="flex gap-3 text-sm group">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.note}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px]">{typeConfig?.label || 'Note'}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {note.created_at ? format(new Date(note.created_at), 'dd MMM yyyy, hh:mm a') : ''}
                    </span>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  <p className="text-sm">{note.content}</p>
                  {note.voice_note_url && (
                    <div className="mt-1">
                      <VoiceNotePlayer url={note.voice_note_url} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
