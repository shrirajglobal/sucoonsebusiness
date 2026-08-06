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
import { LifeBuoy, Plus, ArrowLeft, Send, Loader2, MessageCircle, Phone, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-warning/10 text-warning',
  in_progress: 'bg-primary/10 text-primary',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  open: '🟡 Open',
  in_progress: '🔵 In Progress',
  resolved: '✅ Resolved',
  closed: '⚫ Closed',
};

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug / Issue', desc: 'Something is not working' },
  { value: 'feature', label: '💡 Feature Request', desc: 'Suggest a new feature' },
  { value: 'billing', label: '💳 Billing', desc: 'Payment or subscription queries' },
  { value: 'general', label: '💬 General Help', desc: 'Any other question' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'bg-warning/10 text-warning' },
  { value: 'high', label: 'High', color: 'bg-destructive/10 text-destructive' },
  { value: 'urgent', label: 'Urgent 🔥', color: 'bg-destructive text-destructive-foreground' },
];

function TicketForm({ onSubmit, loading }: { onSubmit: (data: { subject: string; description: string; category: string; priority: string; screenshotUrl?: string }) => void; loading: boolean }) {
  const { businessId } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return;
    let screenshotUrl: string | undefined;

    if (screenshot && businessId) {
      setUploading(true);
      const ext = screenshot.name.split('.').pop();
      const path = `${businessId}/ticket-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, screenshot);
      if (!error) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
      setUploading(false);
    }

    onSubmit({ subject, description, category, priority, screenshotUrl });
  };

  return (
    <div className="space-y-4">
      {/* Category Cards */}
      <div>
        <Label className="text-xs font-medium">What's this about?</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-left p-3 rounded-lg border transition-all text-sm ${
                category === c.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <p className="font-medium">{c.label}</p>
              <p className="text-[10px] text-muted-foreground">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Subject *</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue" className="mt-1" maxLength={200} />
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail... What were you doing? What happened?" className="mt-1" rows={4} maxLength={2000} />
      </div>

      <div>
        <Label className="text-xs font-medium">Priority</Label>
        <div className="flex gap-2 mt-1.5">
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                priority === p.value
                  ? `${p.color} ring-1 ring-offset-1 ring-current`
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Screenshot */}
      <div>
        <Label className="text-xs font-medium">Screenshot (optional)</Label>
        {screenshotPreview ? (
          <div className="mt-2 relative inline-block">
            <img src={screenshotPreview} alt="Screenshot" className="h-24 rounded-lg border border-border" />
            <button
              onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-accent/50 transition-colors">
            <Image className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Attach a screenshot</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
          </label>
        )}
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={!subject.trim() || !description.trim() || loading || uploading}>
        {(loading || uploading) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {uploading ? 'Uploading...' : 'Submit Ticket'}
      </Button>
    </div>
  );
}

function QuickContact() {
  const whatsappMsg = encodeURIComponent('Hi, I need help with the Suvee app. Can you assist?');
  return (
    <Card className="p-4 bg-accent/30 border-accent">
      <p className="text-sm font-medium mb-2">⚡ Quick Help</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
          <a href={`https://wa.me/919999999999?text=${whatsappMsg}`} target="_blank" rel="noreferrer">
            <Phone className="w-3.5 h-3.5 mr-1" /> WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
          <a href="mailto:support@REPLACE-ME.in">
            ✉️ Email Us
          </a>
        </Button>
      </div>
    </Card>
  );
}

export default function Support() {
  const { user, profile, businessId } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
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
    mutationFn: async (formData: { subject: string; description: string; category: string; priority: string; screenshotUrl?: string }) => {
      const desc = formData.screenshotUrl
        ? `${formData.description}\n\n📎 Screenshot: ${formData.screenshotUrl}`
        : formData.description;

      const { error } = await supabase.from('support_tickets').insert({
        business_id: businessId!,
        user_id: user!.id,
        user_name: profile?.full_name || '',
        subject: formData.subject,
        description: desc,
        category: formData.category,
        priority: formData.priority,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      setShowNew(false);
      toast.success('Ticket created! We\'ll get back to you soon. 🙏');
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

  // Ticket detail view
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
                  {CATEGORIES.find(c => c.value === activeTicket.category)?.label} · {activeTicket.priority} priority · {new Date(activeTicket.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <Badge className={STATUS_COLORS[activeTicket.status]}>
                {STATUS_LABELS[activeTicket.status] || activeTicket.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeTicket.description}</p>
          </Card>

          <Card className="p-5 card-shadow">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" /> Conversation
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                  <p className="text-xs text-muted-foreground">Our team will reply here soon. Typically within 24 hours.</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    m.sender_type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-accent text-accent-foreground rounded-bl-md'
                  }`}>
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                      {m.sender_type === 'admin' ? '🛡️ Suvee Team' : 'You'}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className="text-[9px] opacity-50 mt-1 text-right">
                      {new Date(m.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={e => e.key === 'Enter' && newMessage.trim() && sendMessage.mutate()}
                />
                <Button size="icon" onClick={() => newMessage.trim() && sendMessage.mutate()} disabled={!newMessage.trim() || sendMessage.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {(activeTicket.status === 'resolved' || activeTicket.status === 'closed') && (
              <div className="text-center py-3 text-xs text-muted-foreground bg-muted/50 rounded-lg">
                ✅ This ticket has been {activeTicket.status}. Need more help? Create a new ticket.
              </div>
            )}
          </Card>
        </div>
      </AppLayout>
    );
  }

  // New ticket dialog/drawer content
  const newTicketContent = (
    <TicketForm
      onSubmit={(data) => createTicket.mutate(data)}
      loading={createTicket.isPending}
    />
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5 animate-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-primary" /> Support
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Need help? We're here for you. 🙏</p>
          </div>

          {isMobile ? (
            <Drawer open={showNew} onOpenChange={setShowNew}>
              <DrawerTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
              </DrawerTrigger>
              <DrawerContent className="px-4 pb-6 max-h-[90vh] overflow-y-auto">
                <DrawerHeader className="px-0">
                  <DrawerTitle>Raise a Support Ticket</DrawerTitle>
                </DrawerHeader>
                {newTicketContent}
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Raise a Support Ticket</DialogTitle>
                </DialogHeader>
                {newTicketContent}
              </DialogContent>
            </Dialog>
          )}
        </div>

        <QuickContact />

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : tickets.length === 0 ? (
          <Card className="p-10 text-center card-shadow">
            <LifeBuoy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No tickets yet</p>
            <p className="text-xs text-muted-foreground mb-4">Click "New Ticket" if you face any issue. We'll resolve it quickly!</p>
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create Your First Ticket
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <Card
                key={t.id}
                className="p-4 card-shadow cursor-pointer hover:card-shadow-hover transition-all hover:scale-[1.005]"
                onClick={() => setSelectedTicket(t.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{CATEGORIES.find(c => c.value === t.category)?.label}</span>
                      <span>·</span>
                      <span>{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {t.priority === 'high' || t.priority === 'urgent' ? (
                      <Badge variant="destructive" className="text-[9px] px-1.5 h-4">{t.priority}</Badge>
                    ) : null}
                    <Badge className={`${STATUS_COLORS[t.status]} text-[10px]`}>
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
