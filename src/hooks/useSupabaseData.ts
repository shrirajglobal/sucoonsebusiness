import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// ==================== Business ====================
export function useBusiness() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  const { businessId } = useAuth();
  return useMutation({
    mutationFn: async (updates: TablesUpdate<'businesses'>) => {
      if (!businessId) throw new Error('No business');
      const { error } = await supabase.from('businesses').update(updates).eq('id', businessId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }),
  });
}

// ==================== Tasks ====================
export function useTasks() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['tasks', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: TablesInsert<'tasks'>) => {
      const { error } = await supabase.from('tasks').insert(task);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'tasks'> & { id: string }) => {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useBulkUpdateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: TablesUpdate<'tasks'> }) => {
      const { error } = await supabase.from('tasks').update(updates).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('tasks').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ==================== Leads ====================
export function useLeads() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['leads', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: TablesInsert<'leads'>) => {
      const { error } = await supabase.from('leads').insert(lead);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'leads'> & { id: string }) => {
      const { error } = await supabase.from('leads').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

// ==================== Attendance ====================
export function useAttendance(date?: string) {
  const { businessId } = useAuth();
  const d = date || new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['attendance', businessId, d],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance_records').select('*').eq('business_id', businessId!).eq('date', d);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: TablesInsert<'attendance_records'>) => {
      const { error } = await supabase.from('attendance_records').insert(record);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'attendance_records'> & { id: string }) => {
      const { error } = await supabase.from('attendance_records').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

// ==================== Forms ====================
export function useForms() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['forms', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('forms').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: TablesInsert<'forms'>) => {
      const { error } = await supabase.from('forms').insert(form);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useFormResponses(formId?: string) {
  return useQuery({
    queryKey: ['form_responses', formId],
    queryFn: async () => {
      const { data, error } = await supabase.from('form_responses').select('*').eq('form_id', formId!).order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!formId,
  });
}

export function useCreateFormResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (response: TablesInsert<'form_responses'>) => {
      const { error } = await supabase.from('form_responses').insert(response);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form_responses'] }),
  });
}

// ==================== Customers ====================
export function useCustomers() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['customers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('business_id', businessId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: TablesInsert<'customers'>) => {
      const { error } = await supabase.from('customers').insert(customer);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'customers'> & { id: string }) => {
      const { error } = await supabase.from('customers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ==================== Contact Logs ====================
export function useAllContactLogs() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['all_contact_logs', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_logs').select('*, customers!inner(business_id)').eq('customers.business_id', businessId!).order('contact_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useContactLogs(customerId?: string) {
  return useQuery({
    queryKey: ['contact_logs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_logs').select('*').eq('customer_id', customerId!).order('contact_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCreateContactLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: TablesInsert<'contact_logs'>) => {
      const { error } = await supabase.from('contact_logs').insert(log);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact_logs'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ==================== Team Members ====================
export function useTeamMembers() {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['team_members', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*').eq('business_id', businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: TablesInsert<'team_members'>) => {
      const { error } = await supabase.from('team_members').insert(member);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team_members'] }),
  });
}

// Invite a team member via edge function: creates/updates the team_members row
// AND sends an invite email so they can set a password and join the business.
export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      name?: string;
      phone?: string;
      department?: string;
      salary?: number;
      designation?: string;
      role?: 'admin' | 'manager' | 'executive' | 'field_staff';
      team_member_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: payload,
      });
      if (error) {
        // Try to surface the edge function's error body when available
        const ctx = (error as { context?: { text?: () => Promise<string> } }).context;
        const detail = ctx && typeof ctx.text === 'function' ? await ctx.text() : error.message;
        throw new Error(detail || 'Failed to send invite');
      }
      if (data?.error) throw new Error(data.error);
      return data as {
        status: 'invited' | 'user_exists' | 'already_linked';
        message?: string;
        team_member_id?: string;
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team_members'] }),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team_members'] }),
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'team_members'> & { id: string }) => {
      const { error } = await supabase.from('team_members').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team_members'] }),
  });
}

// ==================== Sub-Tasks ====================
export function useSubTasks(taskId?: string) {
  return useQuery({
    queryKey: ['sub_tasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from('sub_tasks').select('*').eq('task_id', taskId!).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useCreateSubTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subTask: { task_id: string; title: string; sort_order?: number }) => {
      const { error } = await supabase.from('sub_tasks').insert(subTask);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['sub_tasks', v.task_id] }),
  });
}

export function useUpdateSubTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id, ...updates }: { id: string; task_id: string; is_completed?: boolean; title?: string }) => {
      const { error } = await supabase.from('sub_tasks').update(updates).eq('id', id);
      if (error) throw error;
      return task_id;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['sub_tasks', v.task_id] }),
  });
}

export function useDeleteSubTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase.from('sub_tasks').delete().eq('id', id);
      if (error) throw error;
      return task_id;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['sub_tasks', v.task_id] }),
  });
}

// ==================== Lead by ID ====================
export function useLead(id?: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
