import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useUpdateBusiness, useTeamMembers, useCreateTeamMember, useDeleteTeamMember, useUpdateTeamMember } from '@/hooks/useSupabaseData';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Users, Building2, Layers, Heart, Loader2, Shield, Activity, Upload, Globe, Plus, Pencil, X, Info, IndianRupee, Phone, Mail, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ActivityLogList from '@/components/shared/ActivityLogList';
import CSVImport from '@/components/shared/CSVImport';
import ReferralCard from '@/components/shared/ReferralCard';

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

const ROLE_PERMISSIONS: Record<AppRole, string> = {
  owner: 'Full access: manage everything including billing, roles & settings',
  admin: 'Manage team, settings, pipeline, all data — cannot change owner',
  manager: 'Create & manage tasks, leads, customers — cannot change settings',
  executive: 'View all data, create tasks & leads — cannot delete or manage team',
  field_staff: 'Limited view: own tasks, attendance & assigned leads only',
};

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  department: string;
  salary: string;
  designation: string;
};

const emptyForm: MemberForm = { name: '', email: '', phone: '', department: '', salary: '', designation: '' };

export default function Settings() {
  const { user, businessId } = useAuth();
  const { data: business, isLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: teamMembers = [] } = useTeamMembers();
  const createTeamMember = useCreateTeamMember();
  const deleteTeamMember = useDeleteTeamMember();
  const updateTeamMember = useUpdateTeamMember();
  const { data: userRole } = useUserRole();
  const logActivity = useLogActivity();

  const isAdmin = hasMinRole(userRole as AppRole, 'admin');

  const [memberForm, setMemberForm] = useState<MemberForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [stages, setStages] = useState<string[]>([]);
  const [newStage, setNewStage] = useState('');

  const tierSettings = (business?.tier_settings as any) || { A: { frequency: 15 }, B: { frequency: 30 }, C: { frequency: 60 } };
  const [tierA, setTierA] = useState(tierSettings.A?.frequency?.toString() || '15');
  const [tierB, setTierB] = useState(tierSettings.B?.frequency?.toString() || '30');
  const [tierC, setTierC] = useState(tierSettings.C?.frequency?.toString() || '60');

  useEffect(() => {
    if (business?.pipeline_stages && business.pipeline_stages.length > 0) {
      setStages(business.pipeline_stages);
    }
  }, [business?.pipeline_stages]);

  const resetForm = () => {
    setMemberForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (m: any) => {
    setMemberForm({
      name: m.name || '',
      email: m.email || '',
      phone: m.phone || '',
      department: m.department || '',
      salary: (m as any).salary?.toString() || '0',
      designation: m.designation || '',
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  // Fetch all user_roles for the business to show actual roles
  const { data: allRoles = [] } = useQuery({
    queryKey: ['all_user_roles', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*').eq('business_id', businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const getMemberRole = (userId: string | null): AppRole | null => {
    if (!userId) return null;
    const role = allRoles.find((r) => r.user_id === userId);
    return (role?.role as AppRole) || null;
  };

  const saveMember = async () => {
    if (!memberForm.name.trim() || !businessId) return;
    const payload = {
      name: memberForm.name.trim(),
      email: memberForm.email.trim() || null,
      phone: memberForm.phone.trim() || null,
      department: memberForm.department.trim() || null,
      salary: Number(memberForm.salary) || 0,
      designation: memberForm.designation.trim() || null,
    };
    try {
      if (editingId) {
        await updateTeamMember.mutateAsync({ id: editingId, ...payload } as any);
        logActivity.mutate({ action: 'updated', entity_type: 'team_member', entity_label: payload.name, user_name: user?.email || '' });
        toast.success('Member updated');
      } else {
        await createTeamMember.mutateAsync({ business_id: businessId, ...payload } as any);
        logActivity.mutate({ action: 'created', entity_type: 'team_member', entity_label: payload.name, user_name: user?.email || '' });
        toast.success('Member added');
      }
      resetForm();
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
      const { error } = await supabase.rpc('assign_role', {
        _target_user_id: userId,
        _business_id: businessId,
        _new_role: newRole,
      });
      if (error) throw error;
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
      if (file.size > 2 * 1024 * 1024) { toast.error('File must be under 2MB'); return; }
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      await updateBusiness.mutateAsync({ logo_url: publicUrl });
      toast.success('Logo updated');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  const currency = (business as any)?.currency || '₹';

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
            <TabsTrigger value="referral" className="gap-1"><Gift className="w-4 h-4" /> Referral</TabsTrigger>
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
                  <Input defaultValue={business?.name || ''} onBlur={(e) => updateBusinessField('name', e.target.value)} className="mt-1" maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Owner Name</Label>
                    <Input defaultValue={business?.owner_name || ''} onBlur={(e) => updateBusinessField('owner_name', e.target.value)} className="mt-1" maxLength={100} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input defaultValue={business?.phone || ''} onBlur={(e) => updateBusinessField('phone', e.target.value)} className="mt-1" maxLength={20} />
                  </div>
                </div>
                <div>
                  <Label>GSTIN <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Input
                    defaultValue={(business as any)?.gst_number || ''}
                    onBlur={(e) => updateBusinessField('gst_number', e.target.value)}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="mt-1"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Used in invoices, POs & compliance documents</p>
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
            {/* Role permissions info */}
            <Card className="p-4 card-shadow bg-accent/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold mb-2">Role Permissions</p>
                  <div className="space-y-1">
                    {(['owner', 'admin', 'manager', 'executive', 'field_staff'] as AppRole[]).map((r) => (
                      <div key={r} className="flex items-start gap-2 text-xs">
                        <Badge className={`${ROLE_COLORS[r]} text-[10px] shrink-0 mt-0.5`}>{ROLE_LABELS[r]}</Badge>
                        <span className="text-muted-foreground">{ROLE_PERMISSIONS[r]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Team Members</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Your role: <Badge className={ROLE_COLORS[(userRole as AppRole) || 'executive']}>{ROLE_LABELS[(userRole as AppRole) || 'executive']}</Badge>
                  </p>
                  {isAdmin && !showForm && (
                    <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Member
                    </Button>
                  )}
                </div>
              </div>

              {/* Add/Edit Member Form */}
              {showForm && isAdmin && (
                <div className="mb-4 p-4 rounded-lg border border-border bg-accent/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{editingId ? 'Edit Member' : 'New Team Member'}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={resetForm}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name *</Label>
                      <Input value={memberForm.name} onChange={(e) => setMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="mt-1" maxLength={100} />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="mt-1" maxLength={255} />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input value={memberForm.phone} onChange={(e) => setMemberForm(f => ({ ...f, phone: e.target.value }))} placeholder="Mobile number" className="mt-1" maxLength={20} />
                    </div>
                    <div>
                      <Label className="text-xs">Department</Label>
                      <Input value={memberForm.department} onChange={(e) => setMemberForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Sales, Operations" className="mt-1" maxLength={50} />
                    </div>
                    <div>
                      <Label className="text-xs">Salary ({currency})</Label>
                      <Input type="number" min="0" value={memberForm.salary} onChange={(e) => setMemberForm(f => ({ ...f, salary: e.target.value }))} placeholder="Monthly salary" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Designation</Label>
                      <Input value={memberForm.designation} onChange={(e) => setMemberForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Sales Manager, Accountant" className="mt-1" maxLength={100} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveMember} disabled={createTeamMember.isPending || updateTeamMember.isPending || !memberForm.name.trim()}>
                      {(createTeamMember.isPending || updateTeamMember.isPending) && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                      {editingId ? 'Update' : 'Add Member'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Member list */}
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-accent/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{m.name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            {(m as any).designation && <span className="text-xs font-medium text-muted-foreground">{(m as any).designation}</span>}
                            {m.department && <span className="text-xs text-muted-foreground">{m.department}</span>}
                            {m.email && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Mail className="w-3 h-3" />{m.email}</span>}
                            {m.phone && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Phone className="w-3 h-3" />{m.phone}</span>}
                            {(m as any).salary > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{currency}{Number((m as any).salary).toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isAdmin && m.user_id && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                   <Select value={getMemberRole(m.user_id) || 'executive'} onValueChange={(v) => updateMemberRole(m.id, m.user_id, v as AppRole)}>
                                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                                    <SelectContent>
                                      {(['admin', 'manager', 'executive', 'field_staff'] as AppRole[]).map((r) => (
                                        <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px] text-xs">Set app access level for this member</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {isAdmin && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(m)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMember(m.id, m.name)}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No team members yet. Add your first member above.</p>
              )}

              {!isAdmin && <p className="text-xs text-muted-foreground mt-4">Only admins and owners can manage team members.</p>}
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

          <TabsContent value="referral" className="mt-4">
            <ReferralCard />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
