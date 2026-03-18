import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_CONFIG } from '@/lib/constants';
import {
  CheckSquare, Users, Clock, Heart, Plus, ArrowRight,
  AlertTriangle, Calendar, TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const { business, tasks, leads, customers, contactLogs, attendanceRecords, teamMembers } = useAppStore();

  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = useMemo(() => {
    const tasksDueToday = tasks.filter((t) => t.dueDate === today && t.status !== 'done');
    const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done' && t.status !== 'cancelled');
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const weekStr = thisWeekStart.toISOString();
    const newLeadsThisWeek = leads.filter((l) => l.createdAt >= weekStr);
    const presentToday = attendanceRecords.filter((r) => r.date === today && r.status === 'present');
    const pipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);

    // Customers needing attention
    const overdueCustomers = customers.filter((c) => {
      if (!c.lastContactDate) return true;
      const freq = business?.tierSettings?.[c.tier]?.frequency || 30;
      const daysSince = Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / 86400000);
      return daysSince > freq;
    }).sort((a, b) => {
      const daysA = a.lastContactDate ? Math.floor((Date.now() - new Date(a.lastContactDate).getTime()) / 86400000) : 999;
      const daysB = b.lastContactDate ? Math.floor((Date.now() - new Date(b.lastContactDate).getTime()) / 86400000) : 999;
      return daysB - daysA;
    });

    return { tasksDueToday, overdueTasks, newLeadsThisWeek, presentToday, pipelineValue, overdueCustomers };
  }, [tasks, leads, attendanceRecords, customers, business, today]);

  const kpis = [
    { label: 'Tasks Due Today', value: stats.tasksDueToday.length, icon: CheckSquare, color: 'text-primary', path: '/tasks' },
    { label: 'New Leads This Week', value: stats.newLeadsThisWeek.length, icon: Users, color: 'text-info', path: '/crm' },
    { label: 'Team Present', value: stats.presentToday.length, icon: Clock, color: 'text-success', path: '/attendance' },
    { label: 'Pipeline Value', value: `₹${(stats.pipelineValue / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-warning', path: '/crm' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold">{greeting}, {business?.ownerName?.split(' ')[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
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

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link to="/tasks"><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Task</Button></Link>
          <Link to="/crm"><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button></Link>
          <Link to="/attendance"><Button size="sm" variant="outline"><Clock className="w-4 h-4 mr-1" /> Mark Attendance</Button></Link>
          <Link to="/engagement"><Button size="sm" variant="outline"><Heart className="w-4 h-4 mr-1" /> Contact Queue</Button></Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Urgent Tasks */}
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
                      <p className="text-xs text-muted-foreground">{task.dueDate && task.dueDate < today ? 'Overdue' : 'Due today'}</p>
                    </div>
                    <Badge className={PRIORITY_CONFIG[task.priority]?.color + ' text-[11px]'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Customers Needing Attention */}
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
                  const days = c.lastContactDate ? Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / 86400000) : null;
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

        {/* Recent Leads */}
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
                  <p className="text-sm font-medium tabular-nums">{lead.value ? `₹${lead.value.toLocaleString('en-IN')}` : '—'}</p>
                  <p className="text-xs text-muted-foreground">{lead.stage}</p>
                </div>
              </div>
            ))}
            {leads.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No leads yet. Add your first lead.</p>}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
