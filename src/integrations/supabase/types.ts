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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          actor_name: string | null
          actor_role: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          organization_id: string
          request_id: string
        }
        Insert: {
          action_type: string
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          organization_id: string
          request_id: string
        }
        Update: {
          action_type?: string
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          google_maps_api_key: string | null
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_maps_api_key?: string | null
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_maps_api_key?: string | null
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          request_id: string | null
          text: string | null
          updated_at: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          request_id?: string | null
          text?: string | null
          updated_at?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          request_id?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          organization_id: string | null
          phone: string
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          organization_id?: string | null
          phone: string
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          organization_id?: string | null
          phone?: string
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_org_assignments_audit: {
        Row: {
          cleaned_at: string | null
          cleaned_by: string | null
          contractor_id: string | null
          contractor_org_id: string | null
          id: string
          request_id: string | null
          request_org_id: string | null
        }
        Insert: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          contractor_id?: string | null
          contractor_org_id?: string | null
          id?: string
          request_id?: string | null
          request_org_id?: string | null
        }
        Update: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          contractor_id?: string | null
          contractor_org_id?: string | null
          id?: string
          request_id?: string | null
          request_org_id?: string | null
        }
        Relationships: []
      }
      cross_org_property_audit: {
        Row: {
          cleaned_at: string | null
          cleaned_by: string | null
          id: string
          property_id: string
          property_org_id: string | null
          request_id: string
          request_org_id: string | null
        }
        Insert: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          id?: string
          property_id: string
          property_org_id?: string | null
          request_id: string
          request_org_id?: string | null
        }
        Update: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          id?: string
          property_id?: string
          property_org_id?: string | null
          request_id?: string
          request_org_id?: string | null
        }
        Relationships: []
      }
      cross_org_user_audit: {
        Row: {
          cleaned_at: string | null
          cleaned_by: string | null
          id: string
          request_id: string
          request_org_id: string | null
          user_id: string
          user_org_id: string | null
        }
        Insert: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          id?: string
          request_id: string
          request_org_id?: string | null
          user_id: string
          user_org_id?: string | null
        }
        Update: {
          cleaned_at?: string | null
          cleaned_by?: string | null
          id?: string
          request_id?: string
          request_org_id?: string | null
          user_id?: string
          user_org_id?: string | null
        }
        Relationships: []
      }
      email_relay_keys: {
        Row: {
          actor_type: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          recipient_email: string
          request_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          actor_type: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          recipient_email: string
          request_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          actor_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          recipient_email?: string
          request_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_relay_keys_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_code_usage: {
        Row: {
          id: string
          invitation_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          invitation_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          invitation_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_code_usage_invitation_code_id_fkey"
            columns: ["invitation_code_id"]
            isOneToOne: false
            referencedRelation: "invitation_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          assigned_role: string
          code: string
          created_at: string
          created_by: string
          current_uses: number
          expires_at: string
          id: string
          internal_note: string | null
          is_active: boolean
          max_uses: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          expires_at: string
          id?: string
          internal_note?: string | null
          is_active?: boolean
          max_uses?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          expires_at?: string
          id?: string
          internal_note?: string | null
          is_active?: boolean
          max_uses?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          contractor_id: string
          created_at: string
          final_cost: number
          gst_amount: number
          id: string
          invoice_file_name: string
          invoice_file_url: string
          invoice_number: string
          organization_id: string | null
          request_id: string
          total_amount_with_gst: number
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          final_cost: number
          gst_amount: number
          id?: string
          invoice_file_name: string
          invoice_file_url: string
          invoice_number: string
          organization_id?: string | null
          request_id: string
          total_amount_with_gst: number
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          final_cost?: number
          gst_amount?: number
          id?: string
          invoice_file_name?: string
          invoice_file_url?: string
          invoice_number?: string
          organization_id?: string | null
          request_id?: string
          total_amount_with_gst?: number
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_schedules: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          organization_id: string | null
          request_id: string
          scheduled_dates: Json
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          request_id: string
          scheduled_dates?: Json
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          request_id?: string
          scheduled_dates?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_schedules_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_schedules_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_scheduling_history: {
        Row: {
          action: string
          contractor_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string | null
          request_id: string
          scheduled_dates: Json
        }
        Insert: {
          action: string
          contractor_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          request_id: string
          scheduled_dates?: Json
        }
        Update: {
          action?: string
          contractor_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          request_id?: string
          scheduled_dates?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_scheduling_history_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_scheduling_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_scheduling_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      landlords: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          office_address: string | null
          organization_id: string | null
          phone: string | null
          postal_address: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          office_address?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_address?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          office_address?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_landlord: boolean | null
          attachments: Json | null
          attempted_fix: string | null
          budget_category_id: string | null
          category: string
          completion_percentage: number | null
          completion_photos: Json | null
          contractor_id: string | null
          created_at: string
          description: string
          due_date: string | null
          explanation: string | null
          history: Json | null
          id: string
          invoice_id: string | null
          is_participant_related: boolean | null
          issue_nature: string | null
          landlord_assigned_at: string | null
          landlord_assigned_by: string | null
          landlord_notes: string | null
          location: string
          organization_id: string | null
          participant_name: string | null
          priority: string
          progress_notes: string[] | null
          property_id: string | null
          quote_requested: boolean | null
          quoted_amount: number | null
          report_date: string | null
          site: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_landlord?: boolean | null
          attachments?: Json | null
          attempted_fix?: string | null
          budget_category_id?: string | null
          category: string
          completion_percentage?: number | null
          completion_photos?: Json | null
          contractor_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          explanation?: string | null
          history?: Json | null
          id?: string
          invoice_id?: string | null
          is_participant_related?: boolean | null
          issue_nature?: string | null
          landlord_assigned_at?: string | null
          landlord_assigned_by?: string | null
          landlord_notes?: string | null
          location: string
          organization_id?: string | null
          participant_name?: string | null
          priority: string
          progress_notes?: string[] | null
          property_id?: string | null
          quote_requested?: boolean | null
          quoted_amount?: number | null
          report_date?: string | null
          site?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_landlord?: boolean | null
          attachments?: Json | null
          attempted_fix?: string | null
          budget_category_id?: string | null
          category?: string
          completion_percentage?: number | null
          completion_photos?: Json | null
          contractor_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          explanation?: string | null
          history?: Json | null
          id?: string
          invoice_id?: string | null
          is_participant_related?: boolean | null
          issue_nature?: string | null
          landlord_assigned_at?: string | null
          landlord_assigned_by?: string | null
          landlord_notes?: string | null
          location?: string
          organization_id?: string | null
          participant_name?: string | null
          priority?: string
          progress_notes?: string[] | null
          property_id?: string | null
          quote_requested?: boolean | null
          quoted_amount?: number | null
          report_date?: string | null
          site?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          organization_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          organization_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          organization_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_consolidation_audit: {
        Row: {
          consolidation_date: string | null
          consolidation_reason: string | null
          id: string
          org_name: string | null
          original_org_id: string | null
          target_org_id: string | null
        }
        Insert: {
          consolidation_date?: string | null
          consolidation_reason?: string | null
          id?: string
          org_name?: string | null
          original_org_id?: string | null
          target_org_id?: string | null
        }
        Update: {
          consolidation_date?: string | null
          consolidation_reason?: string | null
          id?: string
          org_name?: string | null
          original_org_id?: string | null
          target_org_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_properties: string[] | null
          created_at: string | null
          email: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          role: string
          session_organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_properties?: string[] | null
          created_at?: string | null
          email: string
          id: string
          name: string
          organization_id?: string | null
          phone?: string | null
          role?: string
          session_organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_properties?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          role?: string
          session_organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          contact_number: string
          created_at: string
          email: string
          id: string
          landlord_id: string | null
          name: string
          organization_id: string | null
          practice_leader: string
          practice_leader_email: string | null
          practice_leader_phone: string | null
          renewal_date: string | null
          rent_amount: number | null
          rent_period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          contact_number: string
          created_at?: string
          email: string
          id?: string
          landlord_id?: string | null
          name: string
          organization_id?: string | null
          practice_leader: string
          practice_leader_email?: string | null
          practice_leader_phone?: string | null
          renewal_date?: string | null
          rent_amount?: number | null
          rent_period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          contact_number?: string
          created_at?: string
          email?: string
          id?: string
          landlord_id?: string | null
          name?: string
          organization_id?: string | null
          practice_leader?: string
          practice_leader_email?: string | null
          practice_leader_phone?: string | null
          renewal_date?: string | null
          rent_amount?: number | null
          rent_period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_access_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          organization_id: string
          property_id: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          organization_id: string
          property_id: string
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          property_id?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_access_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_access_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_access_tokens_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_budgets: {
        Row: {
          budget_category_id: string
          budgeted_amount: number
          created_at: string
          financial_year: number
          id: string
          organization_id: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          budget_category_id: string
          budgeted_amount?: number
          created_at?: string
          financial_year: number
          id?: string
          organization_id?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          budget_category_id?: string
          budgeted_amount?: number
          created_at?: string
          financial_year?: number
          id?: string
          organization_id?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_budgets_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_logs: {
        Row: {
          action: string
          contractor_id: string
          created_at: string
          id: string
          new_amount: number
          new_description: string | null
          old_amount: number | null
          old_description: string | null
          organization_id: string | null
          quote_id: string
        }
        Insert: {
          action: string
          contractor_id: string
          created_at?: string
          id?: string
          new_amount: number
          new_description?: string | null
          old_amount?: number | null
          old_description?: string | null
          organization_id?: string | null
          quote_id: string
        }
        Update: {
          action?: string
          contractor_id?: string
          created_at?: string
          id?: string
          new_amount?: number
          new_description?: string | null
          old_amount?: number | null
          old_description?: string | null
          organization_id?: string | null
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_logs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number
          approved_at: string | null
          contractor_id: string
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          request_id: string
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          contractor_id: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          request_id: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          contractor_id?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          request_id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          organization_id: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          active_properties_count: number | null
          cancellation_date: string | null
          created_at: string
          created_by: string | null
          email: string
          failed_payment_count: number | null
          id: string
          is_cancelled: boolean | null
          is_trial_active: boolean | null
          last_billing_date: string | null
          last_payment_attempt: string | null
          next_billing_date: string | null
          organization_id: string
          payment_method_id: string | null
          payment_status: string | null
          setup_intent_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_properties_count?: number | null
          cancellation_date?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          failed_payment_count?: number | null
          id?: string
          is_cancelled?: boolean | null
          is_trial_active?: boolean | null
          last_billing_date?: string | null
          last_payment_attempt?: string | null
          next_billing_date?: string | null
          organization_id: string
          payment_method_id?: string | null
          payment_status?: string | null
          setup_intent_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_properties_count?: number | null
          cancellation_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          failed_payment_count?: number | null
          id?: string
          is_cancelled?: boolean | null
          is_trial_active?: boolean | null
          last_billing_date?: string | null
          last_payment_attempt?: string | null
          next_billing_date?: string | null
          organization_id?: string
          payment_method_id?: string | null
          payment_status?: string | null
          setup_intent_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      temporary_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_claimed: boolean
          organization_id: string
          property_id: string
          session_token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_claimed?: boolean
          organization_id: string
          property_id: string
          session_token: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_claimed?: boolean
          organization_id?: string
          property_id?: string
          session_token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temporary_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_sessions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_schemas: {
        Row: {
          created_at: string | null
          id: string
          schema_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          schema_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          schema_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_new_comment: {
        Args: {
          p_request_id: string
          p_text: string
          p_user_id: string
          p_user_name: string
          p_user_role: string
        }
        Returns: string
      }
      analytics_query: {
        Args: { query: string }
        Returns: Json
      }
      can_manage_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      cleanup_old_security_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_comment_notifications: {
        Args: {
          comment_text: string
          commenter_name: string
          request_id_param: string
        }
        Returns: undefined
      }
      create_default_budget_categories: {
        Args: { org_id: string }
        Returns: undefined
      }
      debug_current_user_for_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_authenticated: boolean
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      debug_organization_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          budget_categories_count: number
          current_org_function: string
          profile_org_id: string
          session_org_id: string
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      debug_organization_creation: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_uid: string
          current_org_id: string
          is_authenticated: boolean
          profile_exists: boolean
        }[]
      }
      expire_trials: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_property_access_token: {
        Args: { p_expires_hours?: number; p_property_id: string }
        Returns: string
      }
      get_active_sessions_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_appropriate_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_contractor_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_contractor_user_id: {
        Args: { contractor_uuid: string }
        Returns: string
      }
      get_current_financial_year: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_current_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_organization_readonly: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_organization_safe: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role_readonly: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role_safe: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_organization_subscription: {
        Args: { org_id: string }
        Returns: {
          active_properties_count: number
          id: string
          is_cancelled: boolean
          is_trial_active: boolean
          organization_id: string
          payment_method_id: string
          subscribed: boolean
          subscription_status: string
          subscription_tier: string
          trial_end_date: string
        }[]
      }
      get_property_maintenance_spend: {
        Args: { p_financial_year?: number; p_property_id: string }
        Returns: {
          category_spend: Json
          total_spend: number
        }[]
      }
      get_security_compliance_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          violation_count: number
        }[]
      }
      get_security_metrics: {
        Args: { hours_back?: number; p_organization_id?: string }
        Returns: {
          failed_logins: number
          recent_events: Json
          successful_logins: number
          total_events: number
          unique_users: number
        }[]
      }
      get_user_default_organization: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role_for_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      initialize_property_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      initialize_user_profile: {
        Args: {
          email_param: string
          name_param?: string
          organization_id_param?: string
          user_id_param: string
        }
        Returns: string
      }
      insert_activity_log_secure: {
        Args: {
          p_action_type: string
          p_actor_name?: string
          p_actor_role?: string
          p_description: string
          p_metadata?: Json
          p_request_id: string
        }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_contractor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_contractor_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_first_user_signup: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_contractor_access: {
        Args: { user_id_param: string }
        Returns: string
      }
      log_organization_access: {
        Args: {
          action_type: string
          additional_info?: Json
          record_id?: string
          table_name: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_session_id?: string
          p_user_agent?: string
          p_user_email?: string
          p_user_id?: string
        }
        Returns: string
      }
      meta_to_array: {
        Args: { meta: Json }
        Returns: string[]
      }
      send_comment_email_notification: {
        Args: {
          p_comment_text: string
          p_commenter_name: string
          p_commenter_role: string
          p_request_id: string
        }
        Returns: undefined
      }
      send_comment_email_notifications_v2: {
        Args: { comment_id: string }
        Returns: undefined
      }
      send_trial_expiration_warnings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      submit_public_maintenance_request: {
        Args: {
          p_attachments?: string
          p_attempted_fix?: string
          p_category?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_description: string
          p_explanation?: string
          p_issue_nature?: string
          p_location?: string
          p_priority?: string
          p_property_id: string
          p_submitted_by?: string
          p_title: string
        }
        Returns: string
      }
      switch_user_organization: {
        Args: { new_org_id: string }
        Returns: boolean
      }
      sync_all_property_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_logging: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_has_property_access: {
        Args: { property_uuid: string }
        Returns: boolean
      }
      validate_property_access_token: {
        Args: { p_token: string }
        Returns: {
          is_valid: boolean
          organization_id: string
          property_id: string
          property_name: string
        }[]
      }
      verify_multi_tenancy_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          has_rls_policy: boolean
          health_status: string
          records_missing_org_id: number
          records_with_org_id: number
          table_name: string
          total_records: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
