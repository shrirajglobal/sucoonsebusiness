import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForms, useCreateForm, useDeleteForm, useFormResponses, useCreateFormResponse } from '@/hooks/useSupabaseData';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { FormField } from '@/types';
import { Plus, Trash2, FileText, Eye, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function generateId() { return Math.random().toString(36).substring(2, 10); }

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
];

export default function Forms() {
  const { user, businessId } = useAuth();
  const { data: forms = [], isLoading } = useForms();
  const createForm = useCreateForm();
  const deleteFormMut = useDeleteForm();

  const [buildOpen, setBuildOpen] = useState(false);
  const [fillFormId, setFillFormId] = useState<string | null>(null);
  const [viewResponsesId, setViewResponsesId] = useState<string | null>(null);

  // Builder state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);

  const addField = () => {
    setFields([...fields, { id: generateId(), type: 'text', label: '', required: false }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const saveForm = async () => {
    if (!title.trim() || fields.length === 0 || !businessId) return;
    try {
      await createForm.mutateAsync({
        business_id: businessId, title, description: desc,
        fields: fields.filter((f) => f.label.trim()) as any,
        is_active: true, created_by: user?.id,
      });
      setTitle(''); setDesc(''); setFields([]); setBuildOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteForm = async (id: string) => {
    try { await deleteFormMut.mutateAsync(id); } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Forms</h1>
          <Dialog open={buildOpen} onOpenChange={setBuildOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Create Form</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Form Builder</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Form Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Customer Feedback" /></div>
                <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" placeholder="Optional description" /></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fields</Label>
                    <Button size="sm" variant="outline" onClick={addField}><Plus className="w-3 h-3 mr-1" /> Add Field</Button>
                  </div>
                  {fields.map((field, i) => (
                    <Card key={field.id} className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                        <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="Field label" className="flex-1" />
                        <Select value={field.type} onValueChange={(v) => updateField(field.id, { type: v as FormField['type'] })}>
                          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeField(field.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 pl-5">
                        <Switch checked={field.required} onCheckedChange={(c) => updateField(field.id, { required: c })} />
                        <span className="text-xs text-muted-foreground">Required</span>
                        {field.type === 'dropdown' && (
                          <Input
                            className="flex-1 ml-2"
                            placeholder="Options (comma separated)"
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          />
                        )}
                      </div>
                    </Card>
                  ))}
                  {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Add fields to build your form.</p>}
                </div>
                <Button onClick={saveForm} className="w-full" disabled={!title.trim() || fields.length === 0 || createForm.isPending}>
                  {createForm.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Save Form
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {forms.length === 0 ? (
          <Card className="p-8 text-center card-shadow">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No forms yet. Create your first form.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => {
              const formFields = (form.fields as any as FormField[]) || [];
              return (
                <Card key={form.id} className="p-4 card-shadow hover:card-shadow-hover transition-shadow">
                  <h3 className="text-sm font-semibold mb-1">{form.title}</h3>
                  {form.description && <p className="text-xs text-muted-foreground mb-3">{form.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span>{formFields.length} fields</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setFillFormId(form.id)} className="gap-1"><Send className="w-3 h-3" /> Fill</Button>
                    <Button size="sm" variant="outline" onClick={() => setViewResponsesId(form.id)} className="gap-1"><Eye className="w-3 h-3" /> Responses</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteForm(form.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Fill Form Sheet */}
        <FillFormSheet formId={fillFormId} forms={forms} onClose={() => setFillFormId(null)} />

        {/* View Responses Sheet */}
        <ViewResponsesSheet formId={viewResponsesId} forms={forms} onClose={() => setViewResponsesId(null)} />
      </div>
    </AppLayout>
  );
}

function FillFormSheet({ formId, forms, onClose }: { formId: string | null; forms: any[]; onClose: () => void }) {
  const { user } = useAuth();
  const createResponse = useCreateFormResponse();
  const [fillData, setFillData] = useState<Record<string, string>>({});

  const form = forms.find((f) => f.id === formId);
  const formFields = (form?.fields as any as FormField[]) || [];

  const submit = async () => {
    if (!formId) return;
    try {
      await createResponse.mutateAsync({ form_id: formId, data: fillData as any, submitted_by: user?.id });
      setFillData({}); onClose();
      toast.success('Response submitted');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Sheet open={!!formId} onOpenChange={(o) => { if (!o) { setFillData({}); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {form && (
          <>
            <SheetHeader><SheetTitle>{form.title}</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
              {formFields.map((field) => (
                <div key={field.id}>
                  <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[80px]"
                      value={fillData[field.id] || ''}
                      onChange={(e) => setFillData({ ...fillData, [field.id]: e.target.value })}
                    />
                  ) : field.type === 'dropdown' ? (
                    <Select value={fillData[field.id] || ''} onValueChange={(v) => setFillData({ ...fillData, [field.id]: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{field.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                      value={fillData[field.id] || ''}
                      onChange={(e) => setFillData({ ...fillData, [field.id]: e.target.value })}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
              <Button onClick={submit} className="w-full" disabled={createResponse.isPending}>
                {createResponse.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Submit
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ViewResponsesSheet({ formId, forms, onClose }: { formId: string | null; forms: any[]; onClose: () => void }) {
  const { data: responses = [] } = useFormResponses(formId || undefined);
  const form = forms.find((f) => f.id === formId);
  const formFields = (form?.fields as any as FormField[]) || [];

  return (
    <Sheet open={!!formId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {form && (
          <>
            <SheetHeader><SheetTitle>{form.title} — Responses</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No responses yet.</p>
              ) : responses.map((resp) => (
                <Card key={resp.id} className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">{resp.submitted_at ? new Date(resp.submitted_at).toLocaleString('en-IN') : '—'}</p>
                  {formFields.map((field) => (
                    <div key={field.id} className="mb-1.5">
                      <span className="text-xs text-muted-foreground">{field.label}: </span>
                      <span className="text-sm font-medium">{(resp.data as any)?.[field.id] || '—'}</span>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
