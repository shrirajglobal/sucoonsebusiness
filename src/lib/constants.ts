import type { BusinessType, BusinessCapabilityFlags } from '@/types';

export interface BusinessTypeConfig {
  id: BusinessType;
  label: string;
  emoji: string;
  stages: string[];
  taskTypes: string[];
  flags: BusinessCapabilityFlags;
}

export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  { id: 'manufacturing', label: 'Manufacturing', emoji: '🏭', stages: ['New Inquiry', 'Quotation', 'Negotiation', 'Order Confirmed', 'Dispatched'], taskTypes: ['Production', 'Quality Check', 'Dispatch', 'Purchase', 'Maintenance'],
    flags: { holds_inventory: true, has_vendor_layer: true, revenue_model: 'margin', relationship_arity: 'two_party' } },
  { id: 'trading', label: 'Trading', emoji: '📦', stages: ['New Lead', 'Sample Sent', 'Price Talk', 'Order Placed', 'Payment Done'], taskTypes: ['Follow Up', 'Procurement', 'Dispatch', 'Accounts', 'Vendor Meeting'],
    flags: { holds_inventory: true, has_vendor_layer: true, revenue_model: 'margin', relationship_arity: 'two_party' } },
  { id: 'services', label: 'Services / IT', emoji: '💻', stages: ['New Lead', 'Demo', 'Proposal', 'Negotiation', 'Closed Won'], taskTypes: ['Client Call', 'Proposal', 'Delivery', 'Support', 'Review', 'Milestone', 'Retainer Billing'],
    flags: { holds_inventory: false, has_vendor_layer: false, revenue_model: 'fee', relationship_arity: 'two_party' } },
  { id: 'agency', label: 'Agency / Broker', emoji: '🤝', stages: ['New Inquiry', 'Vendor Matched', 'Order Placed', 'Dispatched', 'Payment Received', 'Commission Collected'], taskTypes: ['Vendor Search', 'Client Follow Up', 'Order Tracking', 'Payment Followup', 'Commission Reconciliation'],
    flags: { holds_inventory: false, has_vendor_layer: true, revenue_model: 'commission', relationship_arity: 'three_party' } },
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠', stages: ['Inquiry', 'Site Visit', 'Negotiation', 'Agreement', 'Registration'], taskTypes: ['Site Visit', 'Follow Up', 'Documentation', 'Legal', 'Handover'],
    flags: { holds_inventory: false, has_vendor_layer: true, revenue_model: 'commission', relationship_arity: 'three_party' } },
  { id: 'education', label: 'Education', emoji: '🎓', stages: ['Enquiry', 'Demo Class', 'Follow Up', 'Admission', 'Fee Paid'], taskTypes: ['Counselling', 'Demo', 'Follow Up', 'Admission', 'Fee Collection'],
    flags: { holds_inventory: false, has_vendor_layer: false, revenue_model: 'installment', relationship_arity: 'two_party' } },
  { id: 'retail', label: 'Retail / Shop', emoji: '🛍️', stages: ['Walk In', 'Shown Product', 'Quotation', 'Purchase', 'Repeat'], taskTypes: ['Stock Check', 'Order Vendor', 'Display', 'Billing', 'Delivery'],
    flags: { holds_inventory: true, has_vendor_layer: true, revenue_model: 'margin', relationship_arity: 'two_party' } },
  { id: 'finance', label: 'Finance', emoji: '🏦', stages: ['Lead', 'Docs Received', 'Processing', 'Sanctioned', 'Disbursed'], taskTypes: ['KYC', 'Document', 'Processing', 'Disbursement', 'Recovery'],
    flags: { holds_inventory: false, has_vendor_layer: true, revenue_model: 'commission', relationship_arity: 'three_party' } },
  { id: 'custom', label: 'Custom', emoji: '⚙️', stages: ['Stage 1', 'Stage 2', 'Stage 3', 'Won', 'Lost'], taskTypes: ['Task Type 1', 'Task Type 2', 'Task Type 3'],
    flags: { holds_inventory: false, has_vendor_layer: false, revenue_model: 'fee', relationship_arity: 'two_party' } },
];

export const PARTNER_LABELS: Partial<Record<BusinessType, { partner: string; item: string; navLabel: string }>> = {
  agency: { partner: 'Vendor', item: 'Product', navLabel: 'Vendors & Commissions' },
  real_estate: { partner: 'Builder/Seller', item: 'Property Listing', navLabel: 'Partner Network' },
  finance: { partner: 'Bank / NBFC', item: 'Loan Product', navLabel: 'Partner Network' },
};

