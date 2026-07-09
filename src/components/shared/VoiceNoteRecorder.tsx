import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import VoiceNotePlayer from './VoiceNotePlayer';

interface VoiceNoteRecorderProps {
  onRecorded: (url: string) => void;
  existingUrl?: string;
  bucketFolder?: string;
}

export default function VoiceNoteRecorder({ onRecorded, existingUrl, bucketFolder = 'general' }: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setLocalUrl(URL.createObjectURL(blob));
        await uploadBlob(blob);
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const uploadBlob = async (blob: Blob) => {
    setUploading(true);
    try {
      const fileName = `${bucketFolder}/${Date.now()}.webm`;
      const { error } = await supabase.storage.from('voice-notes').upload(fileName, blob, { contentType: 'audio/webm' });
      if (error) throw error;
      // Long-lived signed URL — voice-notes bucket is private and scoped by RLS to the owner's folder.
      const { data: signed } = await supabase.storage.from('voice-notes').createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
      onRecorded(signed?.signedUrl ?? '');
      toast.success('Voice note saved');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const displayUrl = existingUrl || localUrl;

  return (
    <div className="flex items-center gap-2">
      {displayUrl && !recording && <VoiceNotePlayer url={displayUrl} />}
      {recording ? (
        <>
          <span className="text-xs text-destructive font-medium animate-pulse">● {formatTime(elapsed)}</span>
          <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={stopRecording}>
            <Square className="w-3 h-3" />
          </Button>
        </>
      ) : uploading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={startRecording} title="Record voice note">
          <Mic className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
