import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions, useCreateTransaction, useDeleteTransaction } from '@/hooks/usePhase4Data';
import ExportMenu from '@/components/shared/ExportMenu';
import { exportTransactionsCSV, exportPDF } from '@/lib/exportUtils';
import { Plus, Trash2, TrendingUp, TrendingDown, IndianRupee, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const CATEGORIES_INCOME = ['Sales', 'Service', 'Investment', 'Rental', 'Other'];
const CATEGORIES_EXPENSE = ['Salary', 'Rent', 'Utilities', 'Materials', 'Travel', 'Marketing', 'Office Supplies', 'Other'];
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'credit_card'];
const GST_RATES = [0, 5, 12, 18, 28];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))', 'hsl(var(--success))', '#8b5cf6', '#f59e0b', '#06b6d4'];

export default function Finance() {
  const { businessId } = useAuth();
  const { data: transactions, isLoading } = useTransactions();
  const createTx = useCreateTransaction();
  const deleteTx = useDeleteTransaction();
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [form, setForm] = useState({ category: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), description: '', payment_method: 'cash', reference_no: '', gst_rate: '0' });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonth = (transactions || []).filter(t => isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }));

  const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netCashFlow = totalIncome - totalExpense;
  const totalGST = thisMonth.reduce((s, t) => s + Number(t.gst_amount || 0), 0);

  // Category breakdown for pie chart
  const expenseByCategory = thisMonth.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  // Monthly trend (last 6 months)
  const monthlyData: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ms = startOfMonth(d);
    const me = endOfMonth(d);
    const mTx = (transactions || []).filter(t => isWithinInterval(new Date(t.date), { start: ms, end: me }));
    monthlyData.push({
      month: format(d, 'MMM'),
      income: mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      expense: mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  const handleSubmit = async () => {
    if (!form.category || !form.amount) { toast.error('Category and amount are required'); return; }
    const gstRate = Number(form.gst_rate);
    const amount = Number(form.amount);
    const gstAmount = (amount * gstRate) / (100 + gstRate);
    await createTx.mutateAsync({
      business_id: businessId!, type: txType, category: form.category, amount,
      date: form.date, description: form.description || null, payment_method: form.payment_method,
      reference_no: form.reference_no || null, gst_rate: gstRate, gst_amount: Math.round(gstAmount * 100) / 100,
    });
    toast.success('Transaction added');
    setOpen(false);
    setForm({ category: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), description: '', payment_method: 'cash', reference_no: '', gst_rate: '0' });
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cash Flow Dashboard</h1>
            <p className="text-muted-foreground text-sm">{format(now, 'MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu onCSV={() => exportTransactionsCSV(transactions)} onPDF={() => exportPDF('Transactions Report', ['Date','Type','Category','Amount','Description'], transactions.map(t => [t.date, t.type, t.category, `₹${t.amount}`, t.description]))} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Tabs value={txType} onValueChange={(v) => { setTxType(v as any); setForm(f => ({ ...f, category: '' })); }}>
                  <TabsList className="w-full"><TabsTrigger value="income" className="flex-1">Income</TabsTrigger><TabsTrigger value="expense" className="flex-1">Expense</TabsTrigger></TabsList>
                </Tabs>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(txType === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div><Label>Payment Method</Label>
                    <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>GST Rate</Label>
                    <Select value={form.gst_rate} onValueChange={v => setForm(f => ({ ...f, gst_rate: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reference No.</Label><Input value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} /></div>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleSubmit} disabled={createTx.isPending}>{createTx.isPending ? 'Saving...' : 'Save Transaction'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="w-4 h-4 text-green-500" />Income</div>
            <p className="text-xl font-bold mt-1">₹{totalIncome.toLocaleString('en-IN')}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="w-4 h-4 text-red-500" />Expense</div>
            <p className="text-xl font-bold mt-1">₹{totalExpense.toLocaleString('en-IN')}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><IndianRupee className="w-4 h-4" />Net Cash Flow</div>
            <p className={`text-xl font-bold mt-1 ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{netCashFlow.toLocaleString('en-IN')}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Receipt className="w-4 h-4" />GST Collected</div>
            <p className="text-xl font-bold mt-1">₹{totalGST.toLocaleString('en-IN')}</p>
          </CardContent></Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="text-base">Monthly Trend</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                  <Bar dataKey="income" fill="hsl(var(--success))" radius={[4,4,0,0]} /><Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
            <CardContent className="h-64">
              {pieData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-sm text-center pt-20">No expenses this month</p>}
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {(transactions || []).slice(0, 50).map(t => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy')} · {t.payment_method?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.type === 'income' ? 'default' : 'destructive'} className="text-xs">{t.category}</Badge>
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                    </span>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      }
                      title="Delete transaction?"
                      description="This transaction will be permanently removed."
                      onConfirm={() => { deleteTx.mutate(t.id); toast.success('Deleted'); }}
                    />
                  </div>
                </div>
              ))}
              {!(transactions || []).length && (
                <EmptyState
                  icon={IndianRupee}
                  title="No transactions yet"
                  description="Record your first income or expense to start tracking your cash flow and GST."
                  actionLabel="Add Transaction"
                  onAction={() => setOpen(true)}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
