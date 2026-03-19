import type { BusinessType } from '@/types';

export const BUSINESS_TYPES: { id: BusinessType; label: string; emoji: string; stages: string[]; taskTypes: string[] }[] = [
  { id: 'manufacturing', label: 'Manufacturing', emoji: '🏭', stages: ['New Inquiry', 'Quotation', 'Negotiation', 'Order Confirmed', 'Dispatched'], taskTypes: ['Production', 'Quality Check', 'Dispatch', 'Purchase', 'Maintenance'] },
  { id: 'trading', label: 'Trading', emoji: '📦', stages: ['New Lead', 'Sample Sent', 'Price Talk', 'Order Placed', 'Payment Done'], taskTypes: ['Follow Up', 'Procurement', 'Dispatch', 'Accounts', 'Vendor Meeting'] },
  { id: 'services', label: 'Services / IT', emoji: '💻', stages: ['New Lead', 'Demo', 'Proposal', 'Negotiation', 'Closed Won'], taskTypes: ['Client Call', 'Proposal', 'Delivery', 'Support', 'Review'] },
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠', stages: ['Inquiry', 'Site Visit', 'Negotiation', 'Agreement', 'Registration'], taskTypes: ['Site Visit', 'Follow Up', 'Documentation', 'Legal', 'Handover'] },
  { id: 'education', label: 'Education', emoji: '🎓', stages: ['Enquiry', 'Demo Class', 'Follow Up', 'Admission', 'Fee Paid'], taskTypes: ['Counselling', 'Demo', 'Follow Up', 'Admission', 'Fee Collection'] },
  { id: 'retail', label: 'Retail / Shop', emoji: '🛍️', stages: ['Walk In', 'Shown Product', 'Quotation', 'Purchase', 'Repeat'], taskTypes: ['Stock Check', 'Order Vendor', 'Display', 'Billing', 'Delivery'] },
  { id: 'finance', label: 'Finance', emoji: '🏦', stages: ['Lead', 'Docs Received', 'Processing', 'Sanctioned', 'Disbursed'], taskTypes: ['KYC', 'Document', 'Processing', 'Disbursement', 'Recovery'] },
  { id: 'custom', label: 'Custom', emoji: '⚙️', stages: ['Stage 1', 'Stage 2', 'Stage 3', 'Won', 'Lost'], taskTypes: ['Task Type 1', 'Task Type 2', 'Task Type 3'] },
];

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
];

export const ALL_MODULES = [...CORE_MODULES, ...ADVANCED_MODULES];

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
