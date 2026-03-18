import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useUpdateBusiness, useTeamMembers, useCreateTeamMember, useDeleteTeamMember } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Users, Building2, Layers, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { businessId } = useAuth();
  const { data: business, isLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: teamMembers = [] } = useTeamMembers();
  const createTeamMember = useCreateTeamMember();
  const deleteTeamMember = useDeleteTeamMember();

  const [memberName, setMemberName] = useState('');
  const [stages, setStages] = useState<string[]>(business?.pipeline_stages || []);
  const [newStage, setNewStage] = useState('');

  const tierSettings = (business?.tier_settings as any) || { A: { frequency: 15 }, B: { frequency: 30 }, C: { frequency: 60 } };
  const [tierA, setTierA] = useState(tierSettings.A?.frequency?.toString() || '15');
  const [tierB, setTierB] = useState(tierSettings.B?.frequency?.toString() || '30');
  const [tierC, setTierC] = useState(tierSettings.C?.frequency?.toString() || '60');

  // Sync stages when business loads
  if (business?.pipeline_stages && stages.length === 0 && business.pipeline_stages.length > 0) {
    setStages(business.pipeline_stages);
  }

  const addMember = async () => {
    if (!memberName.trim() || !businessId) return;
    try {
      await createTeamMember.mutateAsync({ business_id: businessId, name: memberName });
      setMemberName('');
    } catch (err: any) { toast.error(err.message); }
  };

  const removeMember = async (id: string) => {
    try { await deleteTeamMember.mutateAsync(id); } catch (err: any) { toast.error(err.message); }
  };

  const addStage = async () => {
    if (!newStage.trim()) return;
    const updated = [...stages, newStage.trim()];
    setStages(updated);
    try {
      await updateBusiness.mutateAsync({ pipeline_stages: updated });
      setNewStage('');
    } catch (err: any) { toast.error(err.message); }
  };

  const removeStage = async (i: number) => {
    const updated = stages.filter((_, idx) => idx !== i);
    setStages(updated);
    try { await updateBusiness.mutateAsync({ pipeline_stages: updated }); } catch (err: any) { toast.error(err.message); }
  };

  const saveTierSettings = async () => {
    try {
      await updateBusiness.mutateAsync({
        tier_settings: {
          A: { name: 'Priority', frequency: Number(tierA) || 15 },
          B: { name: 'Regular', frequency: Number(tierB) || 30 },
          C: { name: 'Occasional', frequency: Number(tierC) || 60 },
        } as any,
      });
      toast.success('Tier settings saved');
    } catch (err: any) { toast.error(err.message); }
  };

  const updateBusinessField = async (field: string, value: string) => {
    try { await updateBusiness.mutateAsync({ [field]: value }); } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up max-w-2xl">
        <h1 className="text-xl font-semibold">Settings</h1>

        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-primary" /> Business Information</h2>
          <div className="space-y-3">
            <div>
              <Label>Business Name</Label>
              <Input defaultValue={business?.name || ''} onBlur={(e) => updateBusinessField('name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Owner Name</Label>
              <Input defaultValue={business?.owner_name || ''} onBlur={(e) => updateBusinessField('owner_name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input defaultValue={business?.phone || ''} onBlur={(e) => updateBusinessField('phone', e.target.value)} className="mt-1" />
            </div>
          </div>
        </Card>

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

        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Heart className="w-4 h-4 text-primary" /> Engagement Tier Settings</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Tier A (days)</Label><Input type="number" value={tierA} onChange={(e) => setTierA(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Tier B (days)</Label><Input type="number" value={tierB} onChange={(e) => setTierB(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Tier C (days)</Label><Input type="number" value={tierC} onChange={(e) => setTierC(e.target.value)} className="mt-1" /></div>
            </div>
            <Button size="sm" onClick={saveTierSettings} disabled={updateBusiness.isPending}>Save Tier Settings</Button>
          </div>
        </Card>

        <Card className="p-5 card-shadow">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-primary" /> Team Members</h2>
          {teamMembers.length > 0 && (
            <div className="space-y-2 mb-4">
              {teamMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.department || 'Team Member'}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMember(m.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && addMember()} />
            <Button size="sm" onClick={addMember} disabled={createTeamMember.isPending}>Add</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
