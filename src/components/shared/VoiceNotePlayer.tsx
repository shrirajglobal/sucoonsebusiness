import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface VoiceNotePlayerProps {
  url: string;
}

export default function VoiceNotePlayer({ url }: VoiceNotePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={toggle} title={playing ? 'Pause' : 'Play voice note'}>
      {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
    </Button>
  );
}
