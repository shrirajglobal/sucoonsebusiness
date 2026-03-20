import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect, { type SearchableOption } from '@/components/shared/SearchableSelect';
import { LEAD_SOURCES } from '@/lib/constants';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LeadFiltersProps {
  stages: string[];
  teamOptions: SearchableOption[];
  filterStage: string;
  filterSource: string;
  filterAssigned: string;
  filterCity: string;
  onStageChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  onAssignedChange: (v: string) => void;
  onCityChange: (v: string) => void;
  cities: string[];
}

export default function LeadFilters({
  stages,
  teamOptions,
  filterStage,
  filterSource,
  filterAssigned,
  filterCity,
  onStageChange,
  onSourceChange,
  onAssignedChange,
  onCityChange,
  cities,
}: LeadFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = filterStage !== 'all' || filterSource !== 'all' || filterAssigned || filterCity !== 'all';

  return (
    <div>
      <Button
        size="sm"
        variant={hasFilters ? 'default' : 'outline'}
        className="gap-1 h-8 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters {hasFilters && '•'}
      </Button>

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-2 [&>*]:w-full [&>*]:sm:w-auto">
          <Select value={filterStage} onValueChange={onStageChange}>
            <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSource} onValueChange={onSourceChange}>
            <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-full sm:w-[150px]">
            <SearchableSelect
              options={teamOptions}
              value={filterAssigned}
              onValueChange={onAssignedChange}
              placeholder="All Members"
              className="h-8 text-xs"
            />
          </div>

          <Select value={filterCity} onValueChange={onCityChange}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => {
                onStageChange('all');
                onSourceChange('all');
                onAssignedChange('');
                onCityChange('all');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
