import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Business, TeamMember, Task, Lead, AttendanceRecord, FormDef, FormResponse, Customer, ContactLog, Activity } from '@/types';

interface AppStore {
  // Onboarding
  business: Business | null;
  isOnboarded: boolean;
  setupBusiness: (b: Business) => void;
  updateBusiness: (updates: Partial<Business>) => void;

  // Team
  teamMembers: TeamMember[];
  addTeamMember: (m: TeamMember) => void;
  updateTeamMember: (id: string, u: Partial<TeamMember>) => void;
  removeTeamMember: (id: string) => void;

  // Tasks
  tasks: Task[];
  addTask: (t: Task) => void;
  updateTask: (id: string, u: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Leads
  leads: Lead[];
  addLead: (l: Lead) => void;
  updateLead: (id: string, u: Partial<Lead>) => void;
  deleteLead: (id: string) => void;

  // Attendance
  attendanceRecords: AttendanceRecord[];
  addAttendance: (r: AttendanceRecord) => void;
  updateAttendance: (id: string, u: Partial<AttendanceRecord>) => void;

  // Forms
  forms: FormDef[];
  addForm: (f: FormDef) => void;
  updateForm: (id: string, u: Partial<FormDef>) => void;
  deleteForm: (id: string) => void;
  formResponses: FormResponse[];
  addFormResponse: (r: FormResponse) => void;

  // Customers
  customers: Customer[];
  addCustomer: (c: Customer) => void;
  updateCustomer: (id: string, u: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Contact Logs
  contactLogs: ContactLog[];
  addContactLog: (l: ContactLog) => void;

  // Activities
  activities: Activity[];
  addActivity: (a: Activity) => void;

  // Reset
  resetStore: () => void;
}

const initialState = {
  business: null,
  isOnboarded: false,
  teamMembers: [],
  tasks: [],
  leads: [],
  attendanceRecords: [],
  forms: [],
  formResponses: [],
  customers: [],
  contactLogs: [],
  activities: [],
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setupBusiness: (b) => set({ business: b, isOnboarded: true }),
      updateBusiness: (u) => set((s) => ({ business: s.business ? { ...s.business, ...u } : null })),

      addTeamMember: (m) => set((s) => ({ teamMembers: [...s.teamMembers, m] })),
      updateTeamMember: (id, u) => set((s) => ({ teamMembers: s.teamMembers.map((m) => m.id === id ? { ...m, ...u } : m) })),
      removeTeamMember: (id) => set((s) => ({ teamMembers: s.teamMembers.filter((m) => m.id !== id) })),

      addTask: (t) => set((s) => ({ tasks: [t, ...s.tasks] })),
      updateTask: (id, u) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...u, updatedAt: new Date().toISOString() } : t) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addLead: (l) => set((s) => ({ leads: [l, ...s.leads] })),
      updateLead: (id, u) => set((s) => ({ leads: s.leads.map((l) => l.id === id ? { ...l, ...u, updatedAt: new Date().toISOString() } : l) })),
      deleteLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      addAttendance: (r) => set((s) => ({ attendanceRecords: [r, ...s.attendanceRecords] })),
      updateAttendance: (id, u) => set((s) => ({ attendanceRecords: s.attendanceRecords.map((r) => r.id === id ? { ...r, ...u } : r) })),

      addForm: (f) => set((s) => ({ forms: [f, ...s.forms] })),
      updateForm: (id, u) => set((s) => ({ forms: s.forms.map((f) => f.id === id ? { ...f, ...u } : f) })),
      deleteForm: (id) => set((s) => ({ forms: s.forms.filter((f) => f.id !== id) })),
      addFormResponse: (r) => set((s) => ({ formResponses: [r, ...s.formResponses] })),

      addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
      updateCustomer: (id, u) => set((s) => ({ customers: s.customers.map((c) => c.id === id ? { ...c, ...u } : c) })),
      deleteCustomer: (id) => set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

      addContactLog: (l) => set((s) => ({ contactLogs: [l, ...s.contactLogs] })),

      addActivity: (a) => set((s) => ({ activities: [a, ...s.activities].slice(0, 100) })),

      resetStore: () => set(initialState),
    }),
    { name: 'sucoon-store' }
  )
);
