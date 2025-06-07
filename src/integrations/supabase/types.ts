export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          created_at: string
          id: string
          request_id: string
          text: string
          updated_at: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          text: string
          updated_at?: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          text?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          user_role?: string
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
      maintenance_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          attachments: Json | null
          attempted_fix: string | null
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
          is_participant_related: boolean | null
          issue_nature: string | null
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
          attachments?: Json | null
          attempted_fix?: string | null
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
          is_participant_related?: boolean | null
          issue_nature?: string | null
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
          attachments?: Json | null
          attempted_fix?: string | null
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
          is_participant_related?: boolean | null
          issue_nature?: string | null
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
            foreignKeyName: "maintenance_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
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
          role: string
          updated_at: string | null
        }
        Insert: {
          assigned_properties?: string[] | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          assigned_properties?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
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
          name: string
          practice_leader: string
          practice_leader_email: string | null
          practice_leader_phone: string | null
          renewal_date: string | null
          rent_amount: number | null
          user_id: string
        }
        Insert: {
          address: string
          contact_number: string
          created_at?: string
          email: string
          id?: string
          name: string
          practice_leader: string
          practice_leader_email?: string | null
          practice_leader_phone?: string | null
          renewal_date?: string | null
          rent_amount?: number | null
          user_id: string
        }
        Update: {
          address?: string
          contact_number?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          practice_leader?: string
          practice_leader_email?: string | null
          practice_leader_phone?: string | null
          renewal_date?: string | null
          rent_amount?: number | null
          user_id?: string
        }
        Relationships: []
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
      create_tenant_schema: {
        Args: { new_user_id: string; schema_prefix?: string }
        Returns: string
      }
      get_contractor_user_id: {
        Args: { contractor_uuid: string }
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
      meta_to_array: {
        Args: { meta: Json }
        Returns: string[]
      }
      use_tenant_schema: {
        Args: { operation: string }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
