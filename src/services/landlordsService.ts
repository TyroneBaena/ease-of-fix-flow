import { supabase } from '@/lib/supabase';

export interface Landlord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  office_address?: string | null;
  postal_address?: string | null;
  created_at: string;
  updated_at: string;
}

const sb: any = supabase; // Loosen typing until Supabase types are regenerated to include `landlords`

export const landlordsService = {
  async search(term: string): Promise<Landlord[]> {
    const { data, error } = await sb
      .from('landlords')
      .select('id,name,email,phone,office_address,postal_address,created_at,updated_at')
      .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(20);
    if (error) throw error;
    return (data as unknown) as Landlord[];
  },

  async getById(id: string): Promise<Landlord | null> {
    const { data, error } = await sb
      .from('landlords')
      .select('id,name,email,phone,office_address,postal_address,created_at,updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown) as Landlord | null;
  },

  async getByEmail(email: string): Promise<Landlord | null> {
    const { data, error } = await sb
      .from('landlords')
      .select('id,name,email,phone,office_address,postal_address,created_at,updated_at')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown) as Landlord | null;
  },

  async create(payload: { name: string; email: string; phone?: string; office_address?: string; postal_address?: string; }): Promise<Landlord> {
    const { data, error } = await sb
      .from('landlords')
      .insert(payload)
      .select('id,name,email,phone,office_address,postal_address,created_at,updated_at')
      .single();
    if (error) throw error;
    return (data as unknown) as Landlord;
  },

  async update(id: string, payload: Partial<{ name: string; email: string; phone: string; office_address: string; postal_address: string; }>): Promise<void> {
    const { error } = await sb
      .from('landlords')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  }
};
