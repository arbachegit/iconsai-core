// ============================================
// ICONSAI - Supabase Types v3.0.0
// 18 tabelas + 2 views - Multi-Tenant Agents
// Gerado: 2026-02-05
// ============================================

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
      // =============================================
      // 1. INSTITUTIONS
      // =============================================
      institutions: {
        Row: {
          id: string
          name: string
          slug: string
          cnpj: string | null
          email_domains: string[]
          max_users: number
          is_active: boolean
          address_street: string | null
          address_number: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          primary_color: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          cnpj?: string | null
          email_domains?: string[]
          max_users?: number
          is_active?: boolean
          address_street?: string | null
          address_number?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          primary_color?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          cnpj?: string | null
          email_domains?: string[]
          max_users?: number
          is_active?: boolean
          address_street?: string | null
          address_number?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          primary_color?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 2. DEPARTMENTS
      // =============================================
      departments: {
        Row: {
          id: string
          institution_id: string
          name: string
          slug: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          slug: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          slug?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 3. PLATFORM_USERS
      // =============================================
      platform_users: {
        Row: {
          id: string
          auth_user_id: string | null
          first_name: string
          last_name: string | null
          email: string
          phone: string | null
          institution_id: string | null
          department_id: string | null
          role: "user" | "admin" | "superadmin"
          status: "pending" | "active" | "suspended" | "inactive"
          email_verified: boolean
          phone_verified: boolean
          verification_code: string | null
          verification_expires_at: string | null
          password_set: boolean
          last_login_at: string | null
          login_count: number
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
          invited_by: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          first_name: string
          last_name?: string | null
          email: string
          phone?: string | null
          institution_id?: string | null
          department_id?: string | null
          role?: "user" | "admin" | "superadmin"
          status?: "pending" | "active" | "suspended" | "inactive"
          email_verified?: boolean
          phone_verified?: boolean
          verification_code?: string | null
          verification_expires_at?: string | null
          password_set?: boolean
          last_login_at?: string | null
          login_count?: number
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
          invited_by?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          first_name?: string
          last_name?: string | null
          email?: string
          phone?: string | null
          institution_id?: string | null
          department_id?: string | null
          role?: "user" | "admin" | "superadmin"
          status?: "pending" | "active" | "suspended" | "inactive"
          email_verified?: boolean
          phone_verified?: boolean
          verification_code?: string | null
          verification_expires_at?: string | null
          password_set?: boolean
          last_login_at?: string | null
          login_count?: number
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_users_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 4. USER_INVITES
      // =============================================
      user_invites: {
        Row: {
          id: string
          email: string
          phone: string | null
          name: string
          first_name: string | null
          last_name: string | null
          institution_id: string | null
          department_id: string | null
          role: "user" | "admin" | "superadmin"
          has_platform_access: boolean
          has_app_access: boolean
          token: string
          verification_code: string | null
          verification_code_expires_at: string | null
          verification_attempts: number
          verification_sent_at: string | null
          status: "pending" | "sent" | "opened" | "completed" | "expired" | "cancelled"
          email_sent_at: string | null
          whatsapp_sent_at: string | null
          sms_sent_at: string | null
          email_opened_at: string | null
          whatsapp_opened_at: string | null
          link_opened_at: string | null
          form_started_at: string | null
          completed_at: string | null
          expires_at: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          email: string
          phone?: string | null
          name: string
          first_name?: string | null
          last_name?: string | null
          institution_id?: string | null
          department_id?: string | null
          role?: "user" | "admin" | "superadmin"
          has_platform_access?: boolean
          has_app_access?: boolean
          token?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verification_attempts?: number
          verification_sent_at?: string | null
          status?: "pending" | "sent" | "opened" | "completed" | "expired" | "cancelled"
          email_sent_at?: string | null
          whatsapp_sent_at?: string | null
          sms_sent_at?: string | null
          email_opened_at?: string | null
          whatsapp_opened_at?: string | null
          link_opened_at?: string | null
          form_started_at?: string | null
          completed_at?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          name?: string
          first_name?: string | null
          last_name?: string | null
          institution_id?: string | null
          department_id?: string | null
          role?: "user" | "admin" | "superadmin"
          has_platform_access?: boolean
          has_app_access?: boolean
          token?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verification_attempts?: number
          verification_sent_at?: string | null
          status?: "pending" | "sent" | "opened" | "completed" | "expired" | "cancelled"
          email_sent_at?: string | null
          whatsapp_sent_at?: string | null
          sms_sent_at?: string | null
          email_opened_at?: string | null
          whatsapp_opened_at?: string | null
          link_opened_at?: string | null
          form_started_at?: string | null
          completed_at?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 5. USER_ROLES
      // =============================================
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "user" | "admin" | "superadmin"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: "user" | "admin" | "superadmin"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: "user" | "admin" | "superadmin"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 6. ICONSAI_AGENTS
      // =============================================
      iconsai_agents: {
        Row: {
          id: string
          module_slug: string
          name: string
          description: string | null
          system_prompt: string | null
          model: string
          temperature: number
          max_tokens: number
          icon: string | null
          color: string
          avatar_url: string | null
          is_active: boolean
          is_public: boolean
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_slug: string
          name: string
          description?: string | null
          system_prompt?: string | null
          model?: string
          temperature?: number
          max_tokens?: number
          icon?: string | null
          color?: string
          avatar_url?: string | null
          is_active?: boolean
          is_public?: boolean
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module_slug?: string
          name?: string
          description?: string | null
          system_prompt?: string | null
          model?: string
          temperature?: number
          max_tokens?: number
          icon?: string | null
          color?: string
          avatar_url?: string | null
          is_active?: boolean
          is_public?: boolean
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // =============================================
      // 7. PWA_HOME_AGENTS
      // =============================================
      pwa_home_agents: {
        Row: {
          id: string
          agent_id: string
          position: number
          is_visible: boolean
          is_featured: boolean
          institution_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          position?: number
          is_visible?: boolean
          is_featured?: boolean
          institution_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          position?: number
          is_visible?: boolean
          is_featured?: boolean
          institution_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pwa_home_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "iconsai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_home_agents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 8. PWA_SESSIONS
      // =============================================
      pwa_sessions: {
        Row: {
          id: string
          user_id: string | null
          platform_user_id: string | null
          device_id: string | null
          session_token: string | null
          institution_id: string | null
          agent_id: string | null
          is_active: boolean
          started_at: string
          ended_at: string | null
          last_activity_at: string
          user_agent: string | null
          ip_address: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          user_id?: string | null
          platform_user_id?: string | null
          device_id?: string | null
          session_token?: string | null
          institution_id?: string | null
          agent_id?: string | null
          is_active?: boolean
          started_at?: string
          ended_at?: string | null
          last_activity_at?: string
          user_agent?: string | null
          ip_address?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string | null
          platform_user_id?: string | null
          device_id?: string | null
          session_token?: string | null
          institution_id?: string | null
          agent_id?: string | null
          is_active?: boolean
          started_at?: string
          ended_at?: string | null
          last_activity_at?: string
          user_agent?: string | null
          ip_address?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pwa_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_sessions_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "iconsai_agents"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 9. PWA_CONVERSATIONS
      // =============================================
      pwa_conversations: {
        Row: {
          id: string
          session_id: string | null
          user_id: string | null
          platform_user_id: string | null
          institution_id: string | null
          agent_id: string | null
          module_slug: string | null
          user_message: string | null
          user_audio_url: string | null
          user_audio_duration: number | null
          ai_response: string | null
          ai_audio_url: string | null
          ai_audio_duration: number | null
          keywords: string[]
          sentiment: "positive" | "negative" | "neutral" | null
          intent: string | null
          response_time_ms: number | null
          tokens_used: number | null
          created_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          platform_user_id?: string | null
          institution_id?: string | null
          agent_id?: string | null
          module_slug?: string | null
          user_message?: string | null
          user_audio_url?: string | null
          user_audio_duration?: number | null
          ai_response?: string | null
          ai_audio_url?: string | null
          ai_audio_duration?: number | null
          keywords?: string[]
          sentiment?: "positive" | "negative" | "neutral" | null
          intent?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          created_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          platform_user_id?: string | null
          institution_id?: string | null
          agent_id?: string | null
          module_slug?: string | null
          user_message?: string | null
          user_audio_url?: string | null
          user_audio_duration?: number | null
          ai_response?: string | null
          ai_audio_url?: string | null
          ai_audio_duration?: number | null
          keywords?: string[]
          sentiment?: "positive" | "negative" | "neutral" | null
          intent?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          created_at?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pwa_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pwa_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_conversations_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "iconsai_agents"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 10. PWA_USER_ACTIVITY
      // =============================================
      pwa_user_activity: {
        Row: {
          id: string
          user_id: string | null
          platform_user_id: string | null
          session_id: string | null
          action_type: string
          action_data: Json
          page_url: string | null
          module_slug: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          platform_user_id?: string | null
          session_id?: string | null
          action_type: string
          action_data?: Json
          page_url?: string | null
          module_slug?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          platform_user_id?: string | null
          session_id?: string | null
          action_type?: string
          action_data?: Json
          page_url?: string | null
          module_slug?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pwa_user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_user_activity_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_user_activity_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pwa_sessions"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 11. VOICE_FREQUENCY_ANALYSIS
      // =============================================
      voice_frequency_analysis: {
        Row: {
          id: string
          conversation_id: string
          f0_samples: number[]
          f0_timestamps: number[]
          f0_mean: number | null
          f0_min: number | null
          f0_max: number | null
          f0_range_hz: number | null
          f0_range_semitones: number | null
          f0_std_deviation: number | null
          contour_type: "ascending" | "descending" | "flat" | "varied" | "peak" | "valley" | null
          contour_points: Json
          emotion: "neutral" | "happy" | "sad" | "angry" | "fearful" | "surprised" | "bored" | null
          emotion_confidence: number | null
          emotion_secondary: string | null
          audio_quality_score: number | null
          noise_level: number | null
          speech_rate_wpm: number | null
          pause_count: number | null
          avg_pause_duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          f0_samples?: number[]
          f0_timestamps?: number[]
          f0_mean?: number | null
          f0_min?: number | null
          f0_max?: number | null
          f0_range_hz?: number | null
          f0_range_semitones?: number | null
          f0_std_deviation?: number | null
          contour_type?: "ascending" | "descending" | "flat" | "varied" | "peak" | "valley" | null
          contour_points?: Json
          emotion?: "neutral" | "happy" | "sad" | "angry" | "fearful" | "surprised" | "bored" | null
          emotion_confidence?: number | null
          emotion_secondary?: string | null
          audio_quality_score?: number | null
          noise_level?: number | null
          speech_rate_wpm?: number | null
          pause_count?: number | null
          avg_pause_duration?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          f0_samples?: number[]
          f0_timestamps?: number[]
          f0_mean?: number | null
          f0_min?: number | null
          f0_max?: number | null
          f0_range_hz?: number | null
          f0_range_semitones?: number | null
          f0_std_deviation?: number | null
          contour_type?: "ascending" | "descending" | "flat" | "varied" | "peak" | "valley" | null
          contour_points?: Json
          emotion?: "neutral" | "happy" | "sad" | "angry" | "fearful" | "surprised" | "bored" | null
          emotion_confidence?: number | null
          emotion_secondary?: string | null
          audio_quality_score?: number | null
          noise_level?: number | null
          speech_rate_wpm?: number | null
          pause_count?: number | null
          avg_pause_duration?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_frequency_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pwa_conversations"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 12. USER_VOICE_BASELINE
      // =============================================
      user_voice_baseline: {
        Row: {
          id: string
          user_id: string
          platform_user_id: string | null
          f0_baseline_mean: number | null
          f0_baseline_min: number | null
          f0_baseline_max: number | null
          f0_baseline_std: number | null
          sample_count: number
          last_sample_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform_user_id?: string | null
          f0_baseline_mean?: number | null
          f0_baseline_min?: number | null
          f0_baseline_max?: number | null
          f0_baseline_std?: number | null
          sample_count?: number
          last_sample_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform_user_id?: string | null
          f0_baseline_mean?: number | null
          f0_baseline_min?: number | null
          f0_baseline_max?: number | null
          f0_baseline_std?: number | null
          sample_count?: number
          last_sample_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_voice_baseline_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_voice_baseline_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // Tabelas auxiliares existentes (voice config)
      // =============================================
      pwa_agent_voice_config: {
        Row: {
          id: string
          module_id: string
          voice_model: string
          language: string
          speed: number
          pitch: number
          stability: number
          similarity_boost: number
          style: number
          use_speaker_boost: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          voice_model?: string
          language?: string
          speed?: number
          pitch?: number
          stability?: number
          similarity_boost?: number
          style?: number
          use_speaker_boost?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          voice_model?: string
          language?: string
          speed?: number
          pitch?: number
          stability?: number
          similarity_boost?: number
          style?: number
          use_speaker_boost?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // =============================================
      // 13. ASSISTANTS (Assistentes de IA)
      // =============================================
      assistants: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          system_prompt: string | null
          model: string
          voice_id: string
          is_active: boolean
          is_default: boolean
          knowledge_slugs: string[]
          temperature: number
          max_tokens: number
          avatar_url: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          system_prompt?: string | null
          model?: string
          voice_id?: string
          is_active?: boolean
          is_default?: boolean
          knowledge_slugs?: string[]
          temperature?: number
          max_tokens?: number
          avatar_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          system_prompt?: string | null
          model?: string
          voice_id?: string
          is_active?: boolean
          is_default?: boolean
          knowledge_slugs?: string[]
          temperature?: number
          max_tokens?: number
          avatar_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // =============================================
      // 14. COMPANIES (Empresas)
      // =============================================
      companies: {
        Row: {
          id: string
          name: string
          slug: string | null
          cnpj: string | null
          email: string | null
          phone: string | null
          address: string | null
          logo_url: string | null
          primary_color: string
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          cnpj?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          primary_color?: string
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          cnpj?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          primary_color?: string
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // =============================================
      // 15. MANAGERS (Gestores)
      // =============================================
      managers: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          phone: string | null
          company_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          phone?: string | null
          company_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          company_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 16. COMPANY_ASSISTANTS (Relacao N:N)
      // =============================================
      company_assistants: {
        Row: {
          id: string
          company_id: string
          assistant_id: string
          is_active: boolean
          is_default: boolean
          position: number
          custom_system_prompt: string | null
          custom_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          assistant_id: string
          is_active?: boolean
          is_default?: boolean
          position?: number
          custom_system_prompt?: string | null
          custom_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          assistant_id?: string
          is_active?: boolean
          is_default?: boolean
          position?: number
          custom_system_prompt?: string | null
          custom_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_assistants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 17. COMPANY_USERS (Usuarios das Empresas)
      // =============================================
      company_users: {
        Row: {
          id: string
          auth_user_id: string | null
          company_id: string
          name: string
          email: string
          phone: string | null
          role: string
          is_active: boolean
          last_login_at: string | null
          login_count: number
          avatar_url: string | null
          metadata: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          company_id: string
          name: string
          email: string
          phone?: string | null
          role?: string
          is_active?: boolean
          last_login_at?: string | null
          login_count?: number
          avatar_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          company_id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: string
          is_active?: boolean
          last_login_at?: string | null
          login_count?: number
          avatar_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_users_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          }
        ]
      }

      // =============================================
      // 18. CONVERSATION_FACTS (Analytics)
      // =============================================
      conversation_facts: {
        Row: {
          id: string
          company_id: string
          user_id: string
          assistant_id: string
          conversation_date: string
          conversation_hour: number | null
          day_of_week: number | null
          message_count: number
          user_messages: number
          assistant_messages: number
          total_tokens: number
          total_duration_seconds: number
          avg_response_time_ms: number
          positive_messages: number
          negative_messages: number
          neutral_messages: number
          total_audio_duration_seconds: number
          voice_messages: number
          session_count: number
          first_message_at: string | null
          last_message_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          assistant_id: string
          conversation_date?: string
          conversation_hour?: number | null
          day_of_week?: number | null
          message_count?: number
          user_messages?: number
          assistant_messages?: number
          total_tokens?: number
          total_duration_seconds?: number
          avg_response_time_ms?: number
          positive_messages?: number
          negative_messages?: number
          neutral_messages?: number
          total_audio_duration_seconds?: number
          voice_messages?: number
          session_count?: number
          first_message_at?: string | null
          last_message_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          assistant_id?: string
          conversation_date?: string
          conversation_hour?: number | null
          day_of_week?: number | null
          message_count?: number
          user_messages?: number
          assistant_messages?: number
          total_tokens?: number
          total_duration_seconds?: number
          avg_response_time_ms?: number
          positive_messages?: number
          negative_messages?: number
          neutral_messages?: number
          total_audio_duration_seconds?: number
          voice_messages?: number
          session_count?: number
          first_message_at?: string | null
          last_message_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_facts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_facts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_facts_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      // =============================================
      // VIEWS: Resumos de uso
      // =============================================
      company_usage_summary: {
        Row: {
          company_id: string | null
          company_name: string | null
          company_slug: string | null
          total_users: number | null
          total_assistants: number | null
          total_messages: number | null
          total_sessions: number | null
          last_activity_at: string | null
        }
        Relationships: []
      }
      assistant_usage_summary: {
        Row: {
          assistant_id: string | null
          assistant_name: string | null
          assistant_slug: string | null
          companies_using: number | null
          unique_users: number | null
          total_messages: number | null
          avg_response_time_ms: number | null
          positive_messages: number | null
          negative_messages: number | null
          last_activity_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =============================================
// Helper Types
// =============================================

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
