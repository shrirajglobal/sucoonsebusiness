export interface TaskTemplate {
  title: string;
  priority: 'high' | 'medium' | 'low';
  task_type: string;
  recurrence: { type: string; interval?: number } | null;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  { title: 'Follow-up Call', priority: 'high', task_type: 'Sales', recurrence: null },
  { title: 'Weekly Team Meeting', priority: 'medium', task_type: 'General', recurrence: { type: 'weekly' } },
  { title: 'Invoice Follow-up', priority: 'high', task_type: 'Finance', recurrence: null },
  { title: 'Site Visit', priority: 'medium', task_type: 'Field', recurrence: null },
  { title: 'Vendor Payment Reminder', priority: 'high', task_type: 'Finance', recurrence: { type: 'monthly' } },
  { title: 'Client Onboarding', priority: 'high', task_type: 'Operations', recurrence: null },
  { title: 'Social Media Post', priority: 'low', task_type: 'Marketing', recurrence: { type: 'daily' } },
  { title: 'Stock Reorder Check', priority: 'medium', task_type: 'Inventory', recurrence: { type: 'weekly' } },
];
