import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function useContacts() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['contacts', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: { business_id: string; name: string; company?: string; designation?: string; phone?: string; email?: string; address?: string; website?: string; notes?: string; source?: string }) => {
      const { data, error } = await supabase.from('contacts').insert(contact).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; company?: string; designation?: string; phone?: string; email?: string; address?: string; website?: string; notes?: string; source?: string }) => {
      const { error } = await supabase.from('contacts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useCardScans() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['card_scans', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('card_scans').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateCardScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scan: { business_id: string; image_url?: string; extracted_data?: Record<string, unknown>; contact_id?: string; lead_id?: string; scanned_by?: string }) => {
      const { data, error } = await supabase.from('card_scans').insert(scan).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['card_scans'] }),
  });
}
