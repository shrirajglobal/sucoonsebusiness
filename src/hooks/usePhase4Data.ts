import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// ==================== Transactions ====================
export function useTransactions() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['transactions', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from('transactions').insert(t);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

// ==================== Inventory ====================
export function useInventory() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['inventory', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from('inventory_items').insert(item);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('inventory_items').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

// ==================== Vendors ====================
export function useVendors() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['vendors', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('business_id', businessId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase.from('vendors').insert(v);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('vendors').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

// ==================== Purchase Orders ====================
export function usePurchaseOrders() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['purchase_orders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, vendors(name)')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (po: any) => {
      const { error } = await supabase.from('purchase_orders').insert(po);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  });
}

// ==================== Compliance ====================
export function useComplianceEvents() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['compliance', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_events')
        .select('*')
        .eq('business_id', businessId!)
        .order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateComplianceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: any) => {
      const { error } = await supabase.from('compliance_events').insert(e);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
  });
}

export function useUpdateComplianceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('compliance_events').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
  });
}

export function useDeleteComplianceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
  });
}

// ==================== Branches ====================
export function useBranches() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['branches', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: any) => {
      const { error } = await supabase.from('branches').insert(b);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('branches').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}
