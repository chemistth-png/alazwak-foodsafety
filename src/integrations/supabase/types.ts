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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_tasks: {
        Row: {
          ai_output: string | null
          content: Json | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          ai_output?: string | null
          content?: Json | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          ai_output?: string | null
          content?: Json | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_title: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_sops: {
        Row: {
          created_at: string
          id: number
          status: string
          template_id: number
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: never
          status?: string
          template_id: number
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: never
          status?: string
          template_id?: number
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sops_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "master_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          file_name: string
          id: string
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      flowcharts: {
        Row: {
          created_at: string
          data: Json
          id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      haccp_plans: {
        Row: {
          ccps: Json
          created_at: string
          doc_number: string | null
          hazards: Json
          id: string
          signature_data: Json | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ccps?: Json
          created_at?: string
          doc_number?: string | null
          hazards?: Json
          id?: string
          signature_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ccps?: Json
          created_at?: string
          doc_number?: string | null
          hazards?: Json
          id?: string
          signature_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      master_templates: {
        Row: {
          category: string
          created_at: string
          file_path: string
          id: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          id?: never
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          id?: never
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_reports: {
        Row: {
          batch_number: string
          category: string
          ccp_ref: string
          closed_at: string | null
          corrective_action: string
          created_at: string
          description: string
          detected_at: string
          hazard_type: string
          id: string
          lot_code: string
          report_number: string
          responsible: string
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string
        }
        Insert: {
          batch_number?: string
          category?: string
          ccp_ref?: string
          closed_at?: string | null
          corrective_action?: string
          created_at?: string
          description?: string
          detected_at?: string
          hazard_type?: string
          id?: string
          lot_code?: string
          report_number?: string
          responsible?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string
        }
        Update: {
          batch_number?: string
          category?: string
          ccp_ref?: string
          closed_at?: string | null
          corrective_action?: string
          created_at?: string
          description?: string
          detected_at?: string
          hazard_type?: string
          id?: string
          lot_code?: string
          report_number?: string
          responsible?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string
        }
        Relationships: []
      }
      reference_favorites: {
        Row: {
          created_at: string
          id: string
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sops: {
        Row: {
          approved_by: string | null
          category: string | null
          created_at: string
          definitions: string | null
          department: string | null
          doc_number: string | null
          effective_date: string | null
          id: string
          prepared_by: string | null
          purpose: string | null
          records: string | null
          references: string | null
          revision: string | null
          safety_notes: string | null
          scope: string | null
          steps: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          category?: string | null
          created_at?: string
          definitions?: string | null
          department?: string | null
          doc_number?: string | null
          effective_date?: string | null
          id?: string
          prepared_by?: string | null
          purpose?: string | null
          records?: string | null
          references?: string | null
          revision?: string | null
          safety_notes?: string | null
          scope?: string | null
          steps?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          category?: string | null
          created_at?: string
          definitions?: string | null
          department?: string | null
          doc_number?: string | null
          effective_date?: string | null
          id?: string
          prepared_by?: string | null
          purpose?: string | null
          records?: string | null
          references?: string | null
          revision?: string | null
          safety_notes?: string | null
          scope?: string | null
          steps?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_settings: {
        Row: {
          bot_token: string | null
          chat_id: string | null
          created_at: string
          enabled: boolean
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_title?: string
          p_entity_type: string
        }
        Returns: string
      }
      search_document_chunks: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          file_name: string
          id: string
          relevance: number
        }[]
      }
      search_documents: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          content: string
          file_name: string
          id: string
          similarity_score: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
