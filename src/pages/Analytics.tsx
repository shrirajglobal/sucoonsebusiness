import { useMemo } from 'react';
import { useBusiness, useTasks, useLeads, useCustomers, useAttendance, useTeamMembers } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { BarChart3, Users, Heart, Trophy, Loader2 } from 'lucide-react';

const CHART_COLORS = ['hsl(162,45%,30%)', 'hsl(210,92%,55%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)', 'hsl(142,71%,45%)', 'hsl(270,60%,50%)', 'hsl(330,60%,50%)'];

export default function Analytics() {
  const { data: business } = useBusiness();
  const { data: tasks = [], isLoading: tl } = useTasks();
  const { data: leads = [], isLoading: ll } = useLeads();
  const { data: customers = [] } = useCustomers();
  const { data: attendanceRecords = [] } = useAttendance();
  const { data: teamMembers = [] } = useTeamMembers();

  const tierSettings = (business?.tier_settings as any) || { A: { frequency: 15 }, B: { frequency: 30 }, C: { frequency: 60 } };
  const stages = business?.pipeline_stages || [];

  // CRM Pipeline Funnel
  const pipelineData = useMemo(() => {
    return stages.map((stage, i) => {
      const count = leads.filter((l) => l.stage === stage).length;
      const value = leads.filter((l) => l.stage === stage).reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0);
      return { name: stage, count, value, fill: CHART_COLORS[i % CHART_COLORS.length] };
    });
  }, [leads, stages]);

  // Task Status Distribution
  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => { counts[t.status || 'todo'] = (counts[t.status || 'todo'] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: status.replace('_', ' '), value: count }));
  }, [tasks]);

  // Lead Source Distribution
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { const s = l.source || 'Unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [leads]);

  // Engagement Coverage Heatmap Data
  const engagementData = useMemo(() => {
    const tiers: Record<string, { total: number; ok: number; overdue: number; never: number }> = {
      A: { total: 0, ok: 0, overdue: 0, never: 0 },
      B: { total: 0, ok: 0, overdue: 0, never: 0 },
      C: { total: 0, ok: 0, overdue: 0, never: 0 },
    };
    customers.forEach((c) => {
      const t = c.tier || 'B';
      if (!tiers[t]) return;
      tiers[t].total++;
      if (!c.last_contact_date) { tiers[t].never++; return; }
      const days = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000);
      const freq = tierSettings[t]?.frequency || 30;
      if (days <= freq) tiers[t].ok++;
      else tiers[t].overdue++;
    });
    return Object.entries(tiers).map(([tier, data]) => ({
      tier: `Tier ${tier}`,
      ...data,
      coverage: data.total ? Math.round((data.ok / data.total) * 100) : 0,
    }));
  }, [customers, tierSettings]);

  // Team Leaderboard
  const leaderboard = useMemo(() => {
    const allMembers = [
      { id: 'owner', name: business?.owner_name || 'Owner' },
      ...teamMembers.map((m) => ({ id: m.user_id || m.id, name: m.name })),
    ];
    return allMembers.map((member) => {
      const memberTasks = tasks.filter((t) => t.assigned_to === member.id);
      const completedTasks = memberTasks.filter((t) => t.status === 'done').length;
      const memberLeads = leads.filter((l) => l.assigned_to === member.id);
      const pipelineValue = memberLeads.reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0);
      const score = completedTasks * 10 + memberLeads.length * 5;
      return { ...member, completedTasks, totalTasks: memberTasks.length, leadCount: memberLeads.length, pipelineValue, score };
    }).sort((a, b) => b.score - a.score);
  }, [tasks, leads, teamMembers, business]);

  // Weekly trends
  const weeklyData = useMemo(() => {
    const weeks: Record<string, { tasks: number; leads: number }> = {};
    const now = Date.now();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now - i * 7 * 86400000);
      const label = `W${4 - i}`;
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const wTasks = tasks.filter((t) => t.created_at && new Date(t.created_at) >= weekStart && new Date(t.created_at) < weekEnd).length;
      const wLeads = leads.filter((l) => l.created_at && new Date(l.created_at) >= weekStart && new Date(l.created_at) < weekEnd).length;
      weeks[label] = { tasks: wTasks, leads: wLeads };
    }
    return Object.entries(weeks).map(([name, data]) => ({ name, ...data }));
  }, [tasks, leads]);

  if (tl || ll) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        <h1 className="text-xl font-semibold">Analytics</h1>

        <Tabs defaultValue="pipeline">
          <TabsList className="flex-wrap">
            <TabsTrigger value="pipeline" className="gap-1"><BarChart3 className="w-4 h-4" /> Pipeline</TabsTrigger>
            <TabsTrigger value="engagement" className="gap-1"><Heart className="w-4 h-4" /> Engagement</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1"><Trophy className="w-4 h-4" /> Leaderboard</TabsTrigger>
            <TabsTrigger value="overview" className="gap-1"><Users className="w-4 h-4" /> Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4 space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5 card-shadow">
                <h3 className="text-sm font-semibold mb-4">Pipeline Funnel</h3>
                {pipelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={pipelineData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v, 'Leads']} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {pipelineData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No pipeline data yet.</p>}
              </Card>

              <Card className="p-5 card-shadow">
                <h3 className="text-sm font-semibold mb-4">Pipeline Value by Stage</h3>
                {pipelineData.length > 0 ? (
                  <div className="space-y-3">
                    {pipelineData.map((stage, i) => {
                      const maxVal = Math.max(...pipelineData.map((s) => s.value), 1);
                      return (
                        <div key={stage.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{stage.name}</span>
                            <span className="font-medium tabular-nums">₹{stage.value.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(stage.value / maxVal) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No value data yet.</p>}
              </Card>

              <Card className="p-5 card-shadow">
                <h3 className="text-sm font-semibold mb-4">Lead Sources</h3>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {sourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No lead data yet.</p>}
              </Card>

              <Card className="p-5 card-shadow">
                <h3 className="text-sm font-semibold mb-4">Task Status</h3>
                {taskStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {taskStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No tasks yet.</p>}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="mt-4 space-y-4">
            <Card className="p-5 card-shadow">
              <h3 className="text-sm font-semibold mb-4">Engagement Coverage by Tier</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {engagementData.map((tier) => (
                  <Card key={tier.tier} className="p-4 border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">{tier.tier}</h4>
                      <span className="text-lg font-bold tabular-nums">{tier.coverage}%</span>
                    </div>
                    {/* Heatmap-style bar */}
                    <div className="h-4 rounded-full overflow-hidden bg-muted flex">
                      {tier.total > 0 && (
                        <>
                          <div className="h-full bg-success" style={{ width: `${(tier.ok / tier.total) * 100}%` }} title={`On Track: ${tier.ok}`} />
                          <div className="h-full bg-destructive" style={{ width: `${(tier.overdue / tier.total) * 100}%` }} title={`Overdue: ${tier.overdue}`} />
                          <div className="h-full bg-muted-foreground/30" style={{ width: `${(tier.never / tier.total) * 100}%` }} title={`Never: ${tier.never}`} />
                        </>
                      )}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>✅ {tier.ok} on track</span>
                      <span>🔴 {tier.overdue} overdue</span>
                      <span>⚪ {tier.never} never</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{tier.total} customers total</p>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-5 card-shadow">
              <h3 className="text-sm font-semibold mb-4">Overall Coverage</h3>
              {(() => {
                const total = customers.length;
                const contacted30d = customers.filter((c) => {
                  if (!c.last_contact_date) return false;
                  return Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000) <= 30;
                }).length;
                const pct = total ? Math.round((contacted30d / total) * 100) : 0;
                return (
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{pct}%</span>
                    </div>
                    <div>
                      <p className="text-sm"><span className="font-semibold tabular-nums">{contacted30d}</span> of <span className="font-semibold tabular-nums">{total}</span> customers contacted in last 30 days</p>
                      <p className="text-xs text-muted-foreground mt-1">{total - contacted30d} customers need attention</p>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Card className="p-5 card-shadow">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-warning" /> Team Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                    <span className={`text-lg font-bold tabular-nums w-8 text-center ${i === 0 ? 'text-warning' : i === 1 ? 'text-muted-foreground' : ''}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{member.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{member.completedTasks}/{member.totalTasks} tasks done</span>
                        <span>{member.leadCount} leads</span>
                        <span className="tabular-nums">₹{member.pipelineValue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">{member.score}</p>
                      <p className="text-[10px] text-muted-foreground">points</p>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No team data yet.</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="p-5 card-shadow">
              <h3 className="text-sm font-semibold mb-4">Weekly Activity Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="tasks" name="Tasks Created" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" name="Leads Added" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4 card-shadow text-center">
                <p className="text-2xl font-semibold tabular-nums">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </Card>
              <Card className="p-4 card-shadow text-center">
                <p className="text-2xl font-semibold tabular-nums">{tasks.filter((t) => t.status === 'done').length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </Card>
              <Card className="p-4 card-shadow text-center">
                <p className="text-2xl font-semibold tabular-nums">{leads.length}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </Card>
              <Card className="p-4 card-shadow text-center">
                <p className="text-2xl font-semibold tabular-nums">₹{(leads.reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0) / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
