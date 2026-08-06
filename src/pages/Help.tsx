import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, Search, LifeBuoy, Lightbulb, PlayCircle, BookOpen, Rocket, CheckCircle, ArrowRight } from 'lucide-react';

const GETTING_STARTED = [
  { step: 1, title: 'Set Up Your Business', desc: 'After signing up, complete the onboarding wizard. Choose your industry type and Suvee auto-configures your pipeline, task types, and modules.', icon: Rocket, done: true },
  { step: 2, title: 'Add Your Team', desc: 'Go to Settings → Team & Roles. Add team members and assign roles (Admin, Manager, Executive, Field Staff) to control what they can access.', icon: BookOpen },
  { step: 3, title: 'Capture Your First Lead', desc: 'Head to CRM and click "+ Add Lead". Enter the inquiry details, source, and estimated deal value. Suvee will track it through your pipeline.', icon: BookOpen },
  { step: 4, title: 'Create Tasks', desc: 'Go to Tasks and create your first task. Set priority, due date, and assign to yourself or a team member. Use voice notes for quick capture!', icon: BookOpen },
  { step: 5, title: 'Capture Ideas', desc: 'Visit the Idea Board and jot down business ideas with voice notes. Pin important ones and convert them to tasks when ready to act.', icon: BookOpen },
  { step: 6, title: 'Scan a Visiting Card', desc: 'Open Card Scanner, snap a photo of any visiting card. AI extracts name, phone, email & company — saved as a contact instantly.', icon: BookOpen },
  { step: 7, title: 'Invite & Earn', desc: 'Share your referral link from Settings → Referral. When a friend signs up, you get 30 extra free days!', icon: BookOpen },
];

