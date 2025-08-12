import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { landlordsService, Landlord } from '@/services/landlordsService';
import { Search, Plus, Pencil } from 'lucide-react';
import { toast } from '@/lib/toast';

interface LandlordFieldsProps {
  landlordId?: string;
  onChange: (landlordId: string | null) => void;
}

export const LandlordFields: React.FC<LandlordFieldsProps> = ({ landlordId, onChange }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Landlord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '', email: '', phone: '', office_address: '', postal_address: ''
  });

  // Edit form state (copy of selected)
  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', office_address: '', postal_address: ''
  });

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!landlordId) { setSelected(null); return; }
      try {
        const l = await landlordsService.getById(landlordId);
        if (!ignore) {
          setSelected(l);
        }
      } catch (e: any) {
        console.error('Failed to load landlord', e);
      }
    };
    load();
    return () => { ignore = true; };
  }, [landlordId]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const list = await landlordsService.search(term.trim());
      setResults(list);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to search landlords');
    } finally {
      setLoading(false);
    }
  };

  const selectLandlord = (l: Landlord) => {
    setSelected(l);
    onChange(l.id);
    toast.success('Landlord selected');
  };

  const clearSelection = () => {
    setSelected(null);
    onChange(null);
  };

  const submitCreate = async () => {
    if (!createForm.name || !createForm.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      const l = await landlordsService.create(createForm);
      setSelected(l);
      onChange(l.id);
      setCreateOpen(false);
      toast.success('Landlord created');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create landlord');
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name || '',
      email: selected.email || '',
      phone: selected.phone || '',
      office_address: selected.office_address || '',
      postal_address: selected.postal_address || ''
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected) return;
    try {
      await landlordsService.update(selected.id, editForm);
      const updated = await landlordsService.getById(selected.id);
      setSelected(updated);
      toast.success('Landlord updated');
      setEditOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to update landlord');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Landlord</Label>
        {selected ? (
          <div className="mt-2 rounded-md border p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{selected.name}</div>
                <div className="text-sm text-gray-600">{selected.email}</div>
                <div className="text-sm text-gray-600">{selected.phone || 'No phone'}</div>
                {(selected.office_address || selected.postal_address) && (
                  <div className="mt-1 text-sm text-gray-600">
                    {selected.office_address && (<div>Office: {selected.office_address}</div>)}
                    {selected.postal_address && (<div>Postal: {selected.postal_address}</div>)}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Search name or email" value={term} onChange={(e) => setTerm(e.target.value)} />
              <Button type="button" onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-1" /> {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {results.length > 0 && (
              <div className="rounded-md border divide-y">
                {results.map((l) => (
                  <button key={l.id} type="button" className="w-full text-left p-2 hover:bg-gray-50" onClick={() => selectLandlord(l)}>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-sm text-gray-600">{l.email}{l.phone ? ` • ${l.phone}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
            <Separator className="my-2" />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Create new landlord
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create landlord</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="l_name">Name*</Label>
                    <Input id="l_name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="l_email">Email*</Label>
                    <Input id="l_email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="l_phone">Phone</Label>
                    <Input id="l_phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="l_office">Office Address</Label>
                    <Input id="l_office" value={createForm.office_address} onChange={(e) => setCreateForm({ ...createForm, office_address: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="l_postal">Postal Address</Label>
                    <Input id="l_postal" value={createForm.postal_address} onChange={(e) => setCreateForm({ ...createForm, postal_address: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={submitCreate}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit landlord</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="e_name">Name*</Label>
              <Input id="e_name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="e_email">Email*</Label>
              <Input id="e_email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="e_phone">Phone</Label>
              <Input id="e_phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="e_office">Office Address</Label>
              <Input id="e_office" value={editForm.office_address || ''} onChange={(e) => setEditForm({ ...editForm, office_address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="e_postal">Postal Address</Label>
              <Input id="e_postal" value={editForm.postal_address || ''} onChange={(e) => setEditForm({ ...editForm, postal_address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
