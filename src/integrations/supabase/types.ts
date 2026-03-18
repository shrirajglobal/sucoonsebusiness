export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          business_id: string
          created_at: string | null
          date: string
          id: string
          punch_in: string | null
          punch_out: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          user_id: string
          user_name: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          date?: string
          id?: string
          punch_in?: string | null
          punch_out?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          user_id: string
          user_name: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          date?: string
          id?: string
          punch_in?: string | null
          punch_out?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_type: string
          city: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          modules: string[] | null
          name: string
          owner_name: string
          phone: string | null
          pipeline_stages: string[] | null
          state: string | null
          task_types: string[] | null
          tier_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          business_type?: string
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          modules?: string[] | null
          name: string
          owner_name: string
          phone?: string | null
          pipeline_stages?: string[] | null
          state?: string | null
          task_types?: string[] | null
          tier_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          modules?: string[] | null
          name?: string
          owner_name?: string
          phone?: string | null
          pipeline_stages?: string[] | null
          state?: string | null
          task_types?: string[] | null
          tier_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_logs: {
        Row: {
          contact_date: string | null
          customer_id: string
          id: string
          linked_lead_id: string | null
          logged_by: string | null
          method: Database["public"]["Enums"]["contact_method"]
          next_date: string | null
          notes: string | null
          outcome: Database["public"]["Enums"]["contact_outcome"]
        }
        Insert: {
          contact_date?: string | null
          customer_id: string
          id?: string
          linked_lead_id?: string | null
          logged_by?: string | null
          method: Database["public"]["Enums"]["contact_method"]
          next_date?: string | null
          notes?: string | null
          outcome: Database["public"]["Enums"]["contact_outcome"]
        }
        Update: {
          contact_date?: string | null
          customer_id?: string
          id?: string
          linked_lead_id?: string | null
          logged_by?: string | null
          method?: Database["public"]["Enums"]["contact_method"]
          next_date?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["contact_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "contact_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_logs_linked_lead_id_fkey"
            columns: ["linked_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_to: string | null
          business_id: string
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          last_contact_date: string | null
          last_contact_type: string | null
          lifetime_value: number | null
          name: string
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          tier: Database["public"]["Enums"]["customer_tier"] | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_contact_date?: string | null
          last_contact_type?: string | null
          lifetime_value?: number | null
          name: string
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"] | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_contact_date?: string | null
          last_contact_type?: string | null
          lifetime_value?: number | null
          name?: string
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"] | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          data: Json
          form_id: string
          id: string
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          data?: Json
          form_id: string
          id?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          business_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          business_id: string
          city: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          product_interest: string | null
          source: string | null
          stage: string
          tags: string[] | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          city?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          product_interest?: string | null
          source?: string | null
          stage: string
          tags?: string[] | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          city?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          product_interest?: string | null
          source?: string | null
          stage?: string
          tags?: string[] | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          created_at: string | null
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          business_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          linked_lead_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          linked_lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          linked_lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          business_id: string
          department: string | null
          email: string | null
          id: string
          invited_at: string | null
          joined_at: string | null
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          department?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          department?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "executive" | "field_staff"
      attendance_status:
        | "present"
        | "absent"
        | "half_day"
        | "leave"
        | "wfh"
        | "on_duty"
        | "late"
      contact_method: "call" | "whatsapp" | "meeting" | "email"
      contact_outcome:
        | "positive"
        | "follow_up"
        | "not_reachable"
        | "not_interested"
        | "other"
      customer_tier: "A" | "B" | "C"
      task_priority: "high" | "medium" | "low"
      task_status: "todo" | "in_progress" | "on_hold" | "done" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "executive", "field_staff"],
      attendance_status: [
        "present",
        "absent",
        "half_day",
        "leave",
        "wfh",
        "on_duty",
        "late",
      ],
      contact_method: ["call", "whatsapp", "meeting", "email"],
      contact_outcome: [
        "positive",
        "follow_up",
        "not_reachable",
        "not_interested",
        "other",
      ],
      customer_tier: ["A", "B", "C"],
      task_priority: ["high", "medium", "low"],
      task_status: ["todo", "in_progress", "on_hold", "done", "cancelled"],
    },
  },
} as const