const FAQ_SECTIONS = [
  {
    title: 'Dashboard',
    emoji: '📊',
    faqs: [
      { q: 'What does the Dashboard show?', a: 'Your Dashboard shows KPIs like tasks due today, new leads, team attendance, and pipeline value — all in one glance. Think of it as your daily business snapshot.' },
      { q: 'How is Pipeline Value calculated?', a: 'Pipeline Value sums up the estimated value (₹) of all active leads in your CRM. It helps you understand potential revenue at a glance.' },
      { q: 'Can I customise the Dashboard?', a: 'The Dashboard auto-adapts based on your enabled modules. More customisation options like widgets and KPI selection are coming soon!' },
    ],
  },
  {
    title: 'Tasks',
    emoji: '✅',
    faqs: [
      { q: 'How do I create a task?', a: 'Click the "+ Add Task" button on the Tasks page. You can set title, priority, due date & time, assign to team members, and even record voice notes for descriptions.' },
      { q: 'What are Sub-Tasks?', a: 'Sub-tasks let you break a main task into smaller checkpoints. Open any task and add sub-tasks in the checklist section. Great for project planning!' },
      { q: 'How does the AI Task Creator work?', a: 'The AI Task Creator uses AI to understand your voice or text input and automatically creates structured tasks with smart priorities and due dates.' },
      { q: 'Can I set recurring tasks?', a: 'Yes! When creating a task, enable the recurrence option and choose daily, weekly, or monthly. Perfect for routine activities like follow-ups or reports.' },
      { q: 'What does "Looped In" mean?', a: 'When you\'re added as a watcher on someone else\'s task, it appears in your "Looped In" tab. You can track progress without owning the task.' },
      { q: 'How do overdue tasks work?', a: 'Tasks past their due date get a red highlight so they stand out. Use the "Overdue" quick filter chip to see all of them at once.' },
    ],
  },
  {
    title: 'CRM & Leads',
    emoji: '🤝',
    faqs: [
      { q: 'How do I add a new lead?', a: 'Go to CRM and click "+ Add Lead". Enter the contact details, source (IndiaMART, Referral, JustDial, etc.), and estimated value. The lead enters your pipeline.' },
      { q: 'What are Pipeline Stages?', a: 'Pipeline stages track a lead\'s journey from first contact to closing. You can customise stages in Settings → Pipeline. Common stages: Inquiry → Quoted → Negotiation → Won.' },
      { q: 'Can I add notes to leads?', a: 'Yes! Open any lead and use the Notes section. You can add text notes, voice notes, or mark them as meetings/calls for activity tracking.' },
      { q: 'How do I track follow-ups?', a: 'When adding or editing a lead, set a "Next Follow-up" date. Suvee will show these in your dashboard so you never miss one.' },
    ],
  },
  {
    title: 'Idea Board',
    emoji: '💡',
    faqs: [
      { q: 'What is the Idea Board?', a: 'A quick-capture board for business ideas, improvements, and plans. Jot down ideas anytime — think of it as your digital whiteboard for brainstorming.' },
      { q: 'Can I convert an idea to a task?', a: 'Yes! Open any idea and click "Convert to Task" to create a task with the idea details pre-filled. Great for moving from planning to execution.' },
      { q: 'What does pinning do?', a: 'Pinned ideas always appear at the top of the list so you never lose sight of your most important ideas.' },
      { q: 'Can I add voice notes to ideas?', a: 'Yes! Use the microphone button when creating an idea to record your thoughts. Perfect for capturing ideas on the go.' },
    ],
  },
  {
    title: 'Contacts & Card Scanner',
    emoji: '📇',
    faqs: [
      { q: 'How do I add contacts?', a: 'Go to Contacts and click "+ Add Contact". Or use the Card Scanner to capture contacts from visiting cards automatically!' },
      { q: 'How does Card Scanner work?', a: 'Take a photo of a visiting card. Our AI extracts the name, phone, email, company, and designation automatically. Review and save — done in seconds!' },
      { q: 'Can I import contacts from Excel?', a: 'Yes! Use the CSV Import option in Settings to bulk-import contacts from an Excel/CSV file. Map your columns and import in one click.' },
      { q: 'Can I tag contacts?', a: 'Yes! Add tags like "Vendor", "Client", "Partner" to organize your contacts. You can search and filter by tags.' },
    ],
  },
  {
    title: 'Support & Tickets',
    emoji: '🎧',
    faqs: [
      { q: 'How do I raise a support ticket?', a: 'Go to Support and click "New Ticket". Choose a category (Bug, Feature Request, Billing, or General), describe your issue, and set the priority. Our team typically responds within 24 hours.' },
      { q: 'Can I track my ticket status?', a: 'Yes! All your tickets appear in the Support page with real-time status updates — Open, In Progress, or Resolved. You can also add follow-up messages.' },
      { q: 'What priority levels are available?', a: 'You can set Low, Medium, or High priority. High-priority tickets (like login issues or data concerns) are handled first.' },
    ],
  },
  {
    title: 'Referral Program',
    emoji: '🎁',
    faqs: [
      { q: 'How does the referral program work?', a: 'Go to Settings → Referral to find your unique referral link. Share it with friends. When someone signs up using your link and creates their business, you get 30 extra free days added to your account.' },
      { q: 'Is there a limit to referrals?', a: 'No limit! Invite as many friends as you want. Each successful signup gives you 30 more free days. Invite 3 friends = 90 extra days.' },
      { q: 'How do I track my referrals?', a: 'Your referral status and earned days are shown in Settings → Referral. You can see pending and completed referrals.' },
    ],
  },
  {
    title: 'Account & Settings',
    emoji: '⚙️',
    faqs: [
      { q: 'How do I add team members?', a: 'Go to Settings → Team & Roles. Click "Add Member" to add your team. You can assign roles to control access levels.' },
      { q: 'What roles are available?', a: 'Owner (full access), Admin (manage everything except billing), Manager (manage tasks & leads), Executive (view & create), and Field Staff (limited access).' },
      { q: 'How do I change my business logo?', a: 'Go to Settings → Workspace and click on the logo area to upload your business logo (PNG/JPG, max 2MB).' },
    ],
  },
  {
    title: 'Billing & Subscription',
    emoji: '💰',
    faqs: [
      { q: 'Is Suvee free during pre-launch?', a: 'Yes! Every new account gets a 90-day free trial of our Growth tier — full CRM, unlimited Card Scanner, team & roles, and Support Centre. No credit card needed.' },
      { q: 'What happens after 90 days?', a: 'You pick the plan that fits: Starter (Free, 1 user — Tasks, Ideas, Contacts, 20 Card Scans/mo), Growth (₹799/mo billed annually, up to 10 users — full CRM + Support), or Scale (₹1,999/mo billed annually, unlimited users — adds Finance, Inventory, Attendance, Compliance, AI Assistant, Branches). All prices exclude 18% GST.' },
      { q: 'How do I get extra free days?', a: 'Invite friends using your referral link! Each successful referral gives you 30 extra free days. There\'s no limit!' },
    ],
  },
];

