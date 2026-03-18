import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TeamMember, UserRole } from '@/types';
import { Plus, Trash2, Settings as SettingsIcon, Users, Building2, Layers, Heart } from 'lucide-react';

function generateId() { return Math.random().toString(36).substring(2, 10); }

export default function Settings() {
  const { business, updateBusiness, teamMembers, addTeamMember, removeTeamMember, resetStore } = useAppStore();
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<UserRole>('executive');
  const [resetOpen, setResetOpen] = useState(false);

  // Pipeline stages editing
  const [stages, setStages] = useState(business?.pipelineStages || []);
  const [newStage, setNewStage] = useState('');

  // Tier settings
  const [tierA, setTierA] = useState(business?.tierSettings?.A?.frequency?.toString() || '15');
  const [tierB, setTierB] = useState(business?.tierSettings?.B?.frequency?.toString() || '30');
  const [tierC, setTierC] = useState(business?.tierSettings?.C?.frequency?.toString() || '60');

  const addMember = () => {
    if (!memberName.trim()) return;
    addTeamMember({ id: generateId(), name: memberName, role: memberRole });
    setMemberName('');
  };

  const addStage = () => {
    if (!newStage.trim()) return;
    const updated = [...stages, newStage.trim()];
    setStages(updated);
    updateBusiness({ pipelineStages: updated });
    setNewStage('');
  };

  const removeStage = (i: number) => {
    const updated = stages.filter((_, idx) => idx !== i);
    setStages(updated);
    updateBusiness({ pipelineStages: updated });
  };

  const saveTierSettings = () => {
    updateBusiness({
      tierSettings: {
        A: { name: 'Priority', frequency: Number(tierA) || 15 },
        B: { name: 'Regular', frequency: Number(tierB) || 30 },
        C: { name: 'Occasional', frequency: Number(tierC) || 60 },
      },
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up max-w-2xl">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* Business Info */}
        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-primary" /> Business Information</h2>
          <div className="space-y-3">
            <div>
              <Label>Business Name</Label>
              <Input value={business?.name || ''} onChange={(e) => updateBusiness({ name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Owner Name</Label>
              <Input value={business?.ownerName || ''} onChange={(e) => updateBusiness({ ownerName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={business?.phone || ''} onChange={(e) => updateBusiness({ phone: e.target.value })} className="mt-1" />
            </div>
          </div>
        </Card>

        {/* Pipeline Stages */}
        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Layers className="w-4 h-4 text-primary" /> CRM Pipeline Stages</h2>
          <div className="space-y-2 mb-3">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50">
                <span className="text-sm">{stage}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeStage(i)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="New stage name" onKeyDown={(e) => e.key === 'Enter' && addStage()} />
            <Button size="sm" onClick={addStage}>Add</Button>
          </div>
        </Card>

        {/* Tier Settings */}
        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Heart className="w-4 h-4 text-primary" /> Engagement Tier Settings</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Tier A (days)</Label>
                <Input type="number" value={tierA} onChange={(e) => setTierA(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tier B (days)</Label>
                <Input type="number" value={tierB} onChange={(e) => setTierB(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tier C (days)</Label>
                <Input type="number" value={tierC} onChange={(e) => setTierC(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button size="sm" onClick={saveTierSettings}>Save Tier Settings</Button>
          </div>
        </Card>

        {/* Team Members */}
        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-primary" /> Team Members</h2>
          {teamMembers.length > 0 && (
            <div className="space-y-2 mb-4">
              {teamMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role.replace('_', ' ')}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeTeamMember(m.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name" className="flex-1" />
            <Select value={memberRole} onValueChange={(v) => setMemberRole(v as UserRole)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="field_staff">Field Staff</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addMember}>Add</Button>
          </div>
        </Card>

        {/* Reset */}
        <Card className="p-5 card-shadow border-destructive/20">
          <h2 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-xs text-muted-foreground mb-3">Reset all data and start fresh. This cannot be undone.</p>
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">Reset Workspace</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Reset Everything?</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">This will delete all tasks, leads, customers, forms, and settings. You'll need to set up your business again.</p>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { resetStore(); window.location.href = '/onboarding'; }}>Yes, Reset Everything</Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </AppLayout>
  );
}
