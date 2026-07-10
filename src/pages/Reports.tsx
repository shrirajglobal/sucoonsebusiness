import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness, useTasks, useLeads, useCustomers } from '@/hooks/useSupabaseData';
import { useInventory } from '@/hooks/usePhase4Data';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const { businessId } = useAuth();
  const { data: business } = useBusiness();
  const { data: tasks = [] } = useTasks();
  const { data: leads = [] } = useLeads();
  const { data: customers = [] } = useCustomers();
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isInventoryVertical =
    business?.business_type === 'manufacturing' ||
    business?.business_type === 'trading' ||
    business?.business_type === 'retail';
  const { data: inventoryItems = [] } = useInventory();
  const currency = business?.currency || '₹';

  const stockMargins = useMemo(() => {
    if (!isInventoryVertical) return [];
    return (inventoryItems as any[])
      .map((it) => {
        const sell = Number(it.sell_price ?? 0);
        const cost = Number(it.cost_price ?? 0);
        const qty = Number(it.quantity ?? 0);
        const unit_margin = sell - cost;
        const potential_margin = unit_margin * qty;
        return { id: it.id, name: it.name, sku: it.sku, unit: it.unit, quantity: qty, unit_margin, potential_margin };
      })
      .sort((a, b) => b.potential_margin - a.potential_margin);
  }, [inventoryItems, isInventoryVertical]);


  const generateReport = async () => {
    if (!businessId) return;
    setLoading(true);
    setReport(null);

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const summary = {
      business_name: business?.name,
      total_tasks: tasks.length,
      tasks_completed_this_week: tasks.filter((t) => t.status === 'done' && t.updated_at && t.updated_at >= weekAgo).length,
      tasks_overdue: tasks.filter((t) => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled').length,
      tasks_in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      total_leads: leads.length,
      new_leads_this_week: leads.filter((l) => l.created_at && l.created_at >= weekAgo).length,
      pipeline_value: leads.reduce((s, l) => s + (l.value ? Number(l.value) : 0), 0),
      lead_stages: Object.fromEntries(
        (business?.pipeline_stages || []).map((s) => [s, leads.filter((l) => l.stage === s).length])
      ),
      total_customers: customers.length,
      customers_contacted_this_week: customers.filter((c) => c.last_contact_date && c.last_contact_date >= weekAgo).length,
      customers_overdue: customers.filter((c) => {
        if (!c.last_contact_date) return true;
        const ts = (business?.tier_settings as any) || {};
        const freq = ts[c.tier || 'B']?.frequency || 30;
        const days = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000);
        return days > freq;
      }).length,
    };

    try {
      const { data, error } = await supabase.functions.invoke('ai-report', {
        body: { summary },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit')) toast.error('AI rate limit reached, try again shortly.');
        else if (data.error.includes('Payment')) toast.error('AI credits exhausted. Please add credits.');
        else throw new Error(data.error);
        setLoading(false);
        return;
      }

      setReport(data?.report || 'No report generated.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AI Reports</h1>
            <p className="text-sm text-muted-foreground">Weekly business health summary powered by AI</p>
          </div>
          <Button onClick={generateReport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {report ? 'Regenerate' : 'Generate Report'}
          </Button>
        </div>

        {!report && !loading && (
          <Card className="p-12 card-shadow text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Weekly Business Health Report</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Generate an AI-powered summary of your business performance including tasks, leads, CRM pipeline, and customer engagement insights.
            </p>
            <Button onClick={generateReport} className="gap-2">
              <Sparkles className="w-4 h-4" /> Generate Your First Report
            </Button>
          </Card>
        )}

        {loading && (
          <Card className="p-12 card-shadow text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your business data...</p>
          </Card>
        )}

        {report && !loading && (
          <Card className="p-6 card-shadow">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {report.split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h2 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(2)}</h2>;
                if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5">{line.slice(3)}</h3>;
                if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-medium mt-3 mb-1 text-muted-foreground">{line.slice(4)}</h4>;
                if (line.startsWith('- ')) return <li key={i} className="text-sm ml-4 mb-0.5">{line.slice(2)}</li>;
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-sm font-semibold mt-2">{line.slice(2, -2)}</p>;
                if (line.trim() === '') return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm leading-relaxed">{line}</p>;
              })}
            </div>
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Generated on {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <Button size="sm" variant="outline" onClick={generateReport} className="gap-1"><RefreshCw className="w-3 h-3" /> Refresh</Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
