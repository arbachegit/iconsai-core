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
          updated_at?: string | null
          vimeo_history_url?: string | null
          weekly_report_enabled?: boolean | null
          whatsapp_global_enabled?: boolean | null
          whatsapp_target_phone?: string | null
        }
        Relationships: []
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
          id: string
          message_body: string
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
          id?: string
          message_body: string
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
          id?: string
          message_body?: string
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
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          institution_study: string | null
          institution_work: string | null
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          institution_study?: string | null
          institution_work?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          last_name?: string | null
          updated_at?: string | null
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
      regional_tone_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          region_code: string
          region_name: string
          tone_rules: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          region_code: string
          region_name: string
          tone_rules: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          region_code?: string
          region_name?: string
          tone_rules?: string
          updated_at?: string | null
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
            foreignKeyName: "tag_modification_logs_merge_rule_id_fkey"
            columns: ["merge_rule_id"]
            isOneToOne: false
            referencedRelation: "tag_merge_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          rule_type: string
          rule_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          rule_type: string
          rule_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          rule_type?: string
          rule_value?: string
          updated_at?: string | null
        }
        Relationships: []
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
      user_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          dns_origin: string | null
          email: string
          first_name: string
          id: string
          institution_study: string | null
          institution_work: string | null
          last_name: string
          mass_import_at: string | null
          phone: string | null
          rejection_reason: string | null
          requested_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          dns_origin?: string | null
          email: string
          first_name: string
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          last_name: string
          mass_import_at?: string | null
          phone?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          dns_origin?: string | null
          email?: string
          first_name?: string
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          last_name?: string
          mass_import_at?: string | null
          phone?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
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
