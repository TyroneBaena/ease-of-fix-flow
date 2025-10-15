import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Ban, Eye, Copy, Check } from 'lucide-react';
import { invitationCodeService, InvitationCode } from '@/services/invitationCodeService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface InvitationCodesTableProps {
  codes: InvitationCode[];
  onRefresh: () => void;
}

export const InvitationCodesTable = ({ codes, onRefresh }: InvitationCodesTableProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<InvitationCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: 'Copied',
      description: 'Code copied to clipboard',
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRevoke = async () => {
    if (!selectedCode) return;

    const { success, error } = await invitationCodeService.revokeCode(selectedCode.id);
    
    if (success) {
      toast({
        title: 'Success',
        description: 'Invitation code has been revoked',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to revoke code',
        variant: 'destructive',
      });
    }
    
    setRevokeDialogOpen(false);
    setSelectedCode(null);
  };

  const handleDelete = async () => {
    if (!selectedCode) return;

    const { success, error } = await invitationCodeService.deleteCode(selectedCode.id);
    
    if (success) {
      toast({
        title: 'Success',
        description: 'Invitation code has been deleted',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete code',
        variant: 'destructive',
      });
    }
    
    setDeleteDialogOpen(false);
    setSelectedCode(null);
  };

  const getStatusBadge = (code: InvitationCode) => {
    const now = new Date();
    const expiresAt = new Date(code.expires_at);
    const isExpired = expiresAt < now;
    const isMaxedOut = code.current_uses >= code.max_uses;

    if (!code.is_active) {
      return <Badge variant="secondary">Revoked</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isMaxedOut) {
      return <Badge variant="secondary">Used Up</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Active</Badge>;
  };

  if (codes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No invitation codes yet. Generate one to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((code) => (
              <TableRow key={code.id}>
                <TableCell className="font-mono font-medium">
                  <div className="flex items-center gap-2">
                    {code.code}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(code.code)}
                      className="h-6 w-6 p-0"
                    >
                      {copiedCode === code.code ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{code.assigned_role}</TableCell>
                <TableCell>{getStatusBadge(code)}</TableCell>
                <TableCell>
                  {code.current_uses} / {code.max_uses}
                </TableCell>
                <TableCell>
                  {new Date(code.expires_at) < new Date()
                    ? 'Expired'
                    : formatDistanceToNow(new Date(code.expires_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(code.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {code.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCode(code);
                          setRevokeDialogOpen(true);
                        }}
                        className="h-8"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCode(code);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 text-destructive hover:text-destructive"
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

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this code? It will no longer be usable, but its history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this code? This action cannot be undone and all usage history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
