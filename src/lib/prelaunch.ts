// Pre-launch module gating configuration
export const SUPER_ADMIN_EMAIL = 'suvee.fashion@gmail.com';
export const SUPER_ADMIN_EMAILS = ['suvee.fashion@gmail.com', 'shrirajglobal@gmail.com'];

// Modules available during pre-launch
export const PRE_LAUNCH_MODULES = [
  'dashboard', 'ideas', 'tasks', 'crm', 'contacts', 'settings',
];

// Modules gated as "Coming Soon" (currently none — all built modules are gated by plan tier instead)
export const COMING_SOON_MODULES: string[] = [];

// Route-to-module mapping
export const ROUTE_MODULE_MAP: Record<string, string> = {
  '/attendance': 'attendance',
  '/forms': 'forms',
  '/engagement': 'engagement',
  '/finance': 'finance',
  '/inventory': 'inventory',
  '/vendors': 'vendors',
  '/compliance': 'compliance',
  '/analytics': 'analytics',
  '/reports': 'reports',
  '/assistant': 'assistant',
  '/branches': 'branches',
  '/partners': 'partner_network',
  '/fee-plans': 'fee_schedule',
};

export function isSuperAdmin(email?: string | null): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isModuleAvailable(module: string, userEmail?: string | null): boolean {
  if (isSuperAdmin(userEmail)) return true;
  return !COMING_SOON_MODULES.includes(module);
}

export function isComingSoonModule(module: string, userEmail?: string | null): boolean {
  if (isSuperAdmin(userEmail)) return false;
  return COMING_SOON_MODULES.includes(module);
}
