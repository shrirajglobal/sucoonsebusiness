import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useUpdateBusiness, useTeamMembers, useCreateTeamMember, useDeleteTeamMember } from '@/hooks/useSupabaseData';
import { useUserRole, hasMinRole, useLogActivity } from '@/hooks/useRBAC';
import type { AppRole } from '@/hooks/useRBAC';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Building2, Layers, Heart, Loader2, Shield, Activity, Upload, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ActivityLogList from '@/components/shared/ActivityLogList';
import CSVImport from '@/components/shared/CSVImport';

const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  executive: 'Executive',
  field_staff: 'Field Staff',
};

const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-destructive/10 text-destructive',
  admin: 'bg-primary/10 text-primary',
  manager: 'bg-warning/10 text-warning',
  executive: 'bg-muted text-muted-foreground',
  field_staff: 'bg-muted text-muted-foreground',
};

export default function Settings() {
  const { user, businessId } = useAuth();
  const { data: business, isLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: teamMembers = [] } = useTeamMembers();
  const createTeamMember = useCreateTeamMember();
  const deleteTeamMember = useDeleteTeamMember();
  const { data: userRole } = useUserRole();
  const logActivity = useLogActivity();

  const isAdmin = hasMinRole(userRole as AppRole, 'admin');

  const [memberName, setMemberName] = useState('');
  const [stages, setStages] = useState<string[]>(business?.pipeline_stages || []);
  const [newStage, setNewStage] = useState('');

  const tierSettings = (business?.tier_settings as any) || { A: { frequency: 15 }, B: { frequency: 30 }, C: { frequency: 60 } };
  const [tierA, setTierA] = useState(tierSettings.A?.frequency?.toString() || '15');
  const [tierB, setTierB] = useState(tierSettings.B?.frequency?.toString() || '30');
  const [tierC, setTierC] = useState(tierSettings.C?.frequency?.toString() || '60');

  if (business?.pipeline_stages && stages.length === 0 && business.pipeline_stages.length > 0) {
    setStages(business.pipeline_stages);
  }

  const addMember = async () => {
    if (!memberName.trim() || !businessId) return;
    try {
      await createTeamMember.mutateAsync({ business_id: businessId, name: memberName });
      logActivity.mutate({ action: 'created', entity_type: 'team_member', entity_label: memberName, user_name: user?.email || '' });
      setMemberName('');
    } catch (err: any) { toast.error(err.message); }
  };

  const removeMember = async (id: string, name: string) => {
    try {
      await deleteTeamMember.mutateAsync(id);
      logActivity.mutate({ action: 'deleted', entity_type: 'team_member', entity_label: name, user_name: user?.email || '' });
    } catch (err: any) { toast.error(err.message); }
  };

  const updateMemberRole = async (memberId: string, userId: string | null, newRole: AppRole) => {
    if (!userId || !businessId) { toast.error('This member has no linked user account'); return; }
    try {
      // Upsert role
      const { error: deleteErr } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('business_id', businessId);
      const { error: insertErr } = await supabase.from('user_roles').insert({ user_id: userId, business_id: businessId, role: newRole });
      if (insertErr) throw insertErr;
      logActivity.mutate({ action: 'updated', entity_type: 'role', entity_label: `${newRole}`, user_name: user?.email || '' });
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
    } catch (err: any) { toast.error(err.message); }
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${businessId}.${ext}`;
      const { error: upErr } = await supabase.storage.from('card-scans').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('card-scans').getPublicUrl(path);
      await updateBusiness.mutateAsync({ logo_url: publicUrl });
      toast.success('Logo updated');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Settings</h1>
          <CSVImport />
        </div>

        <Tabs defaultValue="workspace">
          <TabsList className="flex-wrap">
            <TabsTrigger value="workspace" className="gap-1"><Building2 className="w-4 h-4" /> Workspace</TabsTrigger>
            <TabsTrigger value="team" className="gap-1"><Users className="w-4 h-4" /> Team & Roles</TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1"><Layers className="w-4 h-4" /> Pipeline</TabsTrigger>
            <TabsTrigger value="engagement" className="gap-1"><Heart className="w-4 h-4" /> Engagement</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1"><Activity className="w-4 h-4" /> Activity</TabsTrigger>
          </TabsList>

          {/* Workspace / Branding */}
          <TabsContent value="workspace" className="mt-4 space-y-4">
            <Card className="p-5 card-shadow">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-primary" /> Business Branding</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center border overflow-hidden">
                    {business?.logo_url ? (
                      <img src={business.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <Button variant="outline" size="sm" asChild><span><Upload className="w-3.5 h-3.5 mr-1" /> Upload Logo</span></Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
                  </div>
                </div>
                <div>
                  <Label>Business Name</Label>
                  <Input defaultValue={business?.name || ''} onBlur={(e) => updateBusinessField('name', e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Owner Name</Label>
                    <Input defaultValue={business?.owner_name || ''} onBlur={(e) => updateBusinessField('owner_name', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input defaultValue={business?.phone || ''} onBlur={(e) => updateBusinessField('phone', e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 card-shadow">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-primary" /> Localization</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Currency Symbol</Label>
                  <Select defaultValue={(business as any)?.currency || '₹'} onValueChange={(v) => updateBusinessField('currency', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="₹">₹ (INR)</SelectItem>
                      <SelectItem value="$">$ (USD)</SelectItem>
                      <SelectItem value="€">€ (EUR)</SelectItem>
                      <SelectItem value="£">£ (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select defaultValue={(business as any)?.date_format || 'dd/MM/yyyy'} onValueChange={(v) => updateBusinessField('date_format', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Team & Roles */}
          <TabsContent value="team" className="mt-4 space-y-4">
            <Card className="p-5 card-shadow">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-primary" /> Team Members & Roles</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Your role: <Badge className={ROLE_COLORS[(userRole as AppRole) || 'executive']}>{ROLE_LABELS[(userRole as AppRole) || 'executive']}</Badge>
              </p>
              {teamMembers.length > 0 && (
                <div className="space-y-2 mb-4">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.department || 'Team Member'} {m.email && `· ${m.email}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && m.user_id && (
                          <Select defaultValue="executive" onValueChange={(v) => updateMemberRole(m.id, m.user_id, v as AppRole)}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                            <SelectContent>
                              {(['admin', 'manager', 'executive', 'field_staff'] as AppRole[]).map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMember(m.id, m.name)}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && (
                <div className="flex gap-2">
                  <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && addMember()} />
                  <Button size="sm" onClick={addMember} disabled={createTeamMember.isPending}>Add</Button>
                </div>
              )}
              {!isAdmin && <p className="text-xs text-muted-foreground">Only admins and owners can manage team members.</p>}
            </Card>
          </TabsContent>

          {/* Pipeline */}
          <TabsContent value="pipeline" className="mt-4">
            <Card className="p-5 card-shadow">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Layers className="w-4 h-4 text-primary" /> CRM Pipeline Stages</h2>
              <div className="space-y-2 mb-3">
                {stages.map((stage, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50">
                    <span className="text-sm">{stage}</span>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeStage(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="New stage name" onKeyDown={(e) => e.key === 'Enter' && addStage()} />
                  <Button size="sm" onClick={addStage}>Add</Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Engagement */}
          <TabsContent value="engagement" className="mt-4">
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
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="activity" className="mt-4">
            <Card className="p-5 card-shadow">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /> Activity Log</h2>
              <ActivityLogList />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
