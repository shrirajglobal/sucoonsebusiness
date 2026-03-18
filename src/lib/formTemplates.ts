import type { FormField } from '@/types';

function fid() { return Math.random().toString(36).substring(2, 10); }

export interface FormTemplate {
  title: string;
  description: string;
  fields: FormField[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    title: 'Customer Feedback',
    description: 'Collect customer satisfaction feedback',
    fields: [
      { id: fid(), type: 'text', label: 'Customer Name', required: true },
      { id: fid(), type: 'email', label: 'Email Address', required: false },
      { id: fid(), type: 'rating', label: 'Overall Satisfaction', required: true },
      { id: fid(), type: 'textarea', label: 'What did you like?', required: false },
      { id: fid(), type: 'textarea', label: 'What can we improve?', required: false },
      { id: fid(), type: 'radio', label: 'Would you recommend us?', required: true, options: ['Yes', 'No', 'Maybe'] },
    ],
  },
  {
    title: 'Employee Onboarding',
    description: 'New employee information form',
    fields: [
      { id: fid(), type: 'text', label: 'Full Name', required: true },
      { id: fid(), type: 'email', label: 'Personal Email', required: true },
      { id: fid(), type: 'phone', label: 'Phone Number', required: true },
      { id: fid(), type: 'date', label: 'Date of Birth', required: true },
      { id: fid(), type: 'text', label: 'Emergency Contact Name', required: true },
      { id: fid(), type: 'phone', label: 'Emergency Contact Phone', required: true },
      { id: fid(), type: 'dropdown', label: 'Department', required: true, options: ['Sales', 'Marketing', 'Operations', 'Finance', 'HR'] },
    ],
  },
  {
    title: 'Daily Site Report',
    description: 'Daily progress report for site/field work',
    fields: [
      { id: fid(), type: 'date', label: 'Report Date', required: true },
      { id: fid(), type: 'text', label: 'Site/Location', required: true },
      { id: fid(), type: 'text', label: 'Supervisor Name', required: true },
      { id: fid(), type: 'number', label: 'Workers Present', required: true },
      { id: fid(), type: 'textarea', label: 'Work Completed Today', required: true },
      { id: fid(), type: 'textarea', label: 'Issues/Delays', required: false },
      { id: fid(), type: 'rating', label: 'Progress Rating', required: true },
    ],
  },
  {
    title: 'Vendor Registration',
    description: 'Register new vendor/supplier',
    fields: [
      { id: fid(), type: 'text', label: 'Company Name', required: true },
      { id: fid(), type: 'text', label: 'Contact Person', required: true },
      { id: fid(), type: 'phone', label: 'Phone', required: true },
      { id: fid(), type: 'email', label: 'Email', required: false },
      { id: fid(), type: 'text', label: 'GST Number', required: false },
      { id: fid(), type: 'textarea', label: 'Address', required: true },
      { id: fid(), type: 'multi_select', label: 'Products/Services', required: true, options: ['Raw Materials', 'Packaging', 'Logistics', 'IT Services', 'Maintenance'] },
    ],
  },
  {
    title: 'Event Registration',
    description: 'Register attendees for events',
    fields: [
      { id: fid(), type: 'text', label: 'Full Name', required: true },
      { id: fid(), type: 'email', label: 'Email', required: true },
      { id: fid(), type: 'phone', label: 'Phone', required: true },
      { id: fid(), type: 'text', label: 'Organization', required: false },
      { id: fid(), type: 'dropdown', label: 'How did you hear about us?', required: false, options: ['Social Media', 'Email', 'Word of Mouth', 'Website', 'Other'] },
      { id: fid(), type: 'radio', label: 'Dietary Preference', required: false, options: ['Veg', 'Non-Veg', 'Vegan'] },
    ],
  },
  {
    title: 'Lead Capture',
    description: 'Capture leads at trade shows or events',
    fields: [
      { id: fid(), type: 'text', label: 'Name', required: true },
      { id: fid(), type: 'text', label: 'Company', required: false },
      { id: fid(), type: 'phone', label: 'Phone', required: true },
      { id: fid(), type: 'email', label: 'Email', required: false },
      { id: fid(), type: 'multi_select', label: 'Interested In', required: true, options: ['Product A', 'Product B', 'Service C', 'Partnership'] },
      { id: fid(), type: 'rating', label: 'Interest Level', required: true },
      { id: fid(), type: 'textarea', label: 'Notes', required: false },
    ],
  },
  {
    title: 'Expense Claim',
    description: 'Submit expense reimbursement claims',
    fields: [
      { id: fid(), type: 'text', label: 'Employee Name', required: true },
      { id: fid(), type: 'date', label: 'Expense Date', required: true },
      { id: fid(), type: 'dropdown', label: 'Category', required: true, options: ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Other'] },
      { id: fid(), type: 'number', label: 'Amount (₹)', required: true },
      { id: fid(), type: 'text', label: 'Description', required: true },
      { id: fid(), type: 'text', label: 'Reference/Bill No.', required: false },
    ],
  },
  {
    title: 'Meeting Notes',
    description: 'Capture structured meeting notes',
    fields: [
      { id: fid(), type: 'date', label: 'Meeting Date', required: true },
      { id: fid(), type: 'text', label: 'Meeting Title', required: true },
      { id: fid(), type: 'text', label: 'Participants', required: true },
      { id: fid(), type: 'textarea', label: 'Agenda', required: true },
      { id: fid(), type: 'textarea', label: 'Decisions Made', required: false },
      { id: fid(), type: 'textarea', label: 'Action Items', required: true },
      { id: fid(), type: 'date', label: 'Next Meeting Date', required: false },
    ],
  },
  {
    title: 'Quality Check',
    description: 'Product/service quality inspection form',
    fields: [
      { id: fid(), type: 'text', label: 'Product/Batch ID', required: true },
      { id: fid(), type: 'text', label: 'Inspector Name', required: true },
      { id: fid(), type: 'date', label: 'Inspection Date', required: true },
      { id: fid(), type: 'rating', label: 'Visual Quality', required: true },
      { id: fid(), type: 'rating', label: 'Functionality', required: true },
      { id: fid(), type: 'radio', label: 'Pass/Fail', required: true, options: ['Pass', 'Fail', 'Conditional Pass'] },
      { id: fid(), type: 'textarea', label: 'Remarks', required: false },
    ],
  },
  {
    title: 'Service Request',
    description: 'Customer service/support request form',
    fields: [
      { id: fid(), type: 'text', label: 'Customer Name', required: true },
      { id: fid(), type: 'phone', label: 'Phone', required: true },
      { id: fid(), type: 'dropdown', label: 'Request Type', required: true, options: ['Complaint', 'Inquiry', 'Repair', 'Replacement', 'Other'] },
      { id: fid(), type: 'dropdown', label: 'Priority', required: true, options: ['Low', 'Medium', 'High', 'Urgent'] },
      { id: fid(), type: 'textarea', label: 'Description', required: true },
      { id: fid(), type: 'text', label: 'Product/Service Reference', required: false },
    ],
  },
];
