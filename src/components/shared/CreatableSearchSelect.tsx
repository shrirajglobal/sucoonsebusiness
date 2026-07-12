import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export type CreatableOption = { id: string; label: string };

interface Props {
  value: string;
  onChange: (id: string) => void;
  options: CreatableOption[];
  onCreate: (name: string) => Promise<CreatableOption>;
  createLabel: string; // e.g. "Vendor", "Client", "Product"
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function CreatableSearchSelect({
  value,
  onChange,
  options,
  onCreate,
  createLabel,
  placeholder,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = options.find((o) => o.id === value);

  const trimmed = search.trim();
  const lowered = trimmed.toLowerCase();

  const filtered = useMemo(
    () =>
      !lowered
        ? options
        : options.filter((o) => o.label.toLowerCase().includes(lowered)),
    [options, lowered]
  );

  const hasExactMatch = useMemo(
    () =>
      !!trimmed &&
      options.some((o) => o.label.trim().toLowerCase() === lowered),
    [options, trimmed, lowered]
  );

  const showCreate = !!trimmed && !hasExactMatch && !creating;

  const handleCreate = async () => {
    if (!trimmed || creating) return;
    setError(null);
    setCreating(true);
    try {
      const created = await onCreate(trimmed);
      onChange(created.id);
      setSearch('');
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || `Couldn't create ${createLabel.toLowerCase()}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full h-9 justify-between font-normal', className)}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label || placeholder || `Select ${createLabel.toLowerCase()}`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search or add ${createLabel.toLowerCase()}…`}
            value={search}
            onValueChange={(v) => { setSearch(v); setError(null); }}
          />
          <CommandList>
            {filtered.length === 0 && !showCreate && (
              <CommandEmpty>No {createLabel.toLowerCase()} found.</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.id}
                    onSelect={() => {
                      onChange(o.id);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === o.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create_${trimmed}`}
                  onSelect={handleCreate}
                  className="text-primary"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  <span className="truncate">
                    Add "{trimmed}" as new {createLabel.toLowerCase()}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {creating && !showCreate && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Creating…
              </div>
            )}
            {error && (
              <div className="px-3 py-2 text-xs text-destructive border-t">
                {error}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
