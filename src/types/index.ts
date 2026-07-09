export type BusinessType = 'manufacturing' | 'trading' | 'services' | 'real_estate' | 'education' | 'retail' | 'finance' | 'agency' | 'custom';

export type RevenueModel = 'margin' | 'commission' | 'fee' | 'installment';
export type RelationshipArity = 'two_party' | 'three_party';

export interface BusinessCapabilityFlags {
  holds_inventory: boolean;
  has_vendor_layer: boolean;
  revenue_model: RevenueModel;
  relationship_arity: RelationshipArity;
}
export type UserRole = 'owner' | 'admin' | 'manager' | 'executive' | 'field_staff';
export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'done' | 'cancelled';
export type TaskPriority = 'high' | 'medium' | 'low';
export type CustomerTier = 'A' | 'B' | 'C';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'wfh' | 'on_duty' | 'late';
export type ContactMethod = 'call' | 'whatsapp' | 'meeting' | 'email';
export type ContactOutcome = 'positive' | 'follow_up' | 'not_reachable' | 'not_interested' | 'other';

export interface Business {
  name: string;
  ownerName: string;
  phone: string;
  logo?: string;
  city: string;
  state: string;
  type: BusinessType;
  modules: string[];
  pipelineStages: string[];
  taskTypes: string[];
  tierSettings: {
    A: { name: string; frequency: number };
    B: { name: string; frequency: number };
    C: { name: string; frequency: number };
  };
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  department?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  taskType?: string;
  linkedLeadId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  value?: number;
  source?: string;
  assignedTo?: string;
  stage: string;
  notes?: string;
  tags?: string[];
  city?: string;
  productInterest?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: AttendanceStatus;
  punchIn?: string;
  punchOut?: string;
}

export interface FormDef {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  createdAt: string;
  isActive: boolean;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'dropdown' | 'rating' | 'radio' | 'multi_select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, string>;
  submittedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  tier: CustomerTier;
  assignedTo?: string;
  lastContactDate?: string;
  lastContactType?: string;
  nextContactDate?: string;
  lifetimeValue?: number;
  notes?: string;
  createdAt: string;
}

export interface ContactLog {
  id: string;
  customerId: string;
  method: ContactMethod;
  outcome: ContactOutcome;
  notes?: string;
  contactDate: string;
  nextDate?: string;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  entityType: 'task' | 'lead' | 'customer' | 'attendance' | 'form';
  entityId: string;
  createdAt: string;
}