const VIDEO_TUTORIALS = [
  { title: 'Getting Started with Suvee', duration: '3 min', module: 'Setup' },
  { title: 'Managing Tasks Like a Pro', duration: '5 min', module: 'Tasks' },
  { title: 'CRM: From Lead to Customer', duration: '4 min', module: 'CRM' },
  { title: 'Idea Board — Capture & Convert', duration: '2 min', module: 'Ideas' },
  { title: 'Card Scanner — Save Contacts Instantly', duration: '2 min', module: 'Contacts' },
  { title: 'Settings & Team Management', duration: '3 min', module: 'Settings' },
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
          <p className="text-sm text-muted-foreground mt-0.5">Learn how to get the most out of Suvee for your business.</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for help... e.g. 'add lead', 'task', 'referral'"
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="guide">
          <TabsList className="w-full">
            <TabsTrigger value="guide" className="flex-1"><Rocket className="w-3.5 h-3.5 mr-1" /> Get Started</TabsTrigger>
            <TabsTrigger value="faq" className="flex-1"><BookOpen className="w-3.5 h-3.5 mr-1" /> FAQs</TabsTrigger>
            <TabsTrigger value="videos" className="flex-1"><PlayCircle className="w-3.5 h-3.5 mr-1" /> Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Follow these steps to set up Suvee for your business:</p>
            {GETTING_STARTED.map((step) => (
              <Card key={step.step} className="p-4 card-shadow flex gap-4 items-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  step.done ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary'
                }`}>
                  {step.done ? <CheckCircle className="w-4 h-4" /> : step.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="faq" className="space-y-4 mt-4">
            {filtered.length === 0 ? (
              <Card className="p-8 text-center card-shadow">
                <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No results found. Try a different search or raise a support ticket.</p>
              </Card>
            ) : (
              filtered.map(section => (
                <Card key={section.title} className="p-5 card-shadow">
                  <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>{section.emoji}</span> {section.title}
                    <Badge variant="outline" className="text-[9px] ml-auto">{section.faqs.length} questions</Badge>
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
              ))
            )}
          </TabsContent>

          <TabsContent value="videos" className="space-y-3 mt-4">
            <Card className="p-4 bg-primary/5 border-primary/20 card-shadow">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <PlayCircle className="w-4 h-4" /> Video tutorials coming soon!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We're recording step-by-step video guides. Stay tuned — they'll appear here automatically.
              </p>
            </Card>
            <div className="grid gap-2">
              {VIDEO_TUTORIALS.map((v, i) => (
                <Card key={i} className="p-4 card-shadow opacity-60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <PlayCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{v.module} · {v.duration}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">Soon</Badge>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="p-5 card-shadow text-center bg-primary/5 border-primary/20">
          <LifeBuoy className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Still need help?</p>
          <p className="text-xs text-muted-foreground mb-3">Our team is here to assist you. Typically responds within 24 hours.</p>
          <Link to="/support">
            <Button size="sm">
              Raise a Support Ticket <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
