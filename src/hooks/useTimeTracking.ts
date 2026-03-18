import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function useTimeEntries(taskId?: string) {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['time_entries', businessId, taskId],
    queryFn: async () => {
      let q = supabase.from('time_entries').select('*').eq('business_id', businessId!);
      if (taskId) q = q.eq('task_id', taskId);
      const { data, error } = await q.order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { task_id: string; business_id: string; user_id: string }) => {
      const { error } = await supabase.from('time_entries').insert(entry);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; ended_at?: string; duration_minutes?: number }) => {
      const { error } = await supabase.from('time_entries').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  });
}
