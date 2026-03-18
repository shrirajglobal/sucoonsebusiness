import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { BUSINESS_TYPES, ALL_MODULES, DEFAULT_MODULES, DEFAULT_TIER_SETTINGS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { BusinessType, TeamMember } from '@/types';
import { ArrowLeft, ArrowRight, Check, Building2, Users, Blocks, Sparkles } from 'lucide-react';

const STEPS = [
  { icon: Building2, title: 'Business Identity', subtitle: 'Tell us about your business' },
  { icon: Blocks, title: 'Business Type', subtitle: 'We\'ll auto-configure your setup' },
  { icon: Users, title: 'Your Team', subtitle: 'Add team members (optional)' },
  { icon: Sparkles, title: 'Modules', subtitle: 'Choose what you need' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateDemoData(stages: string[], taskTypes: string[]) {
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const tasks = [
    { id: generateId(), title: 'Follow up with new inquiry', priority: 'high' as const, status: 'todo' as const, dueDate: tomorrow, taskType: taskTypes[0], createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Prepare quotation for client', priority: 'medium' as const, status: 'in_progress' as const, dueDate: nextWeek, taskType: taskTypes[1], createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Review pending orders', priority: 'low' as const, status: 'todo' as const, dueDate: nextWeek, taskType: taskTypes[2] || taskTypes[0], createdAt: now, updatedAt: now },
  ];

  const leads = [
    { id: generateId(), name: 'Rajesh Patel', company: 'Patel Industries', phone: '9876543210', value: 150000, source: 'IndiaMART', stage: stages[0], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Sunita Sharma', company: 'Sharma Enterprises', phone: '9876543211', value: 85000, source: 'Referral', stage: stages[1], createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Amit Kumar', company: 'Kumar Trading', phone: '9876543212', value: 220000, source: 'Website', stage: stages[2], createdAt: now, updatedAt: now },
  ];

  const customers = [
    { id: generateId(), name: 'Vikram Singh', company: 'Singh Manufacturing', phone: '9876543213', tier: 'A' as const, lastContactDate: new Date(Date.now() - 10 * 86400000).toISOString(), lastContactType: 'call', lifetimeValue: 500000, createdAt: now },
    { id: generateId(), name: 'Priya Gupta', company: 'Gupta Traders', phone: '9876543214', tier: 'B' as const, lastContactDate: new Date(Date.now() - 35 * 86400000).toISOString(), lastContactType: 'whatsapp', lifetimeValue: 120000, createdAt: now },
    { id: generateId(), name: 'Mohit Jain', company: 'Jain & Co', phone: '9876543215', tier: 'C' as const, lifetimeValue: 45000, createdAt: now },
  ];

  return { tasks, leads, customers };
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { setupBusiness, addTask, addLead, addCustomer, addTeamMember } = useAppStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [members, setMembers] = useState<{ name: string; role: string }[]>([]);
  const [memberName, setMemberName] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>(DEFAULT_MODULES);

  const canProceed = step === 0 ? name && ownerName : step === 1 ? !!selectedType : true;
  const typeConfig = BUSINESS_TYPES.find((t) => t.id === selectedType);

  const toggleModule = (id: string) => {
    setEnabledModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const addMember = () => {
    if (memberName.trim()) {
      setMembers((prev) => [...prev, { name: memberName.trim(), role: 'executive' }]);
      setMemberName('');
    }
  };

  const finish = () => {
    if (!selectedType || !typeConfig) return;

    const business = {
      name, ownerName, phone, city, state: '',
      type: selectedType,
      modules: enabledModules,
      pipelineStages: typeConfig.stages,
      taskTypes: typeConfig.taskTypes,
      tierSettings: DEFAULT_TIER_SETTINGS,
    };

    setupBusiness(business);

    // Add team members
    members.forEach((m) => {
      addTeamMember({ id: generateId(), name: m.name, role: 'executive' });
    });

    // Generate demo data
    const demo = generateDemoData(typeConfig.stages, typeConfig.taskTypes);
    demo.tasks.forEach(addTask);
    demo.leads.forEach(addLead);
    demo.customers.forEach(addCustomer);

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-1">{STEPS[step].title}</h1>
          <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
        </div>

        {/* Step Content */}
        <Card className="p-6 card-shadow animate-in-up">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bname">Business Name *</Label>
                <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Industries" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="owner">Owner Name *</Label>
                <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Rakesh Sharma" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone">Business Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ahmedabad" className="mt-1.5" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => setSelectedType(bt.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                    selectedType === bt.id
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{bt.emoji}</span>
                  <span className="text-sm font-medium block">{bt.label}</span>
                </button>
              ))}
              {selectedType && typeConfig && (
                <div className="col-span-2 mt-2 p-3 rounded-lg bg-accent text-xs text-accent-foreground">
                  <p className="font-medium mb-1">Auto-configured pipeline:</p>
                  <p className="text-muted-foreground">{typeConfig.stages.join(' → ')}</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add up to 3 team members now, or skip and add later.</p>
              <div className="flex gap-2">
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Member name" onKeyDown={(e) => e.key === 'Enter' && addMember()} />
                <Button onClick={addMember} disabled={!memberName.trim() || members.length >= 3} size="sm">Add</Button>
              </div>
              {members.length > 0 && (
                <div className="space-y-2">
                  {members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent">
                      <span className="text-sm font-medium">{m.name}</span>
                      <button onClick={() => setMembers((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Select the modules you want to use. You can change this later.</p>
              {ALL_MODULES.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{mod.emoji}</span>
                    <span className="text-sm font-medium">{mod.label}</span>
                  </div>
                  <Switch checked={enabledModules.includes(mod.id)} onCheckedChange={() => toggleModule(mod.id)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <Sparkles className="w-4 h-4 mr-1" /> Launch My Business
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
