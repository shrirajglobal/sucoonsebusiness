import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Search, LifeBuoy, Lightbulb } from 'lucide-react';

const FAQ_SECTIONS = [
  {
    title: 'Dashboard',
    emoji: '📊',
    faqs: [
      { q: 'What does the Dashboard show?', a: 'Your Dashboard shows KPIs like tasks due today, new leads, team attendance, and pipeline value — all in one glance.' },
      { q: 'How is Pipeline Value calculated?', a: 'Pipeline Value sums up the estimated value (₹) of all active leads in your CRM.' },
      { q: 'Can I customise the Dashboard?', a: 'The Dashboard auto-adapts based on your enabled modules. More customisation options are coming soon!' },
    ],
  },
  {
    title: 'Tasks',
    emoji: '✅',
    faqs: [
      { q: 'How do I create a task?', a: 'Click the "+ Add Task" button on the Tasks page. You can set title, priority, due date, assign to team members, and even add voice notes.' },
      { q: 'What are Sub-Tasks?', a: 'Sub-tasks let you break a main task into smaller checkpoints. Open any task and add sub-tasks in the checklist section.' },
      { q: 'How does the AI Task Creator work?', a: 'The AI Task Creator uses AI to understand your voice/text input and automatically creates structured tasks with priorities and due dates.' },
      { q: 'Can I set recurring tasks?', a: 'Yes! When creating a task, enable the recurrence option and choose daily, weekly, or monthly.' },
    ],
  },
  {
    title: 'CRM & Leads',
    emoji: '🤝',
    faqs: [
      { q: 'How do I add a new lead?', a: 'Go to CRM and click "+ Add Lead". Enter the contact details, source (IndiaMART, Referral, etc.), and estimated value.' },
      { q: 'What are Pipeline Stages?', a: 'Pipeline stages track a lead\'s journey from first contact to closing. You can customise stages in Settings → Pipeline.' },
      { q: 'How does lead scoring work?', a: 'Leads are scored based on activity (notes, follow-ups) and value. Hot leads appear at the top for quick action.' },
    ],
  },
  {
    title: 'Idea Board',
    emoji: '💡',
    faqs: [
      { q: 'What is the Idea Board?', a: 'A quick-capture board for business ideas, improvements, and plans. Think of it as your digital whiteboard.' },
      { q: 'Can I convert an idea to a task?', a: 'Yes! Open any idea and click "Convert to Task" to create a task with the idea details pre-filled.' },
      { q: 'What does pinning do?', a: 'Pinned ideas appear at the top of the list so you never lose sight of your most important ideas.' },
    ],
  },
  {
    title: 'Contacts & Card Scanner',
    emoji: '📇',
    faqs: [
      { q: 'How do I add contacts?', a: 'Go to Contacts and click "+ Add Contact". You can also scan business cards using the Card Scanner.' },
      { q: 'How does Card Scanner work?', a: 'Take a photo of a visiting card. Our AI extracts the name, phone, email, company, and designation automatically.' },
      { q: 'Can I import contacts from Excel?', a: 'Yes! Use the CSV Import option in Settings to bulk-import contacts from an Excel/CSV file.' },
    ],
  },
  {
    title: 'Account & Settings',
    emoji: '⚙️',
    faqs: [
      { q: 'How do I add team members?', a: 'Go to Settings → Team & Roles. Click "Add Member" to add your team. You can assign roles to control access.' },
      { q: 'What roles are available?', a: 'Owner, Admin, Manager, Executive, and Field Staff — each with different access levels.' },
      { q: 'How do I change my business logo?', a: 'Go to Settings → Workspace and upload your logo (PNG/JPG, max 2MB).' },
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState('');
  const filtered = FAQ_SECTIONS.map(section => ({
    ...section,
    faqs: section.faqs.filter(f =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.faqs.length > 0);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in-up">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> Help Centre
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find answers to common questions about Disha.</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for help..."
            className="pl-10"
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center card-shadow">
            <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No results found. Try a different search or raise a support ticket.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(section => (
              <Card key={section.title} className="p-5 card-shadow">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span>{section.emoji}</span> {section.title}
                </h2>
                <Accordion type="single" collapsible className="space-y-1">
                  {section.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`} className="border border-border rounded-lg px-3">
                      <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-3">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-5 card-shadow text-center bg-primary/5 border-primary/20">
          <LifeBuoy className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Still need help?</p>
          <p className="text-xs text-muted-foreground mb-3">Our team is here to assist you.</p>
          <Link to="/support">
            <Button size="sm">Raise a Support Ticket</Button>
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
