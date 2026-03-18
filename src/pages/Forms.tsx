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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { FormField } from '@/types';
import { Plus, Trash2, FileText, Eye, Send, Loader2, Star, BookTemplate, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { FORM_TEMPLATES } from '@/lib/formTemplates';

function generateId() { return Math.random().toString(36).substring(2, 10); }

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'radio', label: 'Radio (Single)' },
  { value: 'multi_select', label: 'Multi Select' },
];

export default function Forms() {
  const { user, businessId } = useAuth();
  const { data: forms = [], isLoading } = useForms();
  const createForm = useCreateForm();
  const deleteFormMut = useDeleteForm();

  const [buildOpen, setBuildOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
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

  const useTemplate = (template: typeof FORM_TEMPLATES[0]) => {
    setTitle(template.title);
    setDesc(template.description);
    setFields(template.fields.map(f => ({ ...f, id: generateId() })));
    setTemplateOpen(false);
    setBuildOpen(true);
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
          <div className="flex gap-2">
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Copy className="w-4 h-4 mr-1" /> Templates</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Form Templates</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {FORM_TEMPLATES.map((template, i) => (
                    <Card key={i} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => useTemplate(template)}>
                      <p className="text-sm font-semibold">{template.title}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{template.fields.length} fields</p>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
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
                          {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'multi_select') && (
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
        </div>

        {forms.length === 0 ? (
          <Card className="p-8 text-center card-shadow">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No forms yet. Create one or use a template.</p>
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

        <FillFormSheet formId={fillFormId} forms={forms} onClose={() => setFillFormId(null)} />
        <ViewResponsesSheet formId={viewResponsesId} forms={forms} onClose={() => setViewResponsesId(null)} />
      </div>
    </AppLayout>
  );
}

// ==================== Rating Component ====================
function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star className={`w-6 h-6 ${n <= value ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
}

// ==================== Form Field Renderer ====================
function FormFieldInput({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[80px]"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      );
    case 'dropdown':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{field.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    case 'rating':
      return <RatingInput value={Number(value) || 0} onChange={v => onChange(String(v))} />;
    case 'radio':
      return (
        <RadioGroup value={value} onValueChange={onChange} className="mt-1 space-y-1">
          {field.options?.map(o => (
            <div key={o} className="flex items-center gap-2">
              <RadioGroupItem value={o} id={`${field.id}-${o}`} />
              <Label htmlFor={`${field.id}-${o}`} className="font-normal text-sm">{o}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    case 'multi_select': {
      const selected = value ? value.split('||') : [];
      const toggle = (opt: string) => {
        const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
        onChange(next.join('||'));
      };
      return (
        <div className="mt-1 space-y-1">
          {field.options?.map(o => (
            <div key={o} className="flex items-center gap-2">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} id={`${field.id}-${o}`} />
              <Label htmlFor={`${field.id}-${o}`} className="font-normal text-sm">{o}</Label>
            </div>
          ))}
        </div>
      );
    }
    default:
      return (
        <Input
          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-1"
        />
      );
  }
}

// ==================== Fill Form ====================
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
                  <FormFieldInput
                    field={field}
                    value={fillData[field.id] || ''}
                    onChange={v => setFillData({ ...fillData, [field.id]: v })}
                  />
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

// ==================== View Responses ====================
function ViewResponsesSheet({ formId, forms, onClose }: { formId: string | null; forms: any[]; onClose: () => void }) {
  const { data: responses = [] } = useFormResponses(formId || undefined);
  const form = forms.find((f) => f.id === formId);
  const formFields = (form?.fields as any as FormField[]) || [];

  const formatValue = (field: FormField, val: string) => {
    if (!val) return '—';
    if (field.type === 'rating') return '⭐'.repeat(Number(val) || 0);
    if (field.type === 'multi_select') return val.split('||').join(', ');
    return val;
  };

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
                      <span className="text-sm font-medium">{formatValue(field, (resp.data as any)?.[field.id] || '')}</span>
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
