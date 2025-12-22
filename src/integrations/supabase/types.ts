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
          api_sync_cron_hour: string | null
          api_sync_cron_minute: string | null
          api_sync_default_frequency: string | null
          api_sync_enabled: boolean | null
          auto_play_audio: boolean | null
          chat_audio_enabled: boolean | null
          created_at: string | null
          daily_report_enabled: boolean | null
          doc_sync_alert_email: string | null
          doc_sync_time: string | null
          email_global_enabled: boolean | null
          gmail_api_configured: boolean | null
          gmail_notification_email: string | null
          id: string
          last_scheduled_scan: string | null
          last_scheduler_error: string | null
          last_security_scan: string | null
          ml_accuracy_alert_email: string | null
          ml_accuracy_alert_enabled: boolean | null
          ml_accuracy_last_alert: string | null
          ml_accuracy_threshold: number | null
          monthly_report_enabled: boolean | null
          security_alert_email: string | null
          security_alert_threshold: string | null
          security_scan_enabled: boolean | null
          sms_as_fallback: boolean | null
          sms_enabled: boolean | null
          twilio_sms_number: string | null
          updated_at: string | null
          vimeo_history_url: string | null
          weekly_report_enabled: boolean | null
          whatsapp_global_enabled: boolean | null
          whatsapp_target_phone: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          api_sync_cron_hour?: string | null
          api_sync_cron_minute?: string | null
          api_sync_default_frequency?: string | null
          api_sync_enabled?: boolean | null
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          daily_report_enabled?: boolean | null
          doc_sync_alert_email?: string | null
          doc_sync_time?: string | null
          email_global_enabled?: boolean | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          last_scheduled_scan?: string | null
          last_scheduler_error?: string | null
          last_security_scan?: string | null
          ml_accuracy_alert_email?: string | null
          ml_accuracy_alert_enabled?: boolean | null
          ml_accuracy_last_alert?: string | null
          ml_accuracy_threshold?: number | null
          monthly_report_enabled?: boolean | null
          security_alert_email?: string | null
          security_alert_threshold?: string | null
          security_scan_enabled?: boolean | null
          sms_as_fallback?: boolean | null
          sms_enabled?: boolean | null
          twilio_sms_number?: string | null
          updated_at?: string | null
          vimeo_history_url?: string | null
          weekly_report_enabled?: boolean | null
          whatsapp_global_enabled?: boolean | null
          whatsapp_target_phone?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          api_sync_cron_hour?: string | null
          api_sync_cron_minute?: string | null
          api_sync_default_frequency?: string | null
          api_sync_enabled?: boolean | null
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          daily_report_enabled?: boolean | null
          doc_sync_alert_email?: string | null
          doc_sync_time?: string | null
          email_global_enabled?: boolean | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          last_scheduled_scan?: string | null
          last_scheduler_error?: string | null
          last_security_scan?: string | null
          ml_accuracy_alert_email?: string | null
          ml_accuracy_alert_enabled?: boolean | null
          ml_accuracy_last_alert?: string | null
          ml_accuracy_threshold?: number | null
          monthly_report_enabled?: boolean | null
          security_alert_email?: string | null
          security_alert_threshold?: string | null
          security_scan_enabled?: boolean | null
          sms_as_fallback?: boolean | null
          sms_enabled?: boolean | null
          twilio_sms_number?: string | null
          updated_at?: string | null
          vimeo_history_url?: string | null
          weekly_report_enabled?: boolean | null
          whatsapp_global_enabled?: boolean | null
          whatsapp_target_phone?: string | null
        }
        Relationships: []
      }
      agent_phrases: {
        Row: {
          agent_id: string | null
          category: string | null
          created_at: string | null
          id: string
          is_global: boolean | null
          phrase: string
          phrase_type: string
          replacement: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          phrase: string
          phrase_type: string
          replacement?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          phrase?: string
          phrase_type?: string
          replacement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_phrases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_pronunciations: {
        Row: {
          agent_id: string | null
          approximate: string
          category: string | null
          created_at: string | null
          id: string
          ipa: string | null
          is_global: boolean | null
          term: string
          updated_at: string | null
          variations: string | null
        }
        Insert: {
          agent_id?: string | null
          approximate: string
          category?: string | null
          created_at?: string | null
          id?: string
          ipa?: string | null
          is_global?: boolean | null
          term: string
          updated_at?: string | null
          variations?: string | null
        }
        Update: {
          agent_id?: string | null
          approximate?: string
          category?: string | null
          created_at?: string | null
          id?: string
          ipa?: string | null
          is_global?: boolean | null
          term?: string
          updated_at?: string | null
          variations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_pronunciations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tag_profiles: {
        Row: {
          access_type: string
          agent_id: string
          created_at: string | null
          id: string
          include_children: boolean | null
          taxonomy_id: string
          weight: number | null
        }
        Insert: {
          access_type: string
          agent_id: string
          created_at?: string | null
          id?: string
          include_children?: boolean | null
          taxonomy_id: string
          weight?: number | null
        }
        Update: {
          access_type?: string
          agent_id?: string
          created_at?: string | null
          id?: string
          include_children?: boolean | null
          taxonomy_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tag_profiles_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "chat_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tag_profiles_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      api_audit_logs: {
        Row: {
          action_description: string
          api_id: string | null
          api_name: string
          created_at: string
          environment: string | null
          error_message: string | null
          error_stack: string | null
          event_category: string
          event_type: string
          execution_time_ms: number | null
          http_status: number | null
          id: string
          ip_address: unknown
          records_affected: number | null
          request_payload: Json | null
          response_payload: Json | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action_description: string
          api_id?: string | null
          api_name: string
          created_at?: string
          environment?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_category: string
          event_type: string
          execution_time_ms?: number | null
          http_status?: number | null
          id?: string
          ip_address?: unknown
          records_affected?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action_description?: string
          api_id?: string | null
          api_name?: string
          created_at?: string
          environment?: string | null
          error_message?: string | null
          error_stack?: string | null
          event_category?: string
          event_type?: string
          execution_time_ms?: number | null
          http_status?: number | null
          id?: string
          ip_address?: unknown
          records_affected?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_audit_logs_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "system_api_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      api_test_staging: {
        Row: {
          all_variables: Json | null
          base_url: string
          created_at: string | null
          description: string | null
          discovered_period_end: string | null
          discovered_period_start: string | null
          error_message: string | null
          http_status: number | null
          id: string
          implementation_params: Json | null
          is_functional: boolean | null
          last_raw_response: Json | null
          name: string
          provider: string
          selected_variables: Json | null
          status: string | null
          test_timestamp: string | null
          updated_at: string | null
        }
        Insert: {
          all_variables?: Json | null
          base_url: string
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          implementation_params?: Json | null
          is_functional?: boolean | null
          last_raw_response?: Json | null
          name: string
          provider?: string
          selected_variables?: Json | null
          status?: string | null
          test_timestamp?: string | null
          updated_at?: string | null
        }
        Update: {
          all_variables?: Json | null
          base_url?: string
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          implementation_params?: Json | null
          is_functional?: boolean | null
          last_raw_response?: Json | null
          name?: string
          provider?: string
          selected_variables?: Json | null
          status?: string | null
          test_timestamp?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          category: string | null
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audio_contents: {
        Row: {
          audio_url: string
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          is_active: boolean | null
          storage_path: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          title?: string
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
      banned_devices: {
        Row: {
          ban_reason: string
          banned_at: string | null
          created_at: string | null
          device_fingerprint: string
          id: string
          ip_address: unknown
          is_active: boolean
          is_permanent: boolean | null
          unbanned_at: string | null
          unbanned_by: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          violation_type: string
        }
        Insert: {
          ban_reason: string
          banned_at?: string | null
          created_at?: string | null
          device_fingerprint: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          is_permanent?: boolean | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_type: string
        }
        Update: {
          ban_reason?: string
          banned_at?: string | null
          created_at?: string | null
          device_fingerprint?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          is_permanent?: boolean | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      brazilian_ufs: {
        Row: {
          capital: string | null
          created_at: string | null
          id: string
          region_code: string
          region_name: string
          uf_code: number
          uf_name: string
          uf_sigla: string
        }
        Insert: {
          capital?: string | null
          created_at?: string | null
          id?: string
          region_code: string
          region_name: string
          uf_code: number
          uf_name: string
          uf_sigla: string
        }
        Update: {
          capital?: string | null
          created_at?: string | null
          id?: string
          region_code?: string
          region_name?: string
          uf_code?: number
          uf_name?: string
          uf_sigla?: string
        }
        Relationships: []
      }
      chat_agents: {
        Row: {
          agent_color: string | null
          allowed_tags: string[] | null
          avatar_url: string | null
          capabilities: Json | null
          communication_style_id: string | null
          created_at: string | null
          description: string | null
          deterministic_mode: boolean | null
          display_order: number | null
          forbidden_tags: string[] | null
          greeting_message: string | null
          humanization_level: number | null
          id: string
          is_active: boolean | null
          location: string | null
          maieutic_level: string | null
          match_count: number | null
          match_threshold: number | null
          name: string
          pause_level: number | null
          pronunciation_rules: Json | null
          pronunciation_set: string | null
          rag_collection: string
          regional_tone: string | null
          rejection_message: string | null
          slug: string
          suggested_badges: Json | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          agent_color?: string | null
          allowed_tags?: string[] | null
          avatar_url?: string | null
          capabilities?: Json | null
          communication_style_id?: string | null
          created_at?: string | null
          description?: string | null
          deterministic_mode?: boolean | null
          display_order?: number | null
          forbidden_tags?: string[] | null
          greeting_message?: string | null
          humanization_level?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          maieutic_level?: string | null
          match_count?: number | null
          match_threshold?: number | null
          name: string
          pause_level?: number | null
          pronunciation_rules?: Json | null
          pronunciation_set?: string | null
          rag_collection: string
          regional_tone?: string | null
          rejection_message?: string | null
          slug: string
          suggested_badges?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_color?: string | null
          allowed_tags?: string[] | null
          avatar_url?: string | null
          capabilities?: Json | null
          communication_style_id?: string | null
          created_at?: string | null
          description?: string | null
          deterministic_mode?: boolean | null
          display_order?: number | null
          forbidden_tags?: string[] | null
          greeting_message?: string | null
          humanization_level?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          maieutic_level?: string | null
          match_count?: number | null
          match_threshold?: number | null
          name?: string
          pause_level?: number | null
          pronunciation_rules?: Json | null
          pronunciation_set?: string | null
          rag_collection?: string
          regional_tone?: string | null
          rejection_message?: string | null
          slug?: string
          suggested_badges?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_agents_communication_style_id_fkey"
            columns: ["communication_style_id"]
            isOneToOne: false
            referencedRelation: "communication_styles"
            referencedColumns: ["id"]
          },
        ]
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
          document_tags_data: Json | null
          duplicate_similarity_threshold: number | null
          health_issues: Json | null
          health_status: string | null
          id: string
          last_document_added: string | null
          match_count: number | null
          match_threshold: number | null
          phonetic_map: Json | null
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
          document_tags_data?: Json | null
          duplicate_similarity_threshold?: number | null
          health_issues?: Json | null
          health_status?: string | null
          id?: string
          last_document_added?: string | null
          match_count?: number | null
          match_threshold?: number | null
          phonetic_map?: Json | null
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
          document_tags_data?: Json | null
          duplicate_similarity_threshold?: number | null
          health_issues?: Json | null
          health_status?: string | null
          id?: string
          last_document_added?: string | null
          match_count?: number | null
          match_threshold?: number | null
          phonetic_map?: Json | null
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
      chat_routing_rules: {
        Row: {
          confidence: number | null
          corrected_chat: string
          correction_count: number | null
          created_at: string | null
          created_by: string | null
          document_filename_pattern: string
          id: string
          suggested_chat: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          corrected_chat: string
          correction_count?: number | null
          created_at?: string | null
          created_by?: string | null
          document_filename_pattern: string
          id?: string
          suggested_chat: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          corrected_chat?: string
          correction_count?: number | null
          created_at?: string | null
          created_by?: string | null
          document_filename_pattern?: string
          id?: string
          suggested_chat?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_styles: {
        Row: {
          complexity: number | null
          created_at: string | null
          description: string | null
          empathy: number | null
          formality: number | null
          id: string
          is_active: boolean | null
          max_paragraph_length: number | null
          persona_description: string | null
          style_code: string
          style_name: string
          updated_at: string | null
          use_bullet_points: boolean | null
          use_examples: boolean | null
          verbosity: number | null
        }
        Insert: {
          complexity?: number | null
          created_at?: string | null
          description?: string | null
          empathy?: number | null
          formality?: number | null
          id?: string
          is_active?: boolean | null
          max_paragraph_length?: number | null
          persona_description?: string | null
          style_code: string
          style_name: string
          updated_at?: string | null
          use_bullet_points?: boolean | null
          use_examples?: boolean | null
          verbosity?: number | null
        }
        Update: {
          complexity?: number | null
          created_at?: string | null
          description?: string | null
          empathy?: number | null
          formality?: number | null
          id?: string
          is_active?: boolean | null
          max_paragraph_length?: number | null
          persona_description?: string | null
          style_code?: string
          style_name?: string
          updated_at?: string | null
          use_bullet_points?: boolean | null
          use_examples?: boolean | null
          verbosity?: number | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          metadata: Json | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      context_detection_rules: {
        Row: {
          context_id: string | null
          created_at: string | null
          id: string
          rule_type: string | null
          rule_value: string
          weight: number | null
        }
        Insert: {
          context_id?: string | null
          created_at?: string | null
          id?: string
          rule_type?: string | null
          rule_value: string
          weight?: number | null
        }
        Update: {
          context_id?: string | null
          created_at?: string | null
          id?: string
          rule_type?: string | null
          rule_value?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "context_detection_rules_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "context_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      context_profiles: {
        Row: {
          antiprompt: string | null
          code: string
          created_at: string | null
          description: string | null
          detection_keywords: string[] | null
          detection_priority: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          maieutic_enabled: boolean | null
          match_count: number | null
          match_threshold: number | null
          name: string
          prompt_additions: string | null
          prompt_template: string
          taxonomy_codes: string[] | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          antiprompt?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          detection_keywords?: string[] | null
          detection_priority?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          maieutic_enabled?: boolean | null
          match_count?: number | null
          match_threshold?: number | null
          name: string
          prompt_additions?: string | null
          prompt_template?: string
          taxonomy_codes?: string[] | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          antiprompt?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          detection_keywords?: string[] | null
          detection_priority?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          maieutic_enabled?: boolean | null
          match_count?: number | null
          match_threshold?: number | null
          name?: string
          prompt_additions?: string | null
          prompt_template?: string
          taxonomy_codes?: string[] | null
          tone?: string | null
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
      deterministic_analysis: {
        Row: {
          analysis_reason: string | null
          analyzed_at: string | null
          chat_type: string
          classification: string
          conversation_id: string | null
          created_at: string | null
          id: string
          original_message: string
          question_type: string | null
          refactored_version: string | null
          session_id: string
        }
        Insert: {
          analysis_reason?: string | null
          analyzed_at?: string | null
          chat_type: string
          classification: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          original_message: string
          question_type?: string | null
          refactored_version?: string | null
          session_id: string
        }
        Update: {
          analysis_reason?: string | null
          analyzed_at?: string | null
          chat_type?: string
          classification?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          original_message?: string
          question_type?: string | null
          refactored_version?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deterministic_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_history"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
          },
        ]
      }
      document_onboarding_log: {
        Row: {
          applied_taxonomies: Json | null
          auto_applied_count: number | null
          avg_confidence: number | null
          created_at: string | null
          document_id: string
          error_message: string | null
          highest_confidence: number | null
          id: string
          processing_time_ms: number | null
          source_text_preview: string | null
          status: string
          suggested_taxonomies: Json | null
          total_suggestions: number | null
        }
        Insert: {
          applied_taxonomies?: Json | null
          auto_applied_count?: number | null
          avg_confidence?: number | null
          created_at?: string | null
          document_id: string
          error_message?: string | null
          highest_confidence?: number | null
          id?: string
          processing_time_ms?: number | null
          source_text_preview?: string | null
          status: string
          suggested_taxonomies?: Json | null
          total_suggestions?: number | null
        }
        Update: {
          applied_taxonomies?: Json | null
          auto_applied_count?: number | null
          avg_confidence?: number | null
          created_at?: string | null
          document_id?: string
          error_message?: string | null
          highest_confidence?: number | null
          id?: string
          processing_time_ms?: number | null
          source_text_preview?: string | null
          status?: string
          suggested_taxonomies?: Json | null
          total_suggestions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_onboarding_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_onboarding_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
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
          {
            foreignKeyName: "document_routing_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
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
          synonyms: string[] | null
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
          synonyms?: string[] | null
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
          synonyms?: string[] | null
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
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
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
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
          },
        ]
      }
      documentation_sync_log: {
        Row: {
          changes_detected: Json | null
          completed_at: string | null
          created_at: string
          current_phase: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          phases_completed: Json | null
          progress: number | null
          started_at: string
          status: string
          sync_id: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          changes_detected?: Json | null
          completed_at?: string | null
          created_at?: string
          current_phase?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          phases_completed?: Json | null
          progress?: number | null
          started_at?: string
          status: string
          sync_id: string
          trigger_type: string
          triggered_by?: string | null
        }
        Update: {
          changes_detected?: Json | null
          completed_at?: string | null
          created_at?: string
          current_phase?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          phases_completed?: Json | null
          progress?: number | null
          started_at?: string
          status?: string
          sync_id?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
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
          ai_title: string | null
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
          needs_title_review: boolean | null
          original_text: string
          original_title: string | null
          processing_progress: number | null
          readability_score: number | null
          redirected_from: string | null
          rename_reason: string | null
          renamed_at: string | null
          status: string | null
          target_chat: string
          text_preview: string | null
          title_source: string | null
          title_was_renamed: boolean | null
          total_chunks: number | null
          total_words: number | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_title?: string | null
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
          needs_title_review?: boolean | null
          original_text: string
          original_title?: string | null
          processing_progress?: number | null
          readability_score?: number | null
          redirected_from?: string | null
          rename_reason?: string | null
          renamed_at?: string | null
          status?: string | null
          target_chat: string
          text_preview?: string | null
          title_source?: string | null
          title_was_renamed?: boolean | null
          total_chunks?: number | null
          total_words?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_title?: string | null
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
          needs_title_review?: boolean | null
          original_text?: string
          original_title?: string | null
          processing_progress?: number | null
          readability_score?: number | null
          redirected_from?: string | null
          rename_reason?: string | null
          renamed_at?: string | null
          status?: string | null
          target_chat?: string
          text_preview?: string | null
          title_source?: string | null
          title_was_renamed?: boolean | null
          total_chunks?: number | null
          total_words?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      economic_indicators: {
        Row: {
          api_id: string | null
          category: string | null
          code: string
          created_at: string | null
          cron_schedule: string | null
          frequency: string | null
          id: string
          is_regional: boolean | null
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: string | null
          category?: string | null
          code: string
          created_at?: string | null
          cron_schedule?: string | null
          frequency?: string | null
          id?: string
          is_regional?: boolean | null
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: string | null
          category?: string | null
          code?: string
          created_at?: string | null
          cron_schedule?: string | null
          frequency?: string | null
          id?: string
          is_regional?: boolean | null
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_indicators_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "system_api_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean | null
          source: string
          taxonomy_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean | null
          source: string
          taxonomy_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean | null
          source?: string
          taxonomy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
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
      global_taxonomy: {
        Row: {
          auto_created: boolean | null
          code: string
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          keywords: string[] | null
          level: number
          name: string
          parent_id: string | null
          status: string | null
          synonyms: string[] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          auto_created?: boolean | null
          code: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          keywords?: string[] | null
          level?: number
          name: string
          parent_id?: string | null
          status?: string | null
          synonyms?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          auto_created?: boolean | null
          code?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          keywords?: string[] | null
          level?: number
          name?: string
          parent_id?: string | null
          status?: string | null
          synonyms?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "global_taxonomy_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
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
      indicator_regional_values: {
        Row: {
          created_at: string | null
          id: string
          indicator_id: string
          reference_date: string
          uf_code: number
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_id: string
          reference_date: string
          uf_code: number
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_id?: string
          reference_date?: string
          uf_code?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_regional_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "economic_indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_regional_values_uf_code_fkey"
            columns: ["uf_code"]
            isOneToOne: false
            referencedRelation: "brazilian_ufs"
            referencedColumns: ["uf_code"]
          },
        ]
      }
      indicator_values: {
        Row: {
          created_at: string | null
          id: string
          indicator_id: string
          reference_date: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_id: string
          reference_date: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_id?: string
          reference_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "economic_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_check_log: {
        Row: {
          check_timestamp: string
          check_type: string
          created_at: string | null
          id: string
          issues_found: Json | null
          modules_checked: string[] | null
          recommendations: Json | null
        }
        Insert: {
          check_timestamp?: string
          check_type: string
          created_at?: string | null
          id?: string
          issues_found?: Json | null
          modules_checked?: string[] | null
          recommendations?: Json | null
        }
        Update: {
          check_timestamp?: string
          check_type?: string
          created_at?: string | null
          id?: string
          issues_found?: Json | null
          modules_checked?: string[] | null
          recommendations?: Json | null
        }
        Relationships: []
      }
      lexicon_terms: {
        Row: {
          antonyms: string[] | null
          audio_url: string | null
          created_at: string | null
          definition: string
          definition_simple: string | null
          domain: string[] | null
          example_usage: string | null
          id: string
          is_approved: boolean | null
          part_of_speech: string | null
          pronunciation_ipa: string | null
          pronunciation_phonetic: string | null
          register: string | null
          related_terms: string[] | null
          source: string | null
          synonyms: string[] | null
          taxonomy_id: string | null
          term: string
          term_normalized: string
        }
        Insert: {
          antonyms?: string[] | null
          audio_url?: string | null
          created_at?: string | null
          definition: string
          definition_simple?: string | null
          domain?: string[] | null
          example_usage?: string | null
          id?: string
          is_approved?: boolean | null
          part_of_speech?: string | null
          pronunciation_ipa?: string | null
          pronunciation_phonetic?: string | null
          register?: string | null
          related_terms?: string[] | null
          source?: string | null
          synonyms?: string[] | null
          taxonomy_id?: string | null
          term: string
          term_normalized: string
        }
        Update: {
          antonyms?: string[] | null
          audio_url?: string | null
          created_at?: string | null
          definition?: string
          definition_simple?: string | null
          domain?: string[] | null
          example_usage?: string | null
          id?: string
          is_approved?: boolean | null
          part_of_speech?: string | null
          pronunciation_ipa?: string | null
          pronunciation_phonetic?: string | null
          register?: string | null
          related_terms?: string[] | null
          source?: string | null
          synonyms?: string[] | null
          taxonomy_id?: string | null
          term?: string
          term_normalized?: string
        }
        Relationships: [
          {
            foreignKeyName: "lexicon_terms_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      maieutic_training_categories: {
        Row: {
          antiprompt: string | null
          behavioral_instructions: string | null
          category_icon: string | null
          category_key: string
          category_name: string
          combination_rules: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          positive_directives: string | null
          updated_at: string | null
        }
        Insert: {
          antiprompt?: string | null
          behavioral_instructions?: string | null
          category_icon?: string | null
          category_key: string
          category_name: string
          combination_rules?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          positive_directives?: string | null
          updated_at?: string | null
        }
        Update: {
          antiprompt?: string | null
          behavioral_instructions?: string | null
          category_icon?: string | null
          category_key?: string
          category_name?: string
          combination_rules?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          positive_directives?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_news: {
        Row: {
          created_at: string | null
          id: string
          published_at: string | null
          sentiment_score: number | null
          source: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          sentiment_score?: number | null
          source: string
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          sentiment_score?: number | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      ml_correlations: {
        Row: {
          correlation_strength: number
          created_at: string | null
          id: string
          keyword: string
          last_validated_at: string | null
          occurrence_count: number
          source: string
          taxonomy_code: string
          taxonomy_id: string | null
          updated_at: string | null
        }
        Insert: {
          correlation_strength?: number
          created_at?: string | null
          id?: string
          keyword: string
          last_validated_at?: string | null
          occurrence_count?: number
          source?: string
          taxonomy_code: string
          taxonomy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          correlation_strength?: number
          created_at?: string | null
          id?: string
          keyword?: string
          last_validated_at?: string | null
          occurrence_count?: number
          source?: string
          taxonomy_code?: string
          taxonomy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_correlations_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_restrictions: {
        Row: {
          created_at: string | null
          id: string
          keyword: string
          last_validated_at: string | null
          occurrence_count: number
          restricted_taxonomy_code: string
          restricted_taxonomy_id: string | null
          restriction_strength: number
          source: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          keyword: string
          last_validated_at?: string | null
          occurrence_count?: number
          restricted_taxonomy_code: string
          restricted_taxonomy_id?: string | null
          restriction_strength?: number
          source?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          keyword?: string
          last_validated_at?: string | null
          occurrence_count?: number
          restricted_taxonomy_code?: string
          restricted_taxonomy_id?: string | null
          restriction_strength?: number
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_restrictions_restricted_taxonomy_id_fkey"
            columns: ["restricted_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_tag_feedback: {
        Row: {
          admin_notes: string | null
          confidence_after: number | null
          confidence_before: number | null
          corrected_code: string | null
          corrected_taxonomy_id: string | null
          created_at: string
          created_by: string | null
          document_id: string
          feedback_type: string
          id: string
          original_code: string | null
          original_taxonomy_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          corrected_code?: string | null
          corrected_taxonomy_id?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          feedback_type: string
          id?: string
          original_code?: string | null
          original_taxonomy_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          corrected_code?: string | null
          corrected_taxonomy_id?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          feedback_type?: string
          id?: string
          original_code?: string | null
          original_taxonomy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_tag_feedback_corrected_taxonomy_id_fkey"
            columns: ["corrected_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_tag_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_tag_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ml_tag_feedback_original_taxonomy_id_fkey"
            columns: ["original_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_tag_suggestions: {
        Row: {
          confidence: number
          corrected_to_taxonomy_id: string | null
          created_at: string
          document_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          source: string
          status: string
          suggested_code: string
          taxonomy_id: string
        }
        Insert: {
          confidence?: number
          corrected_to_taxonomy_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          source?: string
          status?: string
          suggested_code: string
          taxonomy_id: string
        }
        Update: {
          confidence?: number
          corrected_to_taxonomy_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          source?: string
          status?: string
          suggested_code?: string
          taxonomy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_tag_suggestions_corrected_to_taxonomy_id_fkey"
            columns: ["corrected_to_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_tag_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_tag_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ml_tag_suggestions_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logic_config: {
        Row: {
          config: Json
          created_at: string | null
          event_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          event_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          event_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          event_type: string
          fallback_used: boolean | null
          id: string
          message_body: string
          message_sid: string | null
          metadata: Json | null
          recipient: string
          status: string
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          fallback_used?: boolean | null
          id?: string
          message_body: string
          message_sid?: string | null
          metadata?: Json | null
          recipient: string
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          fallback_used?: boolean | null
          id?: string
          message_body?: string
          message_sid?: string | null
          metadata?: Json | null
          recipient?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          event_label: string
          event_type: string
          id: string
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_label: string
          event_type: string
          id?: string
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_label?: string
          event_type?: string
          id?: string
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          created_at: string | null
          email_body: string | null
          email_subject: string | null
          event_type: string
          id: string
          platform_name: string
          updated_at: string | null
          variables_available: string[] | null
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          event_type: string
          id?: string
          platform_name?: string
          updated_at?: string | null
          variables_available?: string[] | null
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          event_type?: string
          id?: string
          platform_name?: string
          updated_at?: string | null
          variables_available?: string[] | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      ontology_concepts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          name_normalized: string
          properties: Json | null
          taxonomy_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          name_normalized: string
          properties?: Json | null
          taxonomy_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          name_normalized?: string
          properties?: Json | null
          taxonomy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontology_concepts_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      ontology_relations: {
        Row: {
          bidirectional: boolean | null
          created_at: string | null
          id: string
          object_id: string
          predicate: string
          subject_id: string
          weight: number | null
        }
        Insert: {
          bidirectional?: boolean | null
          created_at?: string | null
          id?: string
          object_id: string
          predicate: string
          subject_id: string
          weight?: number | null
        }
        Update: {
          bidirectional?: boolean | null
          created_at?: string | null
          id?: string
          object_id?: string
          predicate?: string
          subject_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ontology_relations_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "ontology_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontology_relations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "ontology_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      pac_pmc_mapping: {
        Row: {
          conversion_factor: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          pac_indicator_code: string
          pac_indicator_name: string
          pmc_indicator_code: string
          pmc_indicator_name: string
          updated_at: string | null
        }
        Insert: {
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          pac_indicator_code: string
          pac_indicator_name: string
          pmc_indicator_code: string
          pmc_indicator_name: string
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          pac_indicator_code?: string
          pac_indicator_name?: string
          pmc_indicator_code?: string
          pmc_indicator_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pac_valores_estimados: {
        Row: {
          base_year_used: number | null
          calculation_method: string | null
          created_at: string | null
          growth_rate_applied: number | null
          id: string
          is_extrapolated: boolean | null
          pac_indicator_code: string
          pac_indicator_id: string | null
          reference_date: string
          reference_year: number
          uf_code: number
          updated_at: string | null
          valor_estimado: number
          valor_original: number | null
        }
        Insert: {
          base_year_used?: number | null
          calculation_method?: string | null
          created_at?: string | null
          growth_rate_applied?: number | null
          id?: string
          is_extrapolated?: boolean | null
          pac_indicator_code: string
          pac_indicator_id?: string | null
          reference_date: string
          reference_year: number
          uf_code: number
          updated_at?: string | null
          valor_estimado: number
          valor_original?: number | null
        }
        Update: {
          base_year_used?: number | null
          calculation_method?: string | null
          created_at?: string | null
          growth_rate_applied?: number | null
          id?: string
          is_extrapolated?: boolean | null
          pac_indicator_code?: string
          pac_indicator_id?: string | null
          reference_date?: string
          reference_year?: number
          uf_code?: number
          updated_at?: string | null
          valor_estimado?: number
          valor_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pac_valores_estimados_pac_indicator_id_fkey"
            columns: ["pac_indicator_id"]
            isOneToOne: false
            referencedRelation: "economic_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      password_recovery_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          is_used: boolean | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      pmc_valores_reais: {
        Row: {
          calculation_method: string | null
          created_at: string | null
          id: string
          indice_pmc_original: number
          ipca_deflator: number | null
          pac_receita_anual: number | null
          pac_receita_mensal_media: number | null
          pac_year_extrapolated: boolean | null
          pac_year_used: number | null
          pmc_indicator_code: string
          pmc_indicator_id: string | null
          reference_date: string
          reference_month: number | null
          reference_year: number | null
          uf_code: number | null
          updated_at: string | null
          valor_deflacionado_reais: number | null
          valor_estimado_reais: number | null
        }
        Insert: {
          calculation_method?: string | null
          created_at?: string | null
          id?: string
          indice_pmc_original: number
          ipca_deflator?: number | null
          pac_receita_anual?: number | null
          pac_receita_mensal_media?: number | null
          pac_year_extrapolated?: boolean | null
          pac_year_used?: number | null
          pmc_indicator_code: string
          pmc_indicator_id?: string | null
          reference_date: string
          reference_month?: number | null
          reference_year?: number | null
          uf_code?: number | null
          updated_at?: string | null
          valor_deflacionado_reais?: number | null
          valor_estimado_reais?: number | null
        }
        Update: {
          calculation_method?: string | null
          created_at?: string | null
          id?: string
          indice_pmc_original?: number
          ipca_deflator?: number | null
          pac_receita_anual?: number | null
          pac_receita_mensal_media?: number | null
          pac_year_extrapolated?: boolean | null
          pac_year_used?: number | null
          pmc_indicator_code?: string
          pmc_indicator_id?: string | null
          reference_date?: string
          reference_month?: number | null
          reference_year?: number | null
          uf_code?: number | null
          updated_at?: string | null
          valor_deflacionado_reais?: number | null
          valor_estimado_reais?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pmc_valores_reais_pmc_indicator_id_fkey"
            columns: ["pmc_indicator_id"]
            isOneToOne: false
            referencedRelation: "economic_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_contents: {
        Row: {
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          is_active: boolean | null
          spotify_episode_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          spotify_episode_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          spotify_episode_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          institution_study: string | null
          institution_work: string | null
          last_browser: string | null
          last_device_fingerprint: string | null
          last_ip_address: unknown
          last_language: string | null
          last_login_at: string | null
          last_name: string | null
          last_os: string | null
          last_screen_resolution: string | null
          last_timezone: string | null
          phone: string | null
          registration_browser: string | null
          registration_device_fingerprint: string | null
          registration_ip_address: unknown
          registration_location: Json | null
          registration_os: string | null
          updated_at: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          institution_study?: string | null
          institution_work?: string | null
          last_browser?: string | null
          last_device_fingerprint?: string | null
          last_ip_address?: unknown
          last_language?: string | null
          last_login_at?: string | null
          last_name?: string | null
          last_os?: string | null
          last_screen_resolution?: string | null
          last_timezone?: string | null
          phone?: string | null
          registration_browser?: string | null
          registration_device_fingerprint?: string | null
          registration_ip_address?: unknown
          registration_location?: Json | null
          registration_os?: string | null
          updated_at?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          last_browser?: string | null
          last_device_fingerprint?: string | null
          last_ip_address?: unknown
          last_language?: string | null
          last_login_at?: string | null
          last_name?: string | null
          last_os?: string | null
          last_screen_resolution?: string | null
          last_timezone?: string | null
          phone?: string | null
          registration_browser?: string | null
          registration_device_fingerprint?: string | null
          registration_ip_address?: unknown
          registration_location?: Json | null
          registration_os?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pwa_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pwa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_sessions: {
        Row: {
          created_at: string | null
          device_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_interaction: string | null
          pwa_access: string[] | null
          token: string | null
          total_messages: number | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_interaction?: string | null
          pwa_access?: string[] | null
          token?: string | null
          total_messages?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_interaction?: string | null
          pwa_access?: string[] | null
          token?: string | null
          total_messages?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_user_devices: {
        Row: {
          created_at: string | null
          device_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_registrations"
            referencedColumns: ["id"]
          },
        ]
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
      reclassification_jobs: {
        Row: {
          auto_approve_threshold: number
          auto_approved_count: number | null
          batch_size: number
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_batch: number | null
          error_count: number | null
          errors: Json | null
          filter: string
          id: string
          pending_review_count: number | null
          processed_documents: number | null
          started_at: string | null
          status: string
          total_documents: number | null
          updated_at: string | null
        }
        Insert: {
          auto_approve_threshold?: number
          auto_approved_count?: number | null
          batch_size?: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_batch?: number | null
          error_count?: number | null
          errors?: Json | null
          filter?: string
          id?: string
          pending_review_count?: number | null
          processed_documents?: number | null
          started_at?: string | null
          status?: string
          total_documents?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_approve_threshold?: number
          auto_approved_count?: number | null
          batch_size?: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_batch?: number | null
          error_count?: number | null
          errors?: Json | null
          filter?: string
          id?: string
          pending_review_count?: number | null
          processed_documents?: number | null
          started_at?: string | null
          status?: string
          total_documents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regional_tone_rules: {
        Row: {
          affirmations: string[] | null
          avoided_terms: string[] | null
          created_at: string | null
          expressions: string[] | null
          formality_level: number | null
          greetings: string[] | null
          id: string
          is_active: boolean
          preferred_terms: Json | null
          region_code: string
          region_name: string
          speech_rate: number | null
          tone_rules: string
          updated_at: string | null
          voice_style: string | null
          warmth_level: number | null
        }
        Insert: {
          affirmations?: string[] | null
          avoided_terms?: string[] | null
          created_at?: string | null
          expressions?: string[] | null
          formality_level?: number | null
          greetings?: string[] | null
          id?: string
          is_active?: boolean
          preferred_terms?: Json | null
          region_code: string
          region_name: string
          speech_rate?: number | null
          tone_rules: string
          updated_at?: string | null
          voice_style?: string | null
          warmth_level?: number | null
        }
        Update: {
          affirmations?: string[] | null
          avoided_terms?: string[] | null
          created_at?: string | null
          expressions?: string[] | null
          formality_level?: number | null
          greetings?: string[] | null
          id?: string
          is_active?: boolean
          preferred_terms?: Json | null
          region_code?: string
          region_name?: string
          speech_rate?: number | null
          tone_rules?: string
          updated_at?: string | null
          voice_style?: string | null
          warmth_level?: number | null
        }
        Relationships: []
      }
      reply_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
          variables_used: string[] | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          variables_used?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          variables_used?: string[] | null
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
      section_content_versions: {
        Row: {
          change_description: string | null
          content: string
          created_at: string | null
          created_by: string | null
          header: string | null
          id: string
          section_id: string
          title: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          header?: string | null
          id?: string
          section_id: string
          title: string
          version_number?: number
        }
        Update: {
          change_description?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          header?: string | null
          id?: string
          section_id?: string
          title?: string
          version_number?: number
        }
        Relationships: []
      }
      section_contents: {
        Row: {
          content: string
          created_at: string | null
          header: string | null
          id: string
          section_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          header?: string | null
          id?: string
          section_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          header?: string | null
          id?: string
          section_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_alert_config: {
        Row: {
          created_at: string | null
          current_level: string
          id: string
          template_critical: string
          template_secure: string
          template_warning: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: string
          id?: string
          template_critical?: string
          template_secure?: string
          template_warning?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: string
          id?: string
          template_critical?: string
          template_secure?: string
          template_warning?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action_taken: string | null
          ban_applied: boolean | null
          browser_name: string | null
          browser_version: string | null
          canvas_fingerprint: string | null
          created_at: string | null
          device_fingerprint: string | null
          device_memory: number | null
          email_sent: boolean | null
          email_sent_to: string | null
          geo_city: string | null
          geo_country: string | null
          geo_isp: string | null
          geo_lat: number | null
          geo_lon: number | null
          geo_org: string | null
          geo_region: string | null
          geo_timezone: string | null
          hardware_concurrency: number | null
          id: string
          incident_type: string
          ip_address: unknown
          language: string | null
          occurred_at: string | null
          os_name: string | null
          os_version: string | null
          page_url: string | null
          platform: string | null
          screen_resolution: string | null
          severity: string
          timezone: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          violation_details: Json | null
          was_whitelisted: boolean | null
          webgl_fingerprint: string | null
          whatsapp_sent: boolean | null
          whatsapp_sent_to: string | null
        }
        Insert: {
          action_taken?: string | null
          ban_applied?: boolean | null
          browser_name?: string | null
          browser_version?: string | null
          canvas_fingerprint?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_memory?: number | null
          email_sent?: boolean | null
          email_sent_to?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_isp?: string | null
          geo_lat?: number | null
          geo_lon?: number | null
          geo_org?: string | null
          geo_region?: string | null
          geo_timezone?: string | null
          hardware_concurrency?: number | null
          id?: string
          incident_type: string
          ip_address?: unknown
          language?: string | null
          occurred_at?: string | null
          os_name?: string | null
          os_version?: string | null
          page_url?: string | null
          platform?: string | null
          screen_resolution?: string | null
          severity?: string
          timezone?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_details?: Json | null
          was_whitelisted?: boolean | null
          webgl_fingerprint?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_to?: string | null
        }
        Update: {
          action_taken?: string | null
          ban_applied?: boolean | null
          browser_name?: string | null
          browser_version?: string | null
          canvas_fingerprint?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_memory?: number | null
          email_sent?: boolean | null
          email_sent_to?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_isp?: string | null
          geo_lat?: number | null
          geo_lon?: number | null
          geo_org?: string | null
          geo_region?: string | null
          geo_timezone?: string | null
          hardware_concurrency?: number | null
          id?: string
          incident_type?: string
          ip_address?: unknown
          language?: string | null
          occurred_at?: string | null
          os_name?: string | null
          os_version?: string | null
          page_url?: string | null
          platform?: string | null
          screen_resolution?: string | null
          severity?: string
          timezone?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_details?: Json | null
          was_whitelisted?: boolean | null
          webgl_fingerprint?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_to?: string | null
        }
        Relationships: []
      }
      security_scan_results: {
        Row: {
          alert_sent: boolean | null
          created_at: string | null
          detailed_report: Json
          execution_duration_ms: number | null
          findings_summary: Json
          id: string
          overall_status: string
          scan_timestamp: string
          scanner_type: string
          triggered_by: string
        }
        Insert: {
          alert_sent?: boolean | null
          created_at?: string | null
          detailed_report?: Json
          execution_duration_ms?: number | null
          findings_summary?: Json
          id?: string
          overall_status?: string
          scan_timestamp?: string
          scanner_type?: string
          triggered_by?: string
        }
        Update: {
          alert_sent?: boolean | null
          created_at?: string | null
          detailed_report?: Json
          execution_duration_ms?: number | null
          findings_summary?: Json
          id?: string
          overall_status?: string
          scan_timestamp?: string
          scanner_type?: string
          triggered_by?: string
        }
        Relationships: []
      }
      security_severity_history: {
        Row: {
          change_reason: string | null
          changed_by_email: string | null
          changed_by_user_id: string | null
          created_at: string | null
          id: string
          new_level: string
          previous_level: string
        }
        Insert: {
          change_reason?: string | null
          changed_by_email?: string | null
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          new_level: string
          previous_level: string
        }
        Update: {
          change_reason?: string | null
          changed_by_email?: string | null
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          new_level?: string
          previous_level?: string
        }
        Relationships: []
      }
      security_shield_config: {
        Row: {
          auto_ban_on_violation: boolean
          ban_duration_hours: number | null
          block_message: string | null
          console_clear_enabled: boolean
          console_clear_interval_ms: number
          console_warning_body: string | null
          console_warning_subtitle: string | null
          console_warning_title: string | null
          created_at: string | null
          devtools_detection_enabled: boolean
          first_warning_message: string | null
          id: string
          iframe_detection_enabled: boolean
          keyboard_shortcuts_block_enabled: boolean
          max_violation_attempts: number
          monitoring_interval_ms: number
          react_devtools_detection_enabled: boolean
          right_click_block_enabled: boolean
          shield_enabled: boolean
          show_violation_popup: boolean
          text_selection_block_enabled: boolean
          updated_at: string | null
          whitelisted_domains: string[]
        }
        Insert: {
          auto_ban_on_violation?: boolean
          ban_duration_hours?: number | null
          block_message?: string | null
          console_clear_enabled?: boolean
          console_clear_interval_ms?: number
          console_warning_body?: string | null
          console_warning_subtitle?: string | null
          console_warning_title?: string | null
          created_at?: string | null
          devtools_detection_enabled?: boolean
          first_warning_message?: string | null
          id?: string
          iframe_detection_enabled?: boolean
          keyboard_shortcuts_block_enabled?: boolean
          max_violation_attempts?: number
          monitoring_interval_ms?: number
          react_devtools_detection_enabled?: boolean
          right_click_block_enabled?: boolean
          shield_enabled?: boolean
          show_violation_popup?: boolean
          text_selection_block_enabled?: boolean
          updated_at?: string | null
          whitelisted_domains?: string[]
        }
        Update: {
          auto_ban_on_violation?: boolean
          ban_duration_hours?: number | null
          block_message?: string | null
          console_clear_enabled?: boolean
          console_clear_interval_ms?: number
          console_warning_body?: string | null
          console_warning_subtitle?: string | null
          console_warning_title?: string | null
          created_at?: string | null
          devtools_detection_enabled?: boolean
          first_warning_message?: string | null
          id?: string
          iframe_detection_enabled?: boolean
          keyboard_shortcuts_block_enabled?: boolean
          max_violation_attempts?: number
          monitoring_interval_ms?: number
          react_devtools_detection_enabled?: boolean
          right_click_block_enabled?: boolean
          shield_enabled?: boolean
          show_violation_popup?: boolean
          text_selection_block_enabled?: boolean
          updated_at?: string | null
          whitelisted_domains?: string[]
        }
        Relationships: []
      }
      security_violations: {
        Row: {
          action_taken: string
          created_at: string | null
          device_fingerprint: string
          id: string
          ip_address: unknown
          severity: string | null
          user_email: string | null
          user_id: string | null
          violation_details: Json | null
          violation_type: string
        }
        Insert: {
          action_taken?: string
          created_at?: string | null
          device_fingerprint: string
          id?: string
          ip_address?: unknown
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_details?: Json | null
          violation_type: string
        }
        Update: {
          action_taken?: string
          created_at?: string | null
          device_fingerprint?: string
          id?: string
          ip_address?: unknown
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_details?: Json | null
          violation_type?: string
        }
        Relationships: []
      }
      security_whitelist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          device_fingerprint: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      speech_humanization: {
        Row: {
          action_type: string
          context: string | null
          created_at: string | null
          duration_ms: number | null
          emphasis_level: number | null
          id: string
          is_active: boolean | null
          priority: number | null
          speed_multiplier: number | null
          ssml_tag: string | null
          trigger_pattern: string
          trigger_type: string | null
        }
        Insert: {
          action_type: string
          context?: string | null
          created_at?: string | null
          duration_ms?: number | null
          emphasis_level?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          speed_multiplier?: number | null
          ssml_tag?: string | null
          trigger_pattern: string
          trigger_type?: string | null
        }
        Update: {
          action_type?: string
          context?: string | null
          created_at?: string | null
          duration_ms?: number | null
          emphasis_level?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          speed_multiplier?: number | null
          ssml_tag?: string | null
          trigger_pattern?: string
          trigger_type?: string | null
        }
        Relationships: []
      }
      suggestion_audit: {
        Row: {
          admin_feedback: string | null
          ai_response_preview: string | null
          chat_type: string
          coherence_score: number | null
          coherence_validated: boolean | null
          created_at: string | null
          has_rag_context: boolean | null
          id: string
          rag_documents_used: string[] | null
          session_id: string
          suggestions_generated: string[] | null
          user_query: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          admin_feedback?: string | null
          ai_response_preview?: string | null
          chat_type: string
          coherence_score?: number | null
          coherence_validated?: boolean | null
          created_at?: string | null
          has_rag_context?: boolean | null
          id?: string
          rag_documents_used?: string[] | null
          session_id: string
          suggestions_generated?: string[] | null
          user_query: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          admin_feedback?: string | null
          ai_response_preview?: string | null
          chat_type?: string
          coherence_score?: number | null
          coherence_validated?: boolean | null
          created_at?: string | null
          has_rag_context?: boolean | null
          id?: string
          rag_documents_used?: string[] | null
          session_id?: string
          suggestions_generated?: string[] | null
          user_query?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      suggestion_clicks: {
        Row: {
          chat_type: string
          clicked_at: string | null
          document_id: string | null
          id: string
          suggestion_text: string
        }
        Insert: {
          chat_type: string
          clicked_at?: string | null
          document_id?: string | null
          id?: string
          suggestion_text: string
        }
        Update: {
          chat_type?: string
          clicked_at?: string | null
          document_id?: string | null
          id?: string
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_clicks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_clicks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
          },
        ]
      }
      system_api_registry: {
        Row: {
          auto_fetch_enabled: boolean | null
          auto_fetch_interval: string | null
          base_url: string
          created_at: string | null
          description: string | null
          discovered_period_end: string | null
          discovered_period_start: string | null
          fetch_end_date: string | null
          fetch_start_date: string | null
          id: string
          last_checked_at: string | null
          last_http_status: number | null
          last_latency_ms: number | null
          last_raw_response: Json | null
          last_response_at: string | null
          last_sync_metadata: Json | null
          method: string | null
          name: string
          period_discovery_date: string | null
          provider: string
          redundant_aggregate_id: string | null
          redundant_api_url: string | null
          source_data_message: string | null
          source_data_status: string | null
          status: string | null
          target_table: string | null
          updated_at: string | null
        }
        Insert: {
          auto_fetch_enabled?: boolean | null
          auto_fetch_interval?: string | null
          base_url: string
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          fetch_end_date?: string | null
          fetch_start_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_http_status?: number | null
          last_latency_ms?: number | null
          last_raw_response?: Json | null
          last_response_at?: string | null
          last_sync_metadata?: Json | null
          method?: string | null
          name: string
          period_discovery_date?: string | null
          provider?: string
          redundant_aggregate_id?: string | null
          redundant_api_url?: string | null
          source_data_message?: string | null
          source_data_status?: string | null
          status?: string | null
          target_table?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_fetch_enabled?: boolean | null
          auto_fetch_interval?: string | null
          base_url?: string
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          fetch_end_date?: string | null
          fetch_start_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_http_status?: number | null
          last_latency_ms?: number | null
          last_raw_response?: Json | null
          last_response_at?: string | null
          last_sync_metadata?: Json | null
          method?: string | null
          name?: string
          period_discovery_date?: string | null
          provider?: string
          redundant_aggregate_id?: string | null
          redundant_api_url?: string | null
          source_data_message?: string | null
          source_data_status?: string | null
          status?: string | null
          target_table?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_increments: {
        Row: {
          details: Json | null
          id: string
          operation_source: string
          operation_type: string
          summary: string
          tables_affected: string[]
          timestamp: string
          triggered_by_email: string
          triggered_by_user_id: string | null
        }
        Insert: {
          details?: Json | null
          id?: string
          operation_source: string
          operation_type: string
          summary: string
          tables_affected: string[]
          timestamp?: string
          triggered_by_email: string
          triggered_by_user_id?: string | null
        }
        Update: {
          details?: Json | null
          id?: string
          operation_source?: string
          operation_type?: string
          summary?: string
          tables_affected?: string[]
          timestamp?: string
          triggered_by_email?: string
          triggered_by_user_id?: string | null
        }
        Relationships: []
      }
      system_versions: {
        Row: {
          change_log: string | null
          created_at: string | null
          id: string
          major: number
          minor: number
          patch: number
          semver: string
          trigger_source: string | null
        }
        Insert: {
          change_log?: string | null
          created_at?: string | null
          id?: string
          major?: number
          minor?: number
          patch?: number
          semver?: string
          trigger_source?: string | null
        }
        Update: {
          change_log?: string | null
          created_at?: string | null
          id?: string
          major?: number
          minor?: number
          patch?: number
          semver?: string
          trigger_source?: string | null
        }
        Relationships: []
      }
      tag_management_events: {
        Row: {
          action_type: string
          created_at: string | null
          created_by: string | null
          id: string
          input_state: Json
          rationale: string | null
          session_id: string | null
          similarity_score: number | null
          time_to_decision_ms: number | null
          user_decision: Json
        }
        Insert: {
          action_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_state: Json
          rationale?: string | null
          session_id?: string | null
          similarity_score?: number | null
          time_to_decision_ms?: number | null
          user_decision: Json
        }
        Update: {
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_state?: Json
          rationale?: string | null
          session_id?: string | null
          similarity_score?: number | null
          time_to_decision_ms?: number | null
          user_decision?: Json
        }
        Relationships: []
      }
      tag_merge_rules: {
        Row: {
          canonical_tag: string
          chat_type: string
          created_at: string
          created_by: string | null
          id: string
          merge_count: number | null
          source_tag: string
        }
        Insert: {
          canonical_tag: string
          chat_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          merge_count?: number | null
          source_tag: string
        }
        Update: {
          canonical_tag?: string
          chat_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          merge_count?: number | null
          source_tag?: string
        }
        Relationships: []
      }
      tag_modification_logs: {
        Row: {
          chat_type: string | null
          created_at: string
          created_by: string | null
          document_filename: string
          document_id: string | null
          id: string
          merge_rule_id: string | null
          modification_type: string
          new_tag_name: string
          original_tag_name: string
        }
        Insert: {
          chat_type?: string | null
          created_at?: string
          created_by?: string | null
          document_filename: string
          document_id?: string | null
          id?: string
          merge_rule_id?: string | null
          modification_type?: string
          new_tag_name: string
          original_tag_name: string
        }
        Update: {
          chat_type?: string | null
          created_at?: string
          created_by?: string | null
          document_filename?: string
          document_id?: string | null
          id?: string
          merge_rule_id?: string | null
          modification_type?: string
          new_tag_name?: string
          original_tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_modification_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_modification_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_taxonomies"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "tag_modification_logs_merge_rule_id_fkey"
            columns: ["merge_rule_id"]
            isOneToOne: false
            referencedRelation: "tag_merge_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_metrics_daily: {
        Row: {
          active_taxonomies: number | null
          auto_classified: number | null
          avg_confidence: number | null
          classifications_ai_suggested: number | null
          classifications_auto: number | null
          classifications_manual: number | null
          coverage_percentage: number | null
          created_at: string | null
          documents_with_taxonomy: number | null
          documents_without_taxonomy: number | null
          id: string
          metric_date: string
          new_taxonomies_created: number | null
          onboarded_documents: number | null
          orphan_taxonomies: number | null
          pending_review: number | null
          suggestions_approved: number | null
          suggestions_pending: number | null
          suggestions_rejected: number | null
          total_documents: number | null
          total_taxonomies: number | null
        }
        Insert: {
          active_taxonomies?: number | null
          auto_classified?: number | null
          avg_confidence?: number | null
          classifications_ai_suggested?: number | null
          classifications_auto?: number | null
          classifications_manual?: number | null
          coverage_percentage?: number | null
          created_at?: string | null
          documents_with_taxonomy?: number | null
          documents_without_taxonomy?: number | null
          id?: string
          metric_date: string
          new_taxonomies_created?: number | null
          onboarded_documents?: number | null
          orphan_taxonomies?: number | null
          pending_review?: number | null
          suggestions_approved?: number | null
          suggestions_pending?: number | null
          suggestions_rejected?: number | null
          total_documents?: number | null
          total_taxonomies?: number | null
        }
        Update: {
          active_taxonomies?: number | null
          auto_classified?: number | null
          avg_confidence?: number | null
          classifications_ai_suggested?: number | null
          classifications_auto?: number | null
          classifications_manual?: number | null
          coverage_percentage?: number | null
          created_at?: string | null
          documents_with_taxonomy?: number | null
          documents_without_taxonomy?: number | null
          id?: string
          metric_date?: string
          new_taxonomies_created?: number | null
          onboarded_documents?: number | null
          orphan_taxonomies?: number | null
          pending_review?: number | null
          suggestions_approved?: number | null
          suggestions_pending?: number | null
          suggestions_rejected?: number | null
          total_documents?: number | null
          total_taxonomies?: number | null
        }
        Relationships: []
      }
      taxonomy_suggestions: {
        Row: {
          based_on_documents: string[] | null
          based_on_keywords: string[] | null
          confidence: number | null
          created_at: string | null
          created_taxonomy_id: string | null
          id: string
          occurrence_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          sample_contexts: string[] | null
          source: string | null
          status: string | null
          suggested_code: string
          suggested_color: string | null
          suggested_description: string | null
          suggested_icon: string | null
          suggested_keywords: string[] | null
          suggested_name: string
          suggested_parent_code: string | null
          suggested_parent_id: string | null
          suggested_synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          based_on_documents?: string[] | null
          based_on_keywords?: string[] | null
          confidence?: number | null
          created_at?: string | null
          created_taxonomy_id?: string | null
          id?: string
          occurrence_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          sample_contexts?: string[] | null
          source?: string | null
          status?: string | null
          suggested_code: string
          suggested_color?: string | null
          suggested_description?: string | null
          suggested_icon?: string | null
          suggested_keywords?: string[] | null
          suggested_name: string
          suggested_parent_code?: string | null
          suggested_parent_id?: string | null
          suggested_synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          based_on_documents?: string[] | null
          based_on_keywords?: string[] | null
          confidence?: number | null
          created_at?: string | null
          created_taxonomy_id?: string | null
          id?: string
          occurrence_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          sample_contexts?: string[] | null
          source?: string | null
          status?: string | null
          suggested_code?: string
          suggested_color?: string | null
          suggested_description?: string | null
          suggested_icon?: string | null
          suggested_keywords?: string[] | null
          suggested_name?: string
          suggested_parent_code?: string | null
          suggested_parent_id?: string | null
          suggested_synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_suggestions_created_taxonomy_id_fkey"
            columns: ["created_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_suggestions_suggested_parent_id_fkey"
            columns: ["suggested_parent_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      tooltip_contents: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          display_order: number | null
          header: string | null
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
          display_order?: number | null
          header?: string | null
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
          display_order?: number | null
          header?: string | null
          id?: string
          is_active?: boolean | null
          section_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      typing_latency_logs: {
        Row: {
          avg_latency_ms: number | null
          component: string
          created_at: string
          id: string
          latency_ms: number
          max_latency_ms: number | null
          sample_count: number | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          avg_latency_ms?: number | null
          component: string
          created_at?: string
          id?: string
          latency_ms: number
          max_latency_ms?: number | null
          sample_count?: number | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          avg_latency_ms?: number | null
          component?: string
          created_at?: string
          id?: string
          latency_ms?: number
          max_latency_ms?: number | null
          sample_count?: number | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          action_category: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          action_category: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          action_category?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      user_chat_preferences: {
        Row: {
          avg_message_length: number | null
          chat_type: string
          created_at: string | null
          detected_intent: string | null
          id: string
          intent_confirmed: boolean | null
          response_style: string | null
          response_style_confidence: number | null
          session_id: string
          topics_discussed: string[] | null
          total_interactions: number | null
          updated_at: string | null
        }
        Insert: {
          avg_message_length?: number | null
          chat_type: string
          created_at?: string | null
          detected_intent?: string | null
          id?: string
          intent_confirmed?: boolean | null
          response_style?: string | null
          response_style_confidence?: number | null
          session_id: string
          topics_discussed?: string[] | null
          total_interactions?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_message_length?: number | null
          chat_type?: string
          created_at?: string | null
          detected_intent?: string | null
          id?: string
          intent_confirmed?: boolean | null
          response_style?: string | null
          response_style_confidence?: number | null
          session_id?: string
          topics_discussed?: string[] | null
          total_interactions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_contacts: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          type: string
          updated_at: string | null
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          type: string
          updated_at?: string | null
          user_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          type?: string
          updated_at?: string | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          completed_at: string | null
          created_at: string | null
          email: string
          email_opened_at: string | null
          email_sent_at: string | null
          expires_at: string
          form_started_at: string | null
          id: string
          invited_by: string | null
          last_resend_at: string | null
          link_opened_at: string | null
          name: string
          phone: string | null
          pwa_access: string[] | null
          resend_count: number | null
          role: Database["public"]["Enums"]["app_role"]
          send_via_email: boolean | null
          send_via_whatsapp: boolean | null
          status: string
          token: string
          updated_at: string | null
          verification_attempts: number | null
          verification_code: string | null
          verification_code_expires_at: string | null
          verification_method: string | null
          verification_sent_at: string | null
          whatsapp_opened_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          completed_at?: string | null
          created_at?: string | null
          email: string
          email_opened_at?: string | null
          email_sent_at?: string | null
          expires_at: string
          form_started_at?: string | null
          id?: string
          invited_by?: string | null
          last_resend_at?: string | null
          link_opened_at?: string | null
          name: string
          phone?: string | null
          pwa_access?: string[] | null
          resend_count?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          send_via_email?: boolean | null
          send_via_whatsapp?: boolean | null
          status?: string
          token: string
          updated_at?: string | null
          verification_attempts?: number | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verification_method?: string | null
          verification_sent_at?: string | null
          whatsapp_opened_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          completed_at?: string | null
          created_at?: string | null
          email?: string
          email_opened_at?: string | null
          email_sent_at?: string | null
          expires_at?: string
          form_started_at?: string | null
          id?: string
          invited_by?: string | null
          last_resend_at?: string | null
          link_opened_at?: string | null
          name?: string
          phone?: string | null
          pwa_access?: string[] | null
          resend_count?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          send_via_email?: boolean | null
          send_via_whatsapp?: boolean | null
          status?: string
          token?: string
          updated_at?: string | null
          verification_attempts?: number | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verification_method?: string | null
          verification_sent_at?: string | null
          whatsapp_opened_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
          whatsapp_notifications: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_notifications?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      user_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ban_reason: string | null
          ban_type: string | null
          banned_at: string | null
          banned_by: string | null
          created_at: string | null
          dns_origin: string | null
          email: string
          first_name: string
          id: string
          institution_study: string | null
          institution_work: string | null
          is_banned: boolean | null
          last_name: string
          mass_import_at: string | null
          phone: string | null
          pwa_access: string[] | null
          pwa_registered_at: string | null
          registration_source: string | null
          rejection_reason: string | null
          requested_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          unbanned_at: string | null
          unbanned_by: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ban_reason?: string | null
          ban_type?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          dns_origin?: string | null
          email: string
          first_name: string
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          is_banned?: boolean | null
          last_name: string
          mass_import_at?: string | null
          phone?: string | null
          pwa_access?: string[] | null
          pwa_registered_at?: string | null
          registration_source?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ban_reason?: string | null
          ban_type?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          dns_origin?: string | null
          email?: string
          first_name?: string
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          is_banned?: boolean | null
          last_name?: string
          mass_import_at?: string | null
          phone?: string | null
          pwa_access?: string[] | null
          pwa_registered_at?: string | null
          registration_source?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
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
      indicator_stats_summary: {
        Row: {
          indicator_id: string | null
          last_value: number | null
          max_date: string | null
          min_date: string | null
          total_count: number | null
        }
        Relationships: []
      }
      v_document_taxonomies: {
        Row: {
          confidence: number | null
          document_id: string | null
          entity_tag_id: string | null
          filename: string | null
          source: string | null
          status: string | null
          tagged_at: string | null
          target_chat: string | null
          taxonomy_code: string | null
          taxonomy_level: number | null
          taxonomy_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_batch_taxonomy: {
        Args: { p_batch: Json }
        Returns: {
          error_count: number
          errors: Json
          success_count: number
        }[]
      }
      approve_tag_suggestion:
        | { Args: { p_suggestion_id: string }; Returns: Json }
        | {
            Args: { p_reviewer_id?: string; p_suggestion_id: string }
            Returns: Json
          }
      approve_taxonomy_suggestion: {
        Args: {
          p_modify_code?: string
          p_modify_name?: string
          p_notes?: string
          p_reviewer_id?: string
          p_suggestion_id: string
        }
        Returns: string
      }
      check_all_agents_coverage: {
        Args: never
        Returns: {
          agent_name: string
          agent_slug: string
          coverage_status: string
          taxonomy_codes: string[]
          total_documents: number
        }[]
      }
      check_pwa_access: {
        Args: { p_agent_slug?: string; p_device_id: string }
        Returns: Json
      }
      collect_daily_taxonomy_metrics: {
        Args: { p_date?: string }
        Returns: undefined
      }
      convert_pmc_to_reais: {
        Args: {
          p_pmc_indicator_code: string
          p_reference_date: string
          p_uf_code: number
        }
        Returns: number
      }
      correct_tag_suggestion:
        | {
            Args: {
              p_correct_taxonomy_id: string
              p_notes?: string
              p_reviewer_id?: string
              p_suggestion_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_new_taxonomy_id: string
              p_notes?: string
              p_suggestion_id: string
            }
            Returns: Json
          }
      count_agent_accessible_documents: {
        Args: { agent_slug: string }
        Returns: {
          document_count: number
          taxonomy_code: string
          taxonomy_name: string
        }[]
      }
      count_documents_for_reclassification: {
        Args: { p_filter?: string }
        Returns: number
      }
      create_taxonomy_suggestion: {
        Args: {
          p_code: string
          p_confidence?: number
          p_description?: string
          p_keywords?: string[]
          p_name: string
          p_parent_id?: string
          p_related_docs?: string[]
          p_sample_contexts?: string[]
          p_source?: string
        }
        Returns: string
      }
      detect_context: {
        Args: { p_query: string }
        Returns: {
          confidence: number
          context_code: string
          context_name: string
          score: number
        }[]
      }
      detect_taxonomy_gaps: {
        Args: never
        Returns: {
          description: string
          document_count: number
          gap_type: string
          sample_documents: Json
          severity: string
          suggested_action: string
        }[]
      }
      extract_frequent_keywords: {
        Args: { p_limit?: number; p_min_occurrences?: number }
        Returns: {
          document_ids: string[]
          existing_taxonomy_code: string
          keyword: string
          occurrence_count: number
          sample_contexts: string[]
        }[]
      }
      extract_keywords_from_text: {
        Args: { p_limit?: number; p_text: string }
        Returns: string[]
      }
      get_agent_excluded_taxonomy_codes: {
        Args: { agent_slug: string }
        Returns: string[]
      }
      get_agent_taxonomy_codes: {
        Args: { agent_slug: string }
        Returns: string[]
      }
      get_classification_sources_stats: {
        Args: never
        Returns: {
          avg_confidence: number
          classification_count: number
          percentage: number
          source: string
        }[]
      }
      get_documents_for_reclassification: {
        Args: { p_filter: string; p_limit: number; p_offset: number }
        Returns: {
          ai_summary: string
          avg_confidence: number
          created_at: string
          current_taxonomies: Json
          document_id: string
          filename: string
          has_pending_tag: boolean
          tag_count: number
          target_chat: string
          text_preview: string
        }[]
      }
      get_learned_patterns: {
        Args: { p_keywords: string[] }
        Returns: {
          keyword: string
          occurrences: number
          pattern_type: string
          strength: number
          taxonomy_code: string
        }[]
      }
      get_ml_suggestion_stats: {
        Args: never
        Returns: {
          approval_rate: number
          approved_count: number
          avg_confidence: number
          corrected_count: number
          pending_count: number
          rejected_count: number
          total_suggestions: number
        }[]
      }
      get_onboarding_stats: {
        Args: never
        Returns: {
          auto_classified: number
          avg_confidence: number
          errors: number
          last_24h_count: number
          no_suggestions: number
          pending_documents: number
          pending_review: number
          total_onboarded: number
        }[]
      }
      get_orchestrated_context: {
        Args: { p_override_slug?: string; p_query: string }
        Returns: Json
      }
      get_schema_info: { Args: never; Returns: Json }
      get_taxonomy_analytics_report: {
        Args: { p_days?: number }
        Returns: {
          approval_rate: number
          auto_rate: number
          avg_confidence: number
          coverage_trend: number
          current_active_taxonomies: number
          current_coverage: number
          current_total_docs: number
          current_total_taxonomies: number
          current_with_taxonomy: number
          docs_low_confidence: number
          docs_trend: number
          docs_without_taxonomy: number
          pending_suggestions: number
          taxonomies_trend: number
          top_taxonomies: Json
          total_auto_classifications: number
          total_manual_classifications: number
          total_suggestions_processed: number
        }[]
      }
      get_taxonomy_coverage_stats: {
        Args: never
        Returns: {
          coverage_percentage: number
          documents_with_taxonomy: number
          documents_without_taxonomy: number
          low_confidence_count: number
          pending_classification: number
          total_documents: number
        }[]
      }
      get_taxonomy_distribution_by_domain: {
        Args: never
        Returns: {
          avg_confidence: number
          document_count: number
          domain: string
          taxonomy_count: number
        }[]
      }
      get_taxonomy_health_stats: { Args: never; Returns: Json }
      get_taxonomy_metrics_timeseries: {
        Args: { p_days?: number }
        Returns: {
          avg_confidence: number
          classifications_total: number
          coverage_percentage: number
          documents_with_taxonomy: number
          metric_date: string
          total_documents: number
        }[]
      }
      get_term_context: { Args: { p_term: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_chat_routing_rule_count: {
        Args: {
          p_corrected_chat: string
          p_filename_pattern: string
          p_suggested_chat: string
        }
        Returns: undefined
      }
      increment_merge_rule_count: {
        Args: { p_chat_type: string; p_source_tag: string }
        Returns: undefined
      }
      initialize_chat_config_stats: { Args: never; Returns: undefined }
      log_api_event: {
        Args: {
          p_action_description: string
          p_api_id: string
          p_api_name: string
          p_error_message?: string
          p_error_stack?: string
          p_event_category: string
          p_event_type: string
          p_execution_time_ms?: number
          p_http_status?: number
          p_ip_address?: unknown
          p_records_affected?: number
          p_request_payload?: Json
          p_response_payload?: Json
          p_session_id?: string
          p_severity: string
          p_user_agent?: string
          p_user_email?: string
          p_user_id?: string
          p_user_role?: string
        }
        Returns: string
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
      onboard_document_taxonomy: {
        Args: {
          p_auto_apply_threshold?: number
          p_document_id: string
          p_review_threshold?: number
        }
        Returns: {
          applied_count: number
          message: string
          pending_count: number
          status: string
        }[]
      }
      process_all_pmc_conversions: {
        Args: never
        Returns: {
          indicator_code: string
          records_converted: number
          records_processed: number
        }[]
      }
      process_all_pmc_conversions_batch: {
        Args: never
        Returns: {
          pmc_code: string
          total_converted: number
          total_processed: number
          years_covered: string
        }[]
      }
      process_pac_estimation_batch: {
        Args: never
        Returns: {
          indicator_code: string
          records_inserted: number
        }[]
      }
      process_pending_onboarding: {
        Args: { p_limit?: number }
        Returns: {
          auto_classified: number
          errors: number
          no_suggestions: number
          pending_review: number
          processed: number
        }[]
      }
      process_pmc_national_aggregation: {
        Args: never
        Returns: {
          indicator_code: string
          records_inserted: number
        }[]
      }
      register_pwa_user: {
        Args: {
          p_device_id: string
          p_email: string
          p_invitation_token: string
          p_name: string
          p_phone?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      reject_tag_suggestion: {
        Args: {
          p_notes?: string
          p_reviewer_id?: string
          p_suggestion_id: string
        }
        Returns: Json
      }
      reject_taxonomy_suggestion: {
        Args: {
          p_notes?: string
          p_reviewer_id?: string
          p_suggestion_id: string
        }
        Returns: boolean
      }
      search_by_taxonomy: {
        Args: {
          exclude_tag_codes?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
          tag_codes: string[]
        }
        Returns: {
          chunk_id: string
          content: string
          document_filename: string
          document_id: string
          metadata: Json
          search_source: string
          similarity: number
          taxonomy_code: string
        }[]
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
          document_filename: string
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
          document_filename: string
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
          document_filename: string
          document_id: string
          matched_keyword: string
          metadata: Json
          similarity: number
        }[]
      }
      verify_pwa_invitation: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "superadmin"
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
      app_role: ["admin", "user", "superadmin"],
    },
  },
} as const
