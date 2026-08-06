import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
export type CreateExtras = { opening_balance?: number };

interface Props {
  value: string;
  onChange: (id: string) => void;
  options: CreatableOption[];
  onCreate: (name: string, extras?: CreateExtras) => Promise<CreatableOption>;
  createLabel: string; // e.g. "Vendor", "Client", "Product"
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When true, an "Opening balance" input is shown before final creation. */
  promptOpeningBalance?: boolean;
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
  promptOpeningBalance,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagedName, setStagedName] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');

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

  const showCreate = !!trimmed && !hasExactMatch && !creating && !stagedName;

  const resetStaged = () => { setStagedName(null); setOpeningBalance(''); };

  const doCreate = async (name: string, extras?: CreateExtras) => {
    setError(null);
    setCreating(true);
    try {
      const created = await onCreate(name, extras);
      onChange(created.id);
      setSearch('');
      resetStaged();
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || `Couldn't create ${createLabel.toLowerCase()}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClick = async () => {
    if (!trimmed || creating) return;
    if (promptOpeningBalance) {
      // Show the inline opening-balance step; don't create yet.
      setStagedName(trimmed);
      return;
    }
    await doCreate(trimmed);
  };

  const handleConfirmStaged = async () => {
    if (!stagedName) return;
    const ob = openingBalance.trim() ? Number(openingBalance) : undefined;
    if (ob != null && (isNaN(ob) || ob < 0)) {
      setError('Opening balance must be zero or greater');
      return;
    }
    await doCreate(stagedName, ob != null ? { opening_balance: ob } : undefined);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); resetStaged(); } }}>
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
        {stagedName ? (
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Adding <span className="font-medium text-foreground">{stagedName}</span> as a new {createLabel.toLowerCase()}.
            </p>
            <div>
              <Label className="text-xs">Opening balance (₹) <span className="text-muted-foreground">— optional</span></Label>
              <Input
                type="number"
                className="h-8 mt-1"
                placeholder="Amount already owed before Suvee"
                value={openingBalance}
                onChange={(e) => { setOpeningBalance(e.target.value); setError(null); }}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-8" onClick={handleConfirmStaged} disabled={creating}>
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={resetStaged} disabled={creating}>Back</Button>
            </div>
          </div>
        ) : (
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
                    onSelect={handleCreateClick}
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
        )}
      </PopoverContent>
    </Popover>
  );
}
