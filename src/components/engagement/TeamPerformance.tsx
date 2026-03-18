import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props {
  customers: any[];
  contactLogs: any[];
  teamMembers: any[];
  ownerName: string;
}

export default function TeamPerformance({ customers, contactLogs, teamMembers, ownerName }: Props) {
  const data = useMemo(() => {
    const members = [
      { id: 'owner', name: ownerName || 'Owner' },
      ...teamMembers.map((m) => ({ id: m.user_id || m.id, name: m.name })),
    ];

    return members.map((m) => {
      const logs30d = contactLogs.filter((l) => {
        if (l.logged_by !== m.id) return false;
        if (!l.contact_date) return false;
        return Math.floor((Date.now() - new Date(l.contact_date).getTime()) / 86400000) <= 30;
      });
      const assigned = customers.filter((c) => c.assigned_to === m.id);
      const positive = logs30d.filter((l) => l.outcome === 'positive').length;
      const followUp = logs30d.filter((l) => l.outcome === 'follow_up').length;
      return {
        ...m,
        totalLogs: logs30d.length,
        assigned: assigned.length,
        positive,
        followUp,
        rate: logs30d.length > 0 ? Math.round((positive / logs30d.length) * 100) : 0,
      };
    }).sort((a, b) => b.totalLogs - a.totalLogs);
  }, [customers, contactLogs, teamMembers, ownerName]);

  return (
    <Card className="p-5 card-shadow">
      <h3 className="text-sm font-semibold mb-4">Team Contact Performance (30 Days)</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No team data.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-center">Contacts</TableHead>
                <TableHead className="text-center">Assigned</TableHead>
                <TableHead className="text-center">Positive</TableHead>
                <TableHead className="text-center">Follow Up</TableHead>
                <TableHead className="text-center">Success %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-sm">{m.name}</TableCell>
                  <TableCell className="text-center tabular-nums">{m.totalLogs}</TableCell>
                  <TableCell className="text-center tabular-nums">{m.assigned}</TableCell>
                  <TableCell className="text-center tabular-nums text-success">{m.positive}</TableCell>
                  <TableCell className="text-center tabular-nums text-warning">{m.followUp}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="tabular-nums">{m.rate}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
