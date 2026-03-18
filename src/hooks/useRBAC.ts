import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// ==================== RBAC ====================
export function useUserRole() {
  const { user, businessId } = useAuth();
  return useQuery({
    queryKey: ['user_role', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('business_id', businessId!)
        .single();
      if (error) return 'executive' as const; // default role
      return data.role;
    },
    enabled: !!user?.id && !!businessId,
  });
}

export type AppRole = 'owner' | 'admin' | 'manager' | 'executive' | 'field_staff';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  executive: 2,
  field_staff: 1,
};

export function hasMinRole(userRole: AppRole | undefined, minRole: AppRole): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

// ==================== Activity Logs ====================
export function useActivityLogs(limit = 50) {
  const { businessId } = useAuth();
  return useQuery({
    queryKey: ['activity_logs', businessId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useLogActivity() {
  const { user, businessId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      action: string;
      entity_type: string;
      entity_id?: string;
      entity_label?: string;
      metadata?: Record<string, any>;
      user_name?: string;
    }) => {
      if (!businessId || !user?.id) return;
      const { error } = await supabase.from('activity_logs').insert({
        business_id: businessId,
        user_id: user.id,
        user_name: log.user_name || user.email || '',
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id || null,
        entity_label: log.entity_label || null,
        metadata: log.metadata || {},
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity_logs'] }),
  });
}
