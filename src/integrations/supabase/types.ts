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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          reference_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          alert_email: string | null
          alert_enabled: boolean | null
          alert_threshold: number | null
          auto_play_audio: boolean | null
          chat_audio_enabled: boolean | null
          created_at: string | null
          gmail_api_configured: boolean | null
          gmail_notification_email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      auto_preload_config: {
        Row: {
          check_interval_minutes: number | null
          enabled: boolean | null
          id: string
          last_check: string | null
          last_preload: string | null
          updated_at: string | null
        }
        Insert: {
          check_interval_minutes?: number | null
          enabled?: boolean | null
          id?: string
          last_check?: string | null
          last_preload?: string | null
          updated_at?: string | null
        }
        Update: {
          check_interval_minutes?: number | null
          enabled?: boolean | null
          id?: string
          last_check?: string | null
          last_preload?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_analytics: {
        Row: {
          audio_plays: number | null
          id: string
          last_interaction: string | null
          message_count: number | null
          session_id: string
          started_at: string | null
          topics: string[] | null
          user_name: string | null
        }
        Insert: {
          audio_plays?: number | null
          id?: string
          last_interaction?: string | null
          message_count?: number | null
          session_id: string
          started_at?: string | null
          topics?: string[] | null
          user_name?: string | null
        }
        Update: {
          audio_plays?: number | null
          id?: string
          last_interaction?: string | null
          message_count?: number | null
          session_id?: string
          started_at?: string | null
          topics?: string[] | null
          user_name?: string | null
        }
        Relationships: []
      }
      chat_config: {
        Row: {
          chat_type: string
          created_at: string | null
          health_issues: Json | null
          health_status: string | null
          id: string
          last_document_added: string | null
          match_count: number | null
          match_threshold: number | null
          rag_priority_instruction: string | null
          rejection_message: string | null
          scope_topics: string[] | null
          system_prompt_base: string | null
          total_chunks: number | null
          total_documents: number | null
          updated_at: string | null
        }
        Insert: {
          chat_type: string
          created_at?: string | null
          health_issues?: Json | null
          health_status?: string | null
          id?: string
          last_document_added?: string | null
          match_count?: number | null
          match_threshold?: number | null
          rag_priority_instruction?: string | null
          rejection_message?: string | null
          scope_topics?: string[] | null
          system_prompt_base?: string | null
          total_chunks?: number | null
          total_documents?: number | null
          updated_at?: string | null
        }
        Update: {
          chat_type?: string
          created_at?: string | null
          health_issues?: Json | null
          health_status?: string | null
          id?: string
          last_document_added?: string | null
          match_count?: number | null
          match_threshold?: number | null
          rag_priority_instruction?: string | null
          rejection_message?: string | null
          scope_topics?: string[] | null
          system_prompt_base?: string | null
          total_chunks?: number | null
          total_documents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          chat_type: string | null
          created_at: string
          id: string
          messages: Json
          sentiment_label: string | null
          sentiment_score: number | null
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chat_type?: string | null
          created_at?: string
          id?: string
          messages?: Json
          sentiment_label?: string | null
          sentiment_score?: number | null
          session_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chat_type?: string | null
          created_at?: string
          id?: string
          messages?: Json
          sentiment_label?: string | null
          sentiment_score?: number | null
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      credits_usage: {
        Row: {
          created_at: string | null
          credits_consumed: number | null
          error_code: string | null
          id: string
          metadata: Json | null
          operation_type: string
          section_id: string | null
          success: boolean
        }
        Insert: {
          created_at?: string | null
          credits_consumed?: number | null
          error_code?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          section_id?: string | null
          success: boolean
        }
        Update: {
          created_at?: string | null
          credits_consumed?: number | null
          error_code?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          section_id?: string | null
          success?: boolean
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          component: string | null
          created_at: string
          data: Json | null
          environment: string | null
          id: string
          log_type: string
          message: string
          scroll_x: number | null
          scroll_y: number | null
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          data?: Json | null
          environment?: string | null
          id?: string
          log_type: string
          message: string
          scroll_x?: number | null
          scroll_y?: number | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          component?: string | null
          created_at?: string
          data?: Json | null
          environment?: string | null
          id?: string
          log_type?: string
          message?: string
          scroll_x?: number | null
          scroll_y?: number | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          word_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          word_count: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          word_count?: number
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
      document_routing_log: {
        Row: {
          action_type: string
          created_at: string | null
          disclaimer_shown: boolean | null
          document_id: string | null
          document_name: string
          final_category: string
          id: string
          metadata: Json | null
          original_category: string
          scope_changed: boolean | null
          session_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          disclaimer_shown?: boolean | null
          document_id?: string | null
          document_name: string
          final_category: string
          id?: string
          metadata?: Json | null
          original_category: string
          scope_changed?: boolean | null
          session_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          disclaimer_shown?: boolean | null
          document_id?: string | null
          document_name?: string
          final_category?: string
          id?: string
          metadata?: Json | null
          original_category?: string
          scope_changed?: boolean | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_routing_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string
          id: string
          parent_tag_id: string | null
          source: string | null
          tag_name: string
          tag_type: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id: string
          id?: string
          parent_tag_id?: string | null
          source?: string | null
          tag_name: string
          tag_type: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string
          id?: string
          parent_tag_id?: string | null
          source?: string | null
          tag_name?: string
          tag_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_parent_tag_id_fkey"
            columns: ["parent_tag_id"]
            isOneToOne: false
            referencedRelation: "document_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_type: string
          created_at: string | null
          current_hash: string
          document_id: string | null
          id: string
          log_message: string
          metadata: Json | null
          previous_hash: string | null
          snapshot_id: string | null
          storage_reference_id: string | null
          version_number: number
        }
        Insert: {
          change_type: string
          created_at?: string | null
          current_hash: string
          document_id?: string | null
          id?: string
          log_message: string
          metadata?: Json | null
          previous_hash?: string | null
          snapshot_id?: string | null
          storage_reference_id?: string | null
          version_number?: number
        }
        Update: {
          change_type?: string
          created_at?: string | null
          current_hash?: string
          document_id?: string | null
          id?: string
          log_message?: string
          metadata?: Json | null
          previous_hash?: string | null
          snapshot_id?: string | null
          storage_reference_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_versions: {
        Row: {
          author: string | null
          changes: Json
          created_at: string
          id: string
          release_date: string
          version: string
        }
        Insert: {
          author?: string | null
          changes?: Json
          created_at?: string
          id?: string
          release_date?: string
          version: string
        }
        Update: {
          author?: string | null
          changes?: Json
          created_at?: string
          id?: string
          release_date?: string
          version?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_summary: string | null
          content_hash: string | null
          created_at: string | null
          error_message: string | null
          filename: string
          id: string
          implementation_status: string | null
          inserted_at: string | null
          inserted_in_chat: string | null
          is_inserted: boolean | null
          is_readable: boolean | null
          original_text: string
          readability_score: number | null
          redirected_from: string | null
          status: string | null
          target_chat: string
          text_preview: string | null
          total_chunks: number | null
          total_words: number | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          content_hash?: string | null
          created_at?: string | null
          error_message?: string | null
          filename: string
          id?: string
          implementation_status?: string | null
          inserted_at?: string | null
          inserted_in_chat?: string | null
          is_inserted?: boolean | null
          is_readable?: boolean | null
          original_text: string
          readability_score?: number | null
          redirected_from?: string | null
          status?: string | null
          target_chat: string
          text_preview?: string | null
          total_chunks?: number | null
          total_words?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          content_hash?: string | null
          created_at?: string | null
          error_message?: string | null
          filename?: string
          id?: string
          implementation_status?: string | null
          inserted_at?: string | null
          inserted_in_chat?: string | null
          is_inserted?: boolean | null
          is_readable?: boolean | null
          original_text?: string
          readability_score?: number | null
          redirected_from?: string | null
          status?: string | null
          target_chat?: string
          text_preview?: string | null
          total_chunks?: number | null
          total_words?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          environment: string | null
          flag_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string | null
          flag_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string | null
          flag_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          prompt_key: string
          section_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          prompt_key: string
          section_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          prompt_key?: string
          section_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      image_analytics: {
        Row: {
          cached: boolean
          created_at: string | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          prompt_key: string
          section_id: string
          success: boolean
        }
        Insert: {
          cached?: boolean
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          prompt_key: string
          section_id: string
          success: boolean
        }
        Update: {
          cached?: boolean
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          prompt_key?: string
          section_id?: string
          success?: boolean
        }
        Relationships: []
      }
      rag_analytics: {
        Row: {
          created_at: string | null
          id: string
          latency_ms: number
          match_threshold: number | null
          metadata: Json | null
          query: string
          results_count: number | null
          session_id: string | null
          success_status: boolean
          target_chat: string | null
          top_similarity_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latency_ms: number
          match_threshold?: number | null
          metadata?: Json | null
          query: string
          results_count?: number | null
          session_id?: string | null
          success_status: boolean
          target_chat?: string | null
          top_similarity_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latency_ms?: number
          match_threshold?: number | null
          metadata?: Json | null
          query?: string
          results_count?: number | null
          session_id?: string | null
          success_status?: boolean
          target_chat?: string | null
          top_similarity_score?: number | null
        }
        Relationships: []
      }
      section_audio: {
        Row: {
          audio_url: string
          created_at: string | null
          id: string
          section_id: string
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          id?: string
          section_id: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          id?: string
          section_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tooltip_contents: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          section_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          section_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          section_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      version_control: {
        Row: {
          associated_data: Json | null
          created_at: string | null
          current_version: string
          id: string
          log_message: string
          timestamp: string
          trigger_type: string
        }
        Insert: {
          associated_data?: Json | null
          created_at?: string | null
          current_version?: string
          id?: string
          log_message: string
          timestamp?: string
          trigger_type: string
        }
        Update: {
          associated_data?: Json | null
          created_at?: string | null
          current_version?: string
          id?: string
          log_message?: string
          timestamp?: string
          trigger_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_schema_info: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_chat_config_stats: { Args: never; Returns: undefined }
      log_credit_usage: {
        Args: {
          p_error_code?: string
          p_metadata?: Json
          p_operation_type: string
          p_section_id?: string
          p_success: boolean
        }
        Returns: string
      }
      search_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_chat_filter?: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_documents_fulltext: {
        Args: {
          match_count?: number
          search_query: string
          target_chat_filter?: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_documents_keywords: {
        Args: {
          keywords: string[]
          match_count?: number
          target_chat_filter?: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          matched_keyword: string
          metadata: Json
          similarity: number
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
