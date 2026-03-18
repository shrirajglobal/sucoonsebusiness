import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// ==================== Leave Types ====================
export function useLeaveTypes() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['leave_types', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_types').select('*').eq('business_id', businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lt: { business_id: string; name: string; days_per_year: number; is_paid: boolean }) => {
      const { error } = await supabase.from('leave_types').insert(lt);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_types'] }),
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leave_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_types'] }),
  });
}

// ==================== Leave Requests ====================
export function useLeaveRequests() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['leave_requests', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_requests').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lr: {
      business_id: string; user_id: string; user_name: string;
      leave_type_id?: string; leave_type_name: string;
      start_date: string; end_date: string; days: number; reason?: string;
    }) => {
      const { error } = await supabase.from('leave_requests').insert(lr);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_requests'] }),
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; reviewed_by?: string; reviewed_at?: string }) => {
      const { error } = await supabase.from('leave_requests').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_requests'] }),
  });
}

// ==================== Shifts ====================
export function useShifts() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['shifts', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('shifts').select('*').eq('business_id', businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { business_id: string; name: string; start_time: string; end_time: string }) => {
      const { error } = await supabase.from('shifts').insert(s);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

// ==================== Monthly Attendance ====================
export function useMonthlyAttendance(year: number, month: number) {
  const { businessId } = useAuth();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['attendance_monthly', businessId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('business_id', businessId!)
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}
