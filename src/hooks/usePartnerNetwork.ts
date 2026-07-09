import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// -------- vendor_products --------
export function useVendorProducts() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['vendor_products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_products')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateVendorProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('vendor_products').insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor_products'] }),
  });
}

// -------- commission_rules --------
export function useCommissionRules() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['commission_rules', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('business_id', businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useUpsertCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('commission_rules').insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission_rules'] }),
  });
}

/** Find the applicable commission rule for a vendor. Returns null if none. */
export function findApplicableRule(rules: any[] | undefined, vendorId: string) {
  if (!rules) return null;
  return (
    rules.find((r) => r.vendor_id === vendorId) ||
    rules.find((r) => r.vendor_id === null) ||
    null
  );
}

export function calcCommission(rule: any | null, amount: number): number | null {
  if (!rule || !amount || amount <= 0) return null;
  if (rule.rate_type === 'percentage') {
    return Math.round(amount * (Number(rule.rate_value) / 100) * 100) / 100;
  }
  return Math.round(Number(rule.rate_value) * 100) / 100;
}

// -------- partner_orders --------
export function usePartnerOrders() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['partner_orders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_orders')
        .select('*')
        .eq('business_id', businessId!)
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreatePartnerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      client_id: string;
      vendor_id: string;
      vendor_product_id: string | null;
      amount: number;
      order_date: string;
      notes: string | null;
      commission_amount: number;
    }) => {
      const { data, error } = await supabase.rpc('create_partner_order_with_commission', {
        _client_id: args.client_id,
        _vendor_id: args.vendor_id,
        _vendor_product_id: args.vendor_product_id,
        _amount: args.amount,
        _order_date: args.order_date,
        _notes: args.notes,
        _commission_amount: args.commission_amount,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner_orders'] });
      qc.invalidateQueries({ queryKey: ['commission_transactions'] });
      qc.invalidateQueries({ queryKey: ['client_vendor_balances'] });
    },
  });
}

export function useUpdatePartnerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from('partner_orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner_orders'] });
      qc.invalidateQueries({ queryKey: ['commission_transactions'] });
      qc.invalidateQueries({ queryKey: ['client_vendor_balances'] });
    },
  });
}

// -------- commission_transactions --------
export function useCommissionTransactions() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['commission_transactions', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useUpdateCommissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'received' | 'written_off' }) => {
      const updates: any = { status };
      if (status === 'received') updates.received_date = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('commission_transactions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission_transactions'] }),
  });
}

// -------- client_vendor_balances (view) --------
export function useClientVendorBalances() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['client_vendor_balances', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_vendor_balances')
        .select('*')
        .eq('business_id', businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}
