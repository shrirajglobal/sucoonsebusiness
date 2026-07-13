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

// -------- products (standalone catalog, decoupled from vendor — Phase 2) --------
export function useProducts() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
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
      lr_number?: string | null;
      due_date?: string | null;
      payment_terms?: string | null;
      discount_amount?: number;
    }) => {
      const { data, error } = await supabase.rpc('create_partner_order_with_commission', {
        _client_id: args.client_id,
        _vendor_id: args.vendor_id,
        _vendor_product_id: args.vendor_product_id,
        _amount: args.amount,
        _order_date: args.order_date,
        _notes: args.notes,
        _lr_number: args.lr_number || null,
        _due_date: args.due_date || null,
        _payment_terms: args.payment_terms || null,
        _discount_amount: args.discount_amount || 0,
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

// Phase 7: Log an order without invoicing it yet.
export function useLogPartnerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      client_id: string;
      vendor_id: string;
      vendor_product_id: string | null;
      amount: number;
      order_date: string;
      notes: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc('create_partner_order_placed', {
        _client_id: args.client_id,
        _vendor_id: args.vendor_id,
        _vendor_product_id: args.vendor_product_id,
        _amount: args.amount,
        _order_date: args.order_date,
        _notes: args.notes,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner_orders'] });
    },
  });
}

// Phase 7: Convert a logged order into an invoice. Same commission logic as
// the direct bill flow (shared calculate_commission_for_rule helper).
export function useGenerateInvoiceForOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      order_id: string;
      lr_number: string | null;
      due_date: string | null;
      payment_terms: string | null;
      discount_amount: number;
      final_amount: number;
    }) => {
      const { error } = await (supabase as any).rpc('generate_invoice_for_order', {
        _order_id: args.order_id,
        _lr_number: args.lr_number,
        _due_date: args.due_date,
        _payment_terms: args.payment_terms,
        _discount_amount: args.discount_amount,
        _final_amount: args.final_amount,
      });
      if (error) throw error;
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

// -------- commission_overrides (audit log) --------
// commission_amount can only change via override_commission_amount(); direct table
// UPDATEs of that column are blocked at the grant level (see Phase 4 migration).
export function useCommissionOverrides() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['commission_overrides', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commission_overrides')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useOverrideCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { transaction_id: string; new_amount: number; reason: string }) => {
      const { error } = await (supabase as any).rpc('override_commission_amount', {
        _transaction_id: args.transaction_id,
        _new_amount: args.new_amount,
        _reason: args.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission_transactions'] });
      qc.invalidateQueries({ queryKey: ['commission_overrides'] });
      qc.invalidateQueries({ queryKey: ['client_vendor_balances'] });
    },
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
