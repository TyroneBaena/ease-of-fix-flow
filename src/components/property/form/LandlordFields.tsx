import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { landlordsService, Landlord } from '@/services/landlordsService';
import { Search, Plus, Pencil } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const landlordSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  email: z.string().trim().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  office_address: z.string().optional(),
  postal_address: z.string().optional(),
});

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

  // Create form
  const createForm = useForm<z.infer<typeof landlordSchema>>({
    resolver: zodResolver(landlordSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      office_address: '',
      postal_address: '',
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof landlordSchema>>({
    resolver: zodResolver(landlordSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      office_address: '',
      postal_address: '',
    },
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

  const submitCreate = async (data: z.infer<typeof landlordSchema>) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        office_address: data.office_address || undefined,
        postal_address: data.postal_address || undefined,
      };
      const l = await landlordsService.create(payload);
      setSelected(l);
      onChange(l.id);
      setCreateOpen(false);
      createForm.reset();
      toast.success('Landlord created');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create landlord');
    }
  };

  const openEdit = () => {
    if (!selected) return;
    editForm.reset({
      name: selected.name || '',
      email: selected.email || '',
      phone: selected.phone || '',
      office_address: selected.office_address || '',
      postal_address: selected.postal_address || '',
    });
    setEditOpen(true);
  };

  const submitEdit = async (data: z.infer<typeof landlordSchema>) => {
    if (!selected) return;
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        office_address: data.office_address || undefined,
        postal_address: data.postal_address || undefined,
      };
      await landlordsService.update(selected.id, payload);
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
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(submitCreate)} className="space-y-3">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email*</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="office_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="postal_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                      <Button type="submit">Create</Button>
                    </DialogFooter>
                  </form>
                </Form>
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
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-3">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="office_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="postal_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
