import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export type FeePlan = {
  id: string;
  business_id: string;
  client_id: string;
  plan_name: string;
  total_amount: number;
  installment_count: number;
  start_date: string;
  created_at: string;
  updated_at: string;
};

export type FeeInstallment = {
  id: string;
  business_id: string;
  fee_plan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
};

export function useFeePlans() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['fee_plans', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fee_plans')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeePlan[];
    },
    enabled: !!businessId,
  });
}

export function useFeeInstallments(planId: string | null) {
  return useQuery({
    queryKey: ['fee_installments', planId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fee_installments')
        .select('*')
        .eq('fee_plan_id', planId!)
        .order('installment_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeeInstallment[];
    },
    enabled: !!planId,
  });
}

export function useCreateFeePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      plan_name: string;
      total_amount: number;
      installment_count: number;
      start_date: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('create_fee_plan_with_installments', {
        _client_id: input.client_id,
        _plan_name: input.plan_name,
        _total_amount: input.total_amount,
        _installment_count: input.installment_count,
        _start_date: input.start_date,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee_plans'] }),
  });
}

export function useMarkInstallmentPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await (supabase as any)
        .from('fee_installments')
        .update({
          status: paid ? 'paid' : 'pending',
          paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee_installments'] });
      qc.invalidateQueries({ queryKey: ['fee_plans'] });
    },
  });
}
