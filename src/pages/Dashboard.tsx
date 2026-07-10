import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness, useTasks, useLeads, useCustomers, useAttendance } from '@/hooks/useSupabaseData';
import { useInventory, useCreateTransaction } from '@/hooks/usePhase4Data';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_CONFIG } from '@/lib/constants';
import {
  CheckSquare, Users, Clock, Heart, Plus, ArrowRight,
  AlertTriangle, Calendar, TrendingUp, Loader2, PackageX, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import ReferralCard from '@/components/shared/ReferralCard';

export default function Dashboard() {
  const { data: business } = useBusiness();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: customers = [] } = useCustomers();
  const { data: attendanceRecords = [] } = useAttendance();

  const isInventoryVertical =
    business?.business_type === 'manufacturing' ||
    business?.business_type === 'trading' ||
    business?.business_type === 'retail';
  const { data: inventoryItems = [] } = useInventory();
  const lowStockItems = isInventoryVertical
    ? (inventoryItems as any[]).filter(
        (it) => it.min_stock != null && Number(it.quantity ?? 0) < Number(it.min_stock),
      )
    : [];

  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const tierSettings = (business?.tier_settings as any) || { A: { frequency: 15 }, B: { frequency: 30 }, C: { frequency: 60 } };

  const stats = useMemo(() => {
    const tasksDueToday = tasks.filter((t) => t.due_date === today && t.status !== 'done');
    const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled');
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const weekStr = thisWeekStart.toISOString();
    const newLeadsThisWeek = leads.filter((l) => l.created_at && l.created_at >= weekStr);
    const presentToday = attendanceRecords.filter((r) => r.status === 'present');
    const pipelineValue = leads.reduce((sum, l) => sum + (l.value ? Number(l.value) : 0), 0);

    const overdueCustomers = customers.filter((c) => {
      if (!c.last_contact_date) return true;
      const freq = tierSettings[c.tier || 'B']?.frequency || 30;
      const daysSince = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000);
      return daysSince > freq;
    }).sort((a, b) => {
      const daysA = a.last_contact_date ? Math.floor((Date.now() - new Date(a.last_contact_date).getTime()) / 86400000) : 999;
      const daysB = b.last_contact_date ? Math.floor((Date.now() - new Date(b.last_contact_date).getTime()) / 86400000) : 999;
      return daysB - daysA;
    });

    return { tasksDueToday, overdueTasks, newLeadsThisWeek, presentToday, pipelineValue, overdueCustomers };
  }, [tasks, leads, attendanceRecords, customers, tierSettings, today]);

  const kpis = [
    { label: 'Tasks Due Today', value: stats.tasksDueToday.length, icon: CheckSquare, color: 'text-primary', path: '/tasks' },
    { label: 'New Leads This Week', value: stats.newLeadsThisWeek.length, icon: Users, color: 'text-info', path: '/crm' },
    { label: 'Team Present', value: stats.presentToday.length, icon: Clock, color: 'text-success', path: '/attendance' },
    { label: 'Pipeline Value', value: `${business?.currency || '₹'}${(stats.pipelineValue / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-warning', path: '/crm' },
  ];

  if (tasksLoading || leadsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}, {business?.owner_name?.split(' ')[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <Link key={kpi.label} to={kpi.path}>
              <Card className="p-4 card-shadow hover:card-shadow-hover transition-shadow duration-150 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </Card>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/tasks"><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Task</Button></Link>
          <Link to="/crm"><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button></Link>
          <Link to="/attendance"><Button size="sm" variant="outline"><Clock className="w-4 h-4 mr-1" /> Mark Attendance</Button></Link>
          <Link to="/engagement"><Button size="sm" variant="outline"><Heart className="w-4 h-4 mr-1" /> Contact Queue</Button></Link>
        </div>

        {isInventoryVertical && lowStockItems.length > 0 && (
          <Card className="p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <PackageX className="w-4 h-4 text-destructive" /> Low Stock Alert
              </h2>
              <Link to="/inventory" className="text-xs text-primary hover:underline flex items-center gap-1">
                View inventory <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((it: any) => (
                <div key={it.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.sku || it.category || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-destructive">
                      {Number(it.quantity ?? 0)} {it.unit || ''}
                    </p>
                    <p className="text-xs text-muted-foreground">min {Number(it.min_stock)}</p>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{lowStockItems.length - 5} more below minimum
                </p>
              )}
            </div>
          </Card>
        )}


        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Urgent Tasks
              </h2>
              <Link to="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {stats.overdueTasks.length === 0 && stats.tasksDueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No urgent tasks. You're all caught up.</p>
            ) : (
              <div className="space-y-2">
                {[...stats.overdueTasks, ...stats.tasksDueToday].slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.due_date && task.due_date < today ? 'Overdue' : 'Due today'}</p>
                    </div>
                    <Badge className={PRIORITY_CONFIG[task.priority || 'medium']?.color + ' text-[11px]'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" /> Customers Needing Attention
              </h2>
              <Link to="/engagement" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {stats.overdueCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All customers are well-covered.</p>
            ) : (
              <div className="space-y-2">
                {stats.overdueCustomers.slice(0, 3).map((c) => {
                  const days = c.last_contact_date ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000) : null;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.company}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[11px]">Tier {c.tier}</Badge>
                        <p className="text-xs text-destructive mt-1">{days ? `${days}d ago` : 'Never contacted'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-info" /> Recent Leads
            </h2>
            <Link to="/crm" className="text-xs text-primary hover:underline flex items-center gap-1">
              View pipeline <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.company} · {lead.source}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{lead.value ? `₹${Number(lead.value).toLocaleString('en-IN')}` : '—'}</p>
                  <p className="text-xs text-muted-foreground">{lead.stage}</p>
                </div>
              </div>
            ))}
            {leads.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No leads yet. Add your first lead.</p>}
          </div>
        </Card>

        <ReferralCard compact />
      </div>
    </AppLayout>
  );
}
