import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'What is my total revenue this month?',
  'How many tasks are overdue?',
  'Show me top 5 leads by value',
  'What is my inventory status?',
  'Summarize my business health',
];

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      const reply = data?.reply || data?.choices?.[0]?.message?.content || 'Sorry, I could not process that.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      console.error('Assistant error:', err);
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('Rate limit reached. Please try again in a moment.');
      } else if (err?.message?.includes('402') || err?.status === 402) {
        toast.error('AI credits exhausted. Please top up in workspace settings.');
      } else {
        toast.error('Failed to get response');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Business Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask anything about your business data</p>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Hello! I'm your business assistant.</h2>
                  <p className="text-sm text-muted-foreground mt-1">I can analyze your tasks, leads, finances, inventory and more.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map(s => (
                    <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => send(s)}>{s}</Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && send(input)}
            placeholder="Ask about your business..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
