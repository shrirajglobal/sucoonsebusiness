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
      activity_logs: {
        Row: {
          action: string
          business_id: string
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          user_name?: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_events: {
        Row: {
          affiliate_id: string
          amount: number | null
          created_at: string | null
          event_type: string
          id: string
          referred_business_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          referred_business_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          referred_business_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          commission_rate: number
          created_at: string | null
          email: string
          id: string
          name: string
          payout_bank_details: Json | null
          payout_upi: string | null
          phone: string | null
          status: string
          total_clicks: number | null
          total_commission: number | null
          total_paid_conversions: number | null
          total_signups: number | null
        }
        Insert: {
          affiliate_code: string
          commission_rate?: number
          created_at?: string | null
          email: string
          id?: string
          name: string
          payout_bank_details?: Json | null
          payout_upi?: string | null
          phone?: string | null
          status?: string
          total_clicks?: number | null
          total_commission?: number | null
          total_paid_conversions?: number | null
          total_signups?: number | null
        }
        Update: {
          affiliate_code?: string
          commission_rate?: number
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          payout_bank_details?: Json | null
          payout_upi?: string | null
          phone?: string | null
          status?: string
          total_clicks?: number | null
          total_commission?: number | null
          total_paid_conversions?: number | null
          total_signups?: number | null
        }
        Relationships: []
      }
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
      branches: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_name: string | null
          name: string
          phone: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name: string
          phone?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name?: string
          phone?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
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
          currency: string
          date_format: string
          gst_number: string | null
          id: string
          locale: string
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
          currency?: string
          date_format?: string
          gst_number?: string | null
          id?: string
          locale?: string
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
          currency?: string
          date_format?: string
          gst_number?: string | null
          id?: string
          locale?: string
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
      card_scan_usage: {
        Row: {
          business_id: string
          created_at: string
          id: string
          month: string
          scan_count: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          month: string
          scan_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          month?: string
          scan_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_scan_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      card_scans: {
        Row: {
          business_id: string
          contact_id: string | null
          created_at: string | null
          extracted_data: Json | null
          id: string
          image_url: string | null
          lead_id: string | null
          scanned_by: string | null
        }
        Insert: {
          business_id: string
          contact_id?: string | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          image_url?: string | null
          lead_id?: string | null
          scanned_by?: string | null
        }
        Update: {
          business_id?: string
          contact_id?: string | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          image_url?: string | null
          lead_id?: string | null
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_scans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_scans_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          business_id: string
          created_at: string
          id: string
          rate_type: string
          rate_value: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          rate_type: string
          rate_value: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          rate_type?: string
          rate_value?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_transactions: {
        Row: {
          business_id: string
          commission_amount: number
          created_at: string
          id: string
          notes: string | null
          partner_order_id: string
          receivable_since: string | null
          received_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          commission_amount: number
          created_at?: string
          id?: string
          notes?: string | null
          partner_order_id: string
          receivable_since?: string | null
          received_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          partner_order_id?: string
          receivable_since?: string | null
          received_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transactions_partner_order_id_fkey"
            columns: ["partner_order_id"]
            isOneToOne: false
            referencedRelation: "partner_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_events: {
        Row: {
          business_id: string
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          type?: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      contacts: {
        Row: {
          address: string | null
          business_id: string
          company: string | null
          created_at: string | null
          designation: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          company?: string | null
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          company?: string | null
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_to: string | null
          billing_day: number | null
          business_id: string
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          is_retainer: boolean | null
          last_contact_date: string | null
          last_contact_type: string | null
          lifetime_value: number | null
          name: string
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          retainer_amount: number | null
          tier: Database["public"]["Enums"]["customer_tier"] | null
        }
        Insert: {
          assigned_to?: string | null
          billing_day?: number | null
          business_id: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_retainer?: boolean | null
          last_contact_date?: string | null
          last_contact_type?: string | null
          lifetime_value?: number | null
          name: string
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          retainer_amount?: number | null
          tier?: Database["public"]["Enums"]["customer_tier"] | null
        }
        Update: {
          assigned_to?: string | null
          billing_day?: number | null
          business_id?: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_retainer?: boolean | null
          last_contact_date?: string | null
          last_contact_type?: string | null
          lifetime_value?: number | null
          name?: string
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          retainer_amount?: number | null
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
      fee_installments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          due_date: string
          fee_plan_id: string
          id: string
          installment_number: number
          paid_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          due_date: string
          fee_plan_id: string
          id?: string
          installment_number: number
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          due_date?: string
          fee_plan_id?: string
          id?: string
          installment_number?: number
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_installments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          business_id: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          installment_count: number
          plan_name: string
          start_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          installment_count: number
          plan_name: string
          start_date: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          installment_count?: number
          plan_name?: string
          start_date?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      idea_comments: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          idea_id: string
          user_name: string
          voice_note_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          idea_id: string
          user_name?: string
          voice_note_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          idea_id?: string
          user_name?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_members: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_members_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          business_id: string
          converted_task_id: string | null
          created_at: string
          created_by: string
          created_by_name: string
          description: string | null
          id: string
          is_pinned: boolean
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          voice_note_url: string | null
        }
        Insert: {
          business_id: string
          converted_task_id?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          voice_note_url?: string | null
        }
        Update: {
          business_id?: string
          converted_task_id?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ideas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_converted_task_id_fkey"
            columns: ["converted_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          branch_id: string | null
          business_id: string
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          location: string | null
          min_stock: number | null
          name: string
          quantity: number
          sell_price: number | null
          sku: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          min_stock?: number | null
          name: string
          quantity?: number
          sell_price?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          min_stock?: number | null
          name?: string
          quantity?: number
          sell_price?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          lead_id: string
          note_type: string
          user_name: string
          voice_note_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          note_type?: string
          user_name?: string
          voice_note_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          note_type?: string
          user_name?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          lost_reason: string | null
          name: string
          next_follow_up: string | null
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
          lost_reason?: string | null
          name: string
          next_follow_up?: string | null
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
          lost_reason?: string | null
          name?: string
          next_follow_up?: string | null
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
      leave_requests: {
        Row: {
          business_id: string
          created_at: string | null
          days: number
          end_date: string
          id: string
          leave_type_id: string | null
          leave_type_name: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          user_id: string
          user_name: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          days?: number
          end_date: string
          id?: string
          leave_type_id?: string | null
          leave_type_name: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          user_id: string
          user_name: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          days?: number
          end_date?: string
          id?: string
          leave_type_id?: string | null
          leave_type_name?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          business_id: string
          created_at: string | null
          days_per_year: number
          id: string
          is_paid: boolean
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          days_per_year?: number
          id?: string
          is_paid?: boolean
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          days_per_year?: number
          id?: string
          is_paid?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_orders: {
        Row: {
          amount: number
          assigned_to: string | null
          business_id: string
          client_id: string
          client_payment_status: string
          created_at: string
          created_by: string | null
          dispatch_status: string
          id: string
          notes: string | null
          order_date: string
          updated_at: string
          vendor_id: string
          vendor_product_id: string | null
        }
        Insert: {
          amount: number
          assigned_to?: string | null
          business_id: string
          client_id: string
          client_payment_status?: string
          created_at?: string
          created_by?: string | null
          dispatch_status?: string
          id?: string
          notes?: string | null
          order_date?: string
          updated_at?: string
          vendor_id: string
          vendor_product_id?: string | null
        }
        Update: {
          amount?: number
          assigned_to?: string | null
          business_id?: string
          client_id?: string
          client_payment_status?: string
          created_at?: string
          created_by?: string | null
          dispatch_status?: string
          id?: string
          notes?: string | null
          order_date?: string
          updated_at?: string
          vendor_id?: string
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount_paise: number
          billing_cycle: string
          business_id: string
          created_at: string
          id: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          amount_paise: number
          billing_cycle: string
          business_id: string
          created_at?: string
          id?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          billing_cycle?: string
          business_id?: string
          created_at?: string
          id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_business_id_fkey"
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
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
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
      purchase_orders: {
        Row: {
          business_id: string
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          items: Json
          notes: string | null
          order_date: string | null
          po_number: string
          received_date: string | null
          status: Database["public"]["Enums"]["po_status"] | null
          total_amount: number | null
          vendor_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string | null
          po_number: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"] | null
          total_amount?: number | null
          vendor_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string | null
          po_number?: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"] | null
          total_amount?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_business_id: string | null
          referred_email: string | null
          referrer_business_id: string
          referrer_user_id: string
          reward_days: number
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_business_id?: string | null
          referred_email?: string | null
          referrer_business_id: string
          referrer_user_id: string
          reward_days?: number
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_business_id?: string | null
          referred_email?: string | null
          referrer_business_id?: string
          referrer_user_id?: string
          reward_days?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_business_id_fkey"
            columns: ["referred_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_business_id_fkey"
            columns: ["referrer_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          business_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean
          name: string
          start_time: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          start_time: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_tasks: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          business_id: string
          created_at: string | null
          current_period_end: string | null
          extra_days: number
          id: string
          plan: string
          referred_by: string | null
          status: string
          trial_end: string
          trial_start: string
          trial_tier: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          business_id: string
          created_at?: string | null
          current_period_end?: string | null
          extra_days?: number
          id?: string
          plan?: string
          referred_by?: string | null
          status?: string
          trial_end?: string
          trial_start?: string
          trial_tier?: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          business_id?: string
          created_at?: string | null
          current_period_end?: string | null
          extra_days?: number
          id?: string
          plan?: string
          referred_by?: string | null
          status?: string
          trial_end?: string
          trial_start?: string
          trial_tier?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          business_id: string
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          admin_notes?: string | null
          business_id: string
          category?: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id: string
          user_name?: string
        }
        Update: {
          admin_notes?: string | null
          business_id?: string
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          task_id: string
          user_name: string
          voice_note_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          task_id: string
          user_name?: string
          voice_note_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          task_id?: string
          user_name?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          channels: string[]
          created_at: string
          created_by: string
          id: string
          is_sent: boolean
          remind_at: string
          task_id: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          created_by: string
          id?: string
          is_sent?: boolean
          remind_at: string
          task_id: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          created_by?: string
          id?: string
          is_sent?: boolean
          remind_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_watchers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          depends_on: string[] | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          linked_customer_id: string | null
          linked_lead_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          recurrence: Json | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_type: string | null
          title: string
          updated_at: string | null
          voice_note_url: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          created_at?: string | null
          created_by?: string | null
          depends_on?: string[] | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          linked_customer_id?: string | null
          linked_lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence?: Json | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: string | null
          title: string
          updated_at?: string | null
          voice_note_url?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          depends_on?: string[] | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          linked_customer_id?: string | null
          linked_lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence?: Json | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
          voice_note_url?: string | null
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
          designation: string | null
          email: string | null
          id: string
          invited_at: string | null
          joined_at: string | null
          name: string
          phone: string | null
          salary: number | null
          shift_id: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          name: string
          phone?: string | null
          salary?: number | null
          shift_id?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          name?: string
          phone?: string | null
          salary?: number | null
          shift_id?: string | null
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
          {
            foreignKeyName: "team_members_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          sender_name?: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          business_id: string
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          started_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          gst_amount: number | null
          gst_rate: number | null
          id: string
          payment_method: string | null
          reference_no: string | null
          type: string
        }
        Insert: {
          amount?: number
          business_id: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          payment_method?: string | null
          reference_no?: string | null
          type: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          payment_method?: string | null
          reference_no?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          module_context: string | null
          note: string | null
          requested_tier: string
          requester_name: string | null
          requester_phone: string | null
          requester_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          module_context?: string | null
          note?: string | null
          requested_tier: string
          requester_name?: string | null
          requester_phone?: string | null
          requester_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          module_context?: string | null
          note?: string | null
          requested_tier?: string
          requester_name?: string | null
          requester_phone?: string | null
          requester_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_business_id_fkey"
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
      vendor_products: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          id: string
          notes: string | null
          product_name: string
          unit_price: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_name: string
          unit_price?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_name?: string
          unit_price?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          business_id: string
          company: string | null
          created_at: string | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_vendor_balances: {
        Row: {
          business_id: string | null
          client_id: string | null
          commission_pending: number | null
          commission_receivable: number | null
          commission_received: number | null
          total_order_value: number | null
          total_paid: number | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_paid_plan: {
        Args: { _payment_order_id: string }
        Returns: undefined
      }
      assign_role: {
        Args: {
          _business_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      business_has_growth_access: {
        Args: { _business_id: string }
        Returns: boolean
      }
      business_has_scale_access: {
        Args: { _business_id: string }
        Returns: boolean
      }
      complete_onboarding: {
        Args: {
          _business_type: string
          _city: string
          _members?: Json
          _modules: string[]
          _name: string
          _owner_name: string
          _phone: string
          _pipeline_stages: string[]
          _seed_customers?: Json
          _seed_fee_plan?: Json
          _seed_leads?: Json
          _seed_partner_network?: Json
          _seed_tasks?: Json
          _task_types: string[]
          _tier_settings: Json
        }
        Returns: string
      }
      create_fee_plan_with_installments: {
        Args: {
          _client_id: string
          _installment_count: number
          _plan_name: string
          _start_date: string
          _total_amount: number
        }
        Returns: string
      }
      create_partner_order_with_commission: {
        Args: {
          _amount: number
          _client_id: string
          _notes: string
          _order_date: string
          _vendor_id: string
          _vendor_product_id: string
        }
        Returns: string
      }
      generate_fee_installments: {
        Args: {
          _business_id: string
          _installment_count: number
          _plan_id: string
          _start_date: string
          _total_amount: number
        }
        Returns: undefined
      }
      get_affiliate_by_code: {
        Args: { _code: string }
        Returns: {
          affiliate_code: string
          id: string
          status: string
        }[]
      }
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_affiliate_clicks: {
        Args: { _affiliate_id: string }
        Returns: undefined
      }
      increment_affiliate_signups: {
        Args: { _affiliate_id: string }
        Returns: undefined
      }
      increment_card_scan_usage: {
        Args: { _business_id: string }
        Returns: number
      }
      is_super_admin: { Args: never; Returns: boolean }
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
      po_status: "draft" | "sent" | "received" | "cancelled"
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
      po_status: ["draft", "sent", "received", "cancelled"],
      task_priority: ["high", "medium", "low"],
      task_status: ["todo", "in_progress", "on_hold", "done", "cancelled"],
    },
  },
} as const
