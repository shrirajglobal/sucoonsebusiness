import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

interface ExportMenuProps {
  onCSV: () => void;
  onPDF: () => void;
  label?: string;
}

export default function ExportMenu({ onCSV, onPDF, label = 'Export' }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Download className="w-4 h-4" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCSV}>📊 Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={onPDF}>📄 Export PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
