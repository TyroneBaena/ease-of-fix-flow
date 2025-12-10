import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, ArrowRightLeft, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Housemate, RENT_PERIOD_LABELS } from '@/types/housemate';

interface HousematesTableProps {
  housemates: Housemate[];
  loading: boolean;
  isAdmin: boolean;
  onView: (housemate: Housemate) => void;
  onEdit: (housemate: Housemate) => void;
  onMove: (housemate: Housemate) => void;
  onArchive: (housemate: Housemate) => void;
  onUnarchive: (housemate: Housemate) => void;
  onDelete: (housemate: Housemate) => void;
}

export const HousematesTable: React.FC<HousematesTableProps> = ({
  housemates,
  loading,
  isAdmin,
  onView,
  onEdit,
  onMove,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (housemates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No housemates found. Add a housemate to get started.
      </div>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Rent & Utilities</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {housemates.map((housemate) => (
            <TableRow key={housemate.id}>
              <TableCell className="font-medium">
                {housemate.firstName} {housemate.lastName}
              </TableCell>
              <TableCell>{formatCurrency(housemate.rentUtilitiesAmount)}</TableCell>
              <TableCell>{RENT_PERIOD_LABELS[housemate.rentPeriod]}</TableCell>
              <TableCell>
                {housemate.isArchived ? (
                  <Badge variant="secondary">Archived</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(housemate)}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(housemate)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMove(housemate)}
                      title="Move to another property"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  )}
                  {housemate.isArchived ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUnarchive(housemate)}
                      title="Restore"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onArchive(housemate)}
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(housemate)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
