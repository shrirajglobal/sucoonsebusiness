import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type ImportTarget = 'contacts' | 'leads' | 'customers';

const COLUMN_MAPS: Record<ImportTarget, { required: string[]; optional: string[] }> = {
  contacts: { required: ['name'], optional: ['company', 'designation', 'phone', 'email', 'address', 'notes', 'source', 'website'] },
  leads: { required: ['name', 'stage'], optional: ['company', 'phone', 'email', 'value', 'source', 'city', 'notes', 'product_interest'] },
  customers: { required: ['name'], optional: ['company', 'phone', 'email', 'tier', 'lifetime_value', 'notes'] },
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default function CSVImport() {
  const { businessId, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ImportTarget>('contacts');
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed(null);
    setMapping({});
    setResult(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const data = parseCSV(text);
      if (data.headers.length === 0) { toast.error('Could not parse CSV'); return; }
      setParsed(data);
      // Auto-map by matching header names
      const cols = COLUMN_MAPS[target];
      const allFields = [...cols.required, ...cols.optional];
      const autoMap: Record<string, string> = {};
      allFields.forEach((field) => {
        const idx = data.headers.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, '') === field.replace(/_/g, ''));
        if (idx >= 0) autoMap[field] = String(idx);
      });
      setMapping(autoMap);
      setResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const doImport = async () => {
    if (!parsed || !businessId) return;
    const cols = COLUMN_MAPS[target];
    const missingRequired = cols.required.filter((r) => !mapping[r]);
    if (missingRequired.length > 0) {
      toast.error(`Map required columns: ${missingRequired.join(', ')}`);
      return;
    }

    setImporting(true);
    let success = 0;
    let errors = 0;

    const batchSize = 50;
    for (let i = 0; i < parsed.rows.length; i += batchSize) {
      const batch = parsed.rows.slice(i, i + batchSize);
      const records = batch.map((row) => {
        const rec: Record<string, any> = { business_id: businessId };
        Object.entries(mapping).forEach(([field, colIdx]) => {
          const val = row[Number(colIdx)]?.trim() || '';
          if (val) {
            if (['value', 'lifetime_value'].includes(field)) rec[field] = Number(val) || 0;
            else if (field === 'tier') rec[field] = ['A', 'B', 'C'].includes(val.toUpperCase()) ? val.toUpperCase() : 'B';
            else rec[field] = val;
          }
        });
        if (target === 'leads' && !rec.stage) rec.stage = 'New';
        if (target === 'leads') rec.created_by = user?.id;
        return rec;
      });

      const { error } = await supabase.from(target).insert(records as any);
      if (error) {
        errors += batch.length;
      } else {
        success += batch.length;
      }
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0) toast.success(`Imported ${success} records`);
    if (errors > 0) toast.error(`${errors} records failed`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Upload className="w-4 h-4" /> CSV Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> CSV Bulk Import</DialogTitle>
          <DialogDescription>Import contacts, leads, or customers from a CSV file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Import Into</Label>
            <Select value={target} onValueChange={(v) => { setTarget(v as ImportTarget); reset(); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="leads">Leads / CRM</SelectItem>
                <SelectItem value="customers">Customers / Engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!parsed ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Upload a CSV file with headers in the first row</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>Choose CSV File</Button>
              <div className="mt-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Required columns for {target}:</p>
                <p>{COLUMN_MAPS[target].required.join(', ')}</p>
                <p className="mt-1">Optional: {COLUMN_MAPS[target].optional.join(', ')}</p>
              </div>
            </div>
          ) : result ? (
            <div className="border rounded-lg p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm font-medium">Import Complete</p>
              <div className="flex justify-center gap-4 mt-2">
                <Badge variant="outline" className="text-success">{result.success} imported</Badge>
                {result.errors > 0 && <Badge variant="outline" className="text-destructive">{result.errors} failed</Badge>}
              </div>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { reset(); setOpen(false); }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Badge variant="outline">{parsed.rows.length} rows</Badge>
                <Badge variant="outline">{parsed.headers.length} columns</Badge>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground">Map CSV columns to fields:</p>
                {[...COLUMN_MAPS[target].required, ...COLUMN_MAPS[target].optional].map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs w-28 flex-shrink-0">
                      {field.replace(/_/g, ' ')}
                      {COLUMN_MAPS[target].required.includes(field) && <span className="text-destructive ml-1">*</span>}
                    </span>
                    <Select value={mapping[field] || ''} onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— skip —" /></SelectTrigger>
                      <SelectContent>
                        {parsed.headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {parsed.rows.length > 0 && (
                <div className="text-xs border rounded p-2 bg-muted/50 overflow-x-auto">
                  <p className="font-medium mb-1">Preview (first row):</p>
                  {parsed.headers.map((h, i) => (
                    <span key={i} className="inline-block mr-3"><span className="text-muted-foreground">{h}:</span> {parsed.rows[0]?.[i] || '—'}</span>
                  ))}
                </div>
              )}

              <Button onClick={doImport} disabled={importing} className="w-full">
                {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importing...</> : `Import ${parsed.rows.length} Records`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
