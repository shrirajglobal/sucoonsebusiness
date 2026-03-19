import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Repeat } from 'lucide-react';

export interface Recurrence {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
}

interface RecurrenceSelectProps {
  value: Recurrence;
  onChange: (v: Recurrence) => void;
}

const OPTIONS = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Every Day' },
  { value: 'weekly', label: 'Every Week' },
  { value: 'monthly', label: 'Every Month' },
  { value: 'custom', label: 'Custom (days)' },
];

export function getNextDueDate(currentDue: string, recurrence: Recurrence): string {
  const d = new Date(currentDue);
  switch (recurrence.type) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'custom': d.setDate(d.getDate() + (recurrence.interval || 1)); break;
    default: return currentDue;
  }
  return d.toISOString().split('T')[0];
}

export default function RecurrenceSelect({ value, onChange }: RecurrenceSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> Repeat</Label>
      <Select value={value.type} onValueChange={(t) => onChange({ ...value, type: t as Recurrence['type'] })}>
        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {value.type === 'custom' && (
        <Input
          type="number"
          min={1}
          max={365}
          value={value.interval || 1}
          onChange={(e) => onChange({ ...value, interval: parseInt(e.target.value) || 1 })}
          placeholder="Every N days"
          className="mt-1"
        />
      )}
    </div>
  );
}
