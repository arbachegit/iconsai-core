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
      admin_settings: {
        Row: {
          auto_play_audio: boolean | null
          chat_audio_enabled: boolean | null
          created_at: string | null
          gmail_api_configured: boolean | null
          gmail_notification_email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
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