export function getPartnerLabels(type?: BusinessType | null): { partner: string; item: string; navLabel: string } {
  return (type && PARTNER_LABELS[type]) || { partner: 'Vendor', item: 'Product', navLabel: 'Partner Network' };
}

export const DEFAULT_MODULES = ['tasks', 'crm', 'attendance', 'forms', 'engagement', 'finance'];

export const CORE_MODULES: { id: string; label: string; emoji: string }[] = [
  { id: 'tasks', label: 'Tasks', emoji: '✅' },
  { id: 'crm', label: 'CRM & Leads', emoji: '🤝' },
  { id: 'attendance', label: 'Attendance', emoji: '⏰' },
  { id: 'forms', label: 'Forms', emoji: '📋' },
  { id: 'engagement', label: 'Engagement Tracker', emoji: '❤️' },
];

export const ADVANCED_MODULES: { id: string; label: string; emoji: string }[] = [
  { id: 'finance', label: 'Finance & GST', emoji: '💰' },
  { id: 'inventory', label: 'Inventory', emoji: '📦' },
  { id: 'vendors', label: 'Vendors & PO', emoji: '🚚' },
  { id: 'compliance', label: 'Compliance', emoji: '📅' },
  { id: 'assistant', label: 'AI Assistant', emoji: '🤖' },
  { id: 'branches', label: 'Branches', emoji: '🏢' },
  { id: 'partner_network', label: 'Partner Network', emoji: '🤝' },
  { id: 'fee_schedule', label: 'Fee Plans', emoji: '🎓' },
];

export const ALL_MODULES = [...CORE_MODULES, ...ADVANCED_MODULES];

export function getFilteredAdvancedModules(type: BusinessType | null | undefined): typeof ADVANCED_MODULES {
  if (!type || type === 'custom') return ADVANCED_MODULES;
  const config = BUSINESS_TYPES.find((t) => t.id === type);
  const holdsInventory = config?.flags.holds_inventory ?? false;
  if (holdsInventory) return ADVANCED_MODULES;
  return ADVANCED_MODULES.filter((m) => m.id !== 'vendors' && m.id !== 'inventory');
}

/**
 * Single source of truth for whether a module should be surfaced in the UI
 * for a given business vertical. Tier/plan gating is handled separately by
 * PlanGate — this function only decides "is this module ever relevant for
 * this vertical?".
 *
 * `custom` sees everything (no assumptions about the business shape).
 */
export function isModuleRelevantForVertical(
  module: string,
  type: BusinessType | null | undefined,
): boolean {
  if (!type || type === 'custom') return true;
  const flags = BUSINESS_TYPES.find((t) => t.id === type)?.flags;
  if (!flags) return true;

  switch (module) {
    case 'inventory':
    case 'vendors':
      return flags.holds_inventory === true;
    case 'partner_network':
      return flags.has_vendor_layer === true && flags.relationship_arity === 'three_party';
    case 'fee_schedule':
      return flags.revenue_model === 'installment';
    default:
      // Every other module (core ops, finance, analytics, engagement, etc.)
      // is relevant for all verticals — plan gating decides access.
      return true;
  }
}


export const LEAD_SOURCES = ['IndiaMART', 'TradeIndia', 'Referral', 'Website', 'WhatsApp', 'Facebook', 'Exhibition', 'Cold Call', 'Card Scan', 'Other'];

export const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'bg-secondary text-secondary-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-info text-info-foreground' },
  on_hold: { label: 'On Hold', color: 'bg-warning text-warning-foreground' },
  done: { label: 'Done', color: 'bg-success text-success-foreground' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: 'bg-destructive text-destructive-foreground' },
  medium: { label: 'Medium', color: 'bg-warning text-warning-foreground' },
  low: { label: 'Low', color: 'bg-secondary text-secondary-foreground' },
};

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Every Day' },
  { value: 'weekly', label: 'Every Week' },
  { value: 'monthly', label: 'Every Month' },
  { value: 'custom', label: 'Custom (days)' },
];

export const DEFAULT_TIER_SETTINGS = {
  A: { name: 'Priority', frequency: 15 },
  B: { name: 'Regular', frequency: 30 },
  C: { name: 'Occasional', frequency: 60 },
};
