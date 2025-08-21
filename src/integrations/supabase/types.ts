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
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string | null
          id: string
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
          request_id?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string | null
          text?: string | null
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
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
          phone?: string
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
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
          request_id: string
          scheduled_dates: Json
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          request_id: string
          scheduled_dates?: Json
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
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
          phone?: string | null
          postal_address?: string | null
          updated_at?: string
        }
        Relationships: []
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          title?: string
          type?: string
          user_id?: string
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
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          assigned_properties?: string[] | null
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          assigned_properties?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
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
          practice_leader: string
          practice_leader_email: string | null
          practice_leader_phone: string | null
          renewal_date: string | null
          rent_amount: number | null
          rent_period: string | null
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
          practice_leader: string
          practice_leader_email?: string | null
          practice_leader_phone?: string | null
          renewal_date?: string | null
          rent_amount?: number | null
          rent_period?: string | null
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
          practice_leader?: string
          practice_leader_email?: string | null
          practice_leader_phone?: string | null
          renewal_date?: string | null
          rent_amount?: number | null
          rent_period?: string | null
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
        ]
      }
      property_budgets: {
        Row: {
          budget_category_id: string
          budgeted_amount: number
          created_at: string
          financial_year: number
          id: string
          property_id: string
          updated_at: string
        }
        Insert: {
          budget_category_id: string
          budgeted_amount?: number
          created_at?: string
          financial_year: number
          id?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          budget_category_id?: string
          budgeted_amount?: number
          created_at?: string
          financial_year?: number
          id?: string
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
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      create_comment_notifications: {
        Args: {
          comment_text: string
          commenter_name: string
          request_id_param: string
        }
        Returns: undefined
      }
      create_tenant_schema: {
        Args: { new_user_id: string; schema_prefix?: string }
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_property_maintenance_spend: {
        Args: { p_financial_year?: number; p_property_id: string }
        Returns: {
          category_spend: Json
          total_spend: number
        }[]
      }
      get_user_role_for_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_schema: {
        Args: Record<PropertyKey, never>
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
      log_contractor_access: {
        Args: { user_id_param: string }
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
      use_tenant_schema: {
        Args: { operation: string }
        Returns: undefined
      }
      user_has_property_access: {
        Args: { property_uuid: string }
        Returns: boolean
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
