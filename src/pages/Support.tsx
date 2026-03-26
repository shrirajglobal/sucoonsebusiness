import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LifeBuoy, Plus, ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-warning/10 text-warning',
  in_progress: 'bg-info/10 text-info',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
};

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug / Issue' },
  { value: 'feature', label: '💡 Feature Request' },
  { value: 'billing', label: '💳 Billing' },
  { value: 'general', label: '💬 General Help' },
];

export default function Support() {
  const { user, profile, businessId } = useAuth();
  const qc = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [newMessage, setNewMessage] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['ticket_messages', selectedTicket],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTicket,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('support_tickets').insert({
        business_id: businessId!,
        user_id: user!.id,
        user_name: profile?.full_name || '',
        subject,
        description,
        category,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      setShowNew(false);
      setSubject('');
      setDescription('');
      setCategory('general');
      toast.success('Ticket created! We\'ll get back to you soon.');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket!,
        sender_type: 'user',
        sender_name: profile?.full_name || '',
        content: newMessage,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket_messages'] });
      setNewMessage('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activeTicket = tickets.find(t => t.id === selectedTicket);

  if (selectedTicket && activeTicket) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-4 animate-in-up">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Tickets
          </Button>

          <Card className="p-5 card-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold">{activeTicket.subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CATEGORIES.find(c => c.value === activeTicket.category)?.label} · Created {new Date(activeTicket.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <Badge className={STATUS_COLORS[activeTicket.status]}>{activeTicket.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{activeTicket.description}</p>
          </Card>

          <Card className="p-5 card-shadow">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" /> Conversation
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Our team will reply here soon.</p>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    m.sender_type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-accent text-accent-foreground rounded-bl-md'
                  }`}>
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.sender_name || (m.sender_type === 'admin' ? 'Disha Team' : 'You')}</p>
                    <p>{m.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {activeTicket.status !== 'closed' && (
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={e => e.key === 'Enter' && newMessage.trim() && sendMessage.mutate()}
                />
                <Button size="icon" onClick={() => newMessage.trim() && sendMessage.mutate()} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-primary" /> Support
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Need help? Raise a ticket and we'll assist you.</p>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Raise a Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue" className="mt-1" maxLength={200} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail..." className="mt-1" rows={4} maxLength={2000} />
                </div>
                <Button className="w-full" onClick={() => createTicket.mutate()} disabled={!subject.trim() || !description.trim() || createTicket.isPending}>
                  {createTicket.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Submit Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : tickets.length === 0 ? (
          <Card className="p-10 text-center card-shadow">
            <LifeBuoy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tickets yet. Click "New Ticket" if you need help.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <Card
                key={t.id}
                className="p-4 card-shadow cursor-pointer hover:card-shadow-hover transition-shadow"
                onClick={() => setSelectedTicket(t.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORIES.find(c => c.value === t.category)?.label} · {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLORS[t.status]} text-[10px] shrink-0 ml-2`}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
