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
      ai_scoring_daily: {
        Row: {
          count: number
          employer_id: string
          id: string
          scored_date: string
        }
        Insert: {
          count?: number
          employer_id: string
          id?: string
          scored_date?: string
        }
        Update: {
          count?: number
          employer_id?: string
          id?: string
          scored_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_scoring_daily_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_error: string | null
          ai_match_reasoning: string | null
          ai_match_score: number | null
          ai_status: string
          applied_at: string
          email: string
          first_name: string
          id: string
          job_id: string
          last_name: string
          resume_url: string
          status: Database["public"]["Enums"]["application_status_enum"]
          user_id: string | null
        }
        Insert: {
          ai_error?: string | null
          ai_match_reasoning?: string | null
          ai_match_score?: number | null
          ai_status?: string
          applied_at?: string
          email: string
          first_name: string
          id?: string
          job_id: string
          last_name: string
          resume_url: string
          status?: Database["public"]["Enums"]["application_status_enum"]
          user_id?: string | null
        }
        Update: {
          ai_error?: string | null
          ai_match_reasoning?: string | null
          ai_match_score?: number | null
          ai_status?: string
          applied_at?: string
          email?: string
          first_name?: string
          id?: string
          job_id?: string
          last_name?: string
          resume_url?: string
          status?: Database["public"]["Enums"]["application_status_enum"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_urls: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          reason: string | null
          url_pattern: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          reason?: string | null
          url_pattern: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          reason?: string | null
          url_pattern?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          company: string
          content: string
          created_at: string
          id: string
          job_title: string
          tone: string
          tracker_item_id: string | null
          user_id: string
        }
        Insert: {
          company: string
          content: string
          created_at?: string
          id?: string
          job_title: string
          tone?: string
          tracker_item_id?: string | null
          user_id: string
        }
        Update: {
          company?: string
          content?: string
          created_at?: string
          id?: string
          job_title?: string
          tone?: string
          tracker_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_tracker_item_id_fkey"
            columns: ["tracker_item_id"]
            isOneToOne: false
            referencedRelation: "tracker_items"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_runs: {
        Row: {
          employer_source_id: string
          errors_json: Json | null
          finished_at: string | null
          id: string
          jobs_added: number | null
          jobs_found: number | null
          jobs_removed: number | null
          jobs_updated: number | null
          started_at: string
          status: Database["public"]["Enums"]["crawl_run_status_enum"]
        }
        Insert: {
          employer_source_id: string
          errors_json?: Json | null
          finished_at?: string | null
          id?: string
          jobs_added?: number | null
          jobs_found?: number | null
          jobs_removed?: number | null
          jobs_updated?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["crawl_run_status_enum"]
        }
        Update: {
          employer_source_id?: string
          errors_json?: Json | null
          finished_at?: string | null
          id?: string
          jobs_added?: number | null
          jobs_found?: number | null
          jobs_removed?: number | null
          jobs_updated?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["crawl_run_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "crawl_runs_employer_source_id_fkey"
            columns: ["employer_source_id"]
            isOneToOne: false
            referencedRelation: "employer_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_files: {
        Row: {
          file_name: string
          id: string
          is_primary: boolean
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          id?: string
          is_primary?: boolean
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          is_primary?: boolean
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employer_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          employer_id: string
          expires_at: string
          id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          employer_id: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          employer_id?: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_invites_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_profiles: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_profiles_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_sources: {
        Row: {
          ats_type: string | null
          careers_home_url: string | null
          created_at: string
          employer_id: string
          id: string
          jobs_list_url: string | null
          last_crawl_at: string | null
          parent_source_id: string | null
          policy_mode: Database["public"]["Enums"]["policy_mode_enum"]
          policy_reason: string | null
          policy_status: Database["public"]["Enums"]["policy_status_enum"]
          robots_last_checked_at: string | null
          robots_url: string | null
          terms_last_checked_at: string | null
          terms_url: string | null
        }
        Insert: {
          ats_type?: string | null
          careers_home_url?: string | null
          created_at?: string
          employer_id: string
          id?: string
          jobs_list_url?: string | null
          last_crawl_at?: string | null
          parent_source_id?: string | null
          policy_mode?: Database["public"]["Enums"]["policy_mode_enum"]
          policy_reason?: string | null
          policy_status?: Database["public"]["Enums"]["policy_status_enum"]
          robots_last_checked_at?: string | null
          robots_url?: string | null
          terms_last_checked_at?: string | null
          terms_url?: string | null
        }
        Update: {
          ats_type?: string | null
          careers_home_url?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          jobs_list_url?: string | null
          last_crawl_at?: string | null
          parent_source_id?: string | null
          policy_mode?: Database["public"]["Enums"]["policy_mode_enum"]
          policy_reason?: string | null
          policy_status?: Database["public"]["Enums"]["policy_status_enum"]
          robots_last_checked_at?: string | null
          robots_url?: string | null
          terms_last_checked_at?: string | null
          terms_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_sources_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_sources_parent_source_id_fkey"
            columns: ["parent_source_id"]
            isOneToOne: false
            referencedRelation: "employer_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_subscriptions: {
        Row: {
          billing_interval: string
          created_at: string
          employer_id: string
          id: string
          plan_id: string
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          billing_interval: string
          created_at?: string
          employer_id: string
          id?: string
          plan_id: string
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          billing_interval?: string
          created_at?: string
          employer_id?: string
          id?: string
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_subscriptions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: true
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          about_text: string | null
          admin_notes: string | null
          approval_review_notes: string | null
          approval_reviewed_at: string | null
          approval_reviewed_by: string | null
          approval_status: string
          ats_direct_access: boolean
          billing_email: string | null
          billing_status: string | null
          company_type: string
          created_at: string
          feature_ai_cover: boolean
          feature_ai_cv: boolean
          feature_ai_ranking: boolean
          feature_ai_suggestions: boolean
          feature_direct_apply: boolean
          features_json: Json | null
          hq_city: string | null
          id: string
          industry_tags: string[] | null
          is_featured: boolean
          is_signed_up_active: boolean
          is_verified: boolean
          logo_url: string | null
          max_active_roles: number
          max_seats: number
          name: string
          plan_tier: string
          renewal_date: string | null
          slug: string
          stripe_customer_id: string | null
          website_domain: string | null
        }
        Insert: {
          about_text?: string | null
          admin_notes?: string | null
          approval_review_notes?: string | null
          approval_reviewed_at?: string | null
          approval_reviewed_by?: string | null
          approval_status?: string
          ats_direct_access?: boolean
          billing_email?: string | null
          billing_status?: string | null
          company_type?: string
          created_at?: string
          feature_ai_cover?: boolean
          feature_ai_cv?: boolean
          feature_ai_ranking?: boolean
          feature_ai_suggestions?: boolean
          feature_direct_apply?: boolean
          features_json?: Json | null
          hq_city?: string | null
          id?: string
          industry_tags?: string[] | null
          is_featured?: boolean
          is_signed_up_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          max_active_roles?: number
          max_seats?: number
          name: string
          plan_tier?: string
          renewal_date?: string | null
          slug: string
          stripe_customer_id?: string | null
          website_domain?: string | null
        }
        Update: {
          about_text?: string | null
          admin_notes?: string | null
          approval_review_notes?: string | null
          approval_reviewed_at?: string | null
          approval_reviewed_by?: string | null
          approval_status?: string
          ats_direct_access?: boolean
          billing_email?: string | null
          billing_status?: string | null
          company_type?: string
          created_at?: string
          feature_ai_cover?: boolean
          feature_ai_cv?: boolean
          feature_ai_ranking?: boolean
          feature_ai_suggestions?: boolean
          feature_direct_apply?: boolean
          features_json?: Json | null
          hq_city?: string | null
          id?: string
          industry_tags?: string[] | null
          is_featured?: boolean
          is_signed_up_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          max_active_roles?: number
          max_seats?: number
          name?: string
          plan_tier?: string
          renewal_date?: string | null
          slug?: string
          stripe_customer_id?: string | null
          website_domain?: string | null
        }
        Relationships: []
      }
      job_posting_content: {
        Row: {
          benefits_text: string | null
          description_text: string | null
          id: string
          job_id: string
          requirements_text: string | null
          store_mode: Database["public"]["Enums"]["store_mode_enum"]
        }
        Insert: {
          benefits_text?: string | null
          description_text?: string | null
          id?: string
          job_id: string
          requirements_text?: string | null
          store_mode?: Database["public"]["Enums"]["store_mode_enum"]
        }
        Update: {
          benefits_text?: string | null
          description_text?: string | null
          id?: string
          job_id?: string
          requirements_text?: string | null
          store_mode?: Database["public"]["Enums"]["store_mode_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_content_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          apply_url: string | null
          approval_status: string
          canonical_url: string | null
          category: string | null
          content_hash: string | null
          currency: string | null
          department: string | null
          employer_id: string
          employer_source_id: string | null
          employment_type: string | null
          extraction_method: string | null
          first_seen_at: string
          id: string
          language: string | null
          last_scraped_at: string | null
          last_seen_at: string
          location_city: string | null
          location_country: string | null
          location_region: string | null
          location_slug: string | null
          posted_at: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          seniority: string | null
          source_type: string
          status: Database["public"]["Enums"]["job_status_enum"]
          title: string
          title_bg: string | null
          title_en: string | null
          work_mode: string | null
        }
        Insert: {
          apply_url?: string | null
          approval_status?: string
          canonical_url?: string | null
          category?: string | null
          content_hash?: string | null
          currency?: string | null
          department?: string | null
          employer_id: string
          employer_source_id?: string | null
          employment_type?: string | null
          extraction_method?: string | null
          first_seen_at?: string
          id?: string
          language?: string | null
          last_scraped_at?: string | null
          last_seen_at?: string
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          location_slug?: string | null
          posted_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          seniority?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["job_status_enum"]
          title: string
          title_bg?: string | null
          title_en?: string | null
          work_mode?: string | null
        }
        Update: {
          apply_url?: string | null
          approval_status?: string
          canonical_url?: string | null
          category?: string | null
          content_hash?: string | null
          currency?: string | null
          department?: string | null
          employer_id?: string
          employer_source_id?: string | null
          employment_type?: string | null
          extraction_method?: string | null
          first_seen_at?: string
          id?: string
          language?: string | null
          last_scraped_at?: string | null
          last_seen_at?: string
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          location_slug?: string | null
          posted_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          seniority?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["job_status_enum"]
          title?: string
          title_bg?: string | null
          title_en?: string | null
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_employer_source_id_fkey"
            columns: ["employer_source_id"]
            isOneToOne: false
            referencedRelation: "employer_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          name_bg: string
          name_en: string
          slug: string
        }
        Insert: {
          name_bg: string
          name_en: string
          slug: string
        }
        Update: {
          name_bg?: string
          name_en?: string
          slug?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          employer_id: string | null
          error_message: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          payload: Json
          recipient_email: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          employer_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          employer_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_events: {
        Row: {
          created_at: string
          employer_id: string
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          employer_id: string
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          employer_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_events_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_memberships: {
        Row: {
          employer_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          employer_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          employer_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_memberships_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_checks: {
        Row: {
          allowed_paths_json: Json | null
          blocked_paths_json: Json | null
          checked_at: string
          employer_source_id: string
          id: string
          notes: string | null
          result: Database["public"]["Enums"]["policy_check_result_enum"]
          robots_snapshot_hash: string | null
          terms_snapshot_hash: string | null
        }
        Insert: {
          allowed_paths_json?: Json | null
          blocked_paths_json?: Json | null
          checked_at?: string
          employer_source_id: string
          id?: string
          notes?: string | null
          result: Database["public"]["Enums"]["policy_check_result_enum"]
          robots_snapshot_hash?: string | null
          terms_snapshot_hash?: string | null
        }
        Update: {
          allowed_paths_json?: Json | null
          blocked_paths_json?: Json | null
          checked_at?: string
          employer_source_id?: string
          id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["policy_check_result_enum"]
          robots_snapshot_hash?: string | null
          terms_snapshot_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_checks_employer_source_id_fkey"
            columns: ["employer_source_id"]
            isOneToOne: false
            referencedRelation: "employer_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      removal_requests: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          processed_at: string | null
          reason: string | null
          requester_email: string | null
          status: Database["public"]["Enums"]["removal_status_enum"]
          url: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          requester_email?: string | null
          status?: Database["public"]["Enums"]["removal_status_enum"]
          url: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          requester_email?: string | null
          status?: Database["public"]["Enums"]["removal_status_enum"]
          url?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          about: string | null
          billing_interval: string
          company_name: string
          contact_email: string
          contact_name: string | null
          created_at: string
          domain: string | null
          employer_id: string | null
          id: string
          message: string | null
          phone: string | null
          proposed_plan: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by_uid: string | null
        }
        Insert: {
          about?: string | null
          billing_interval?: string
          company_name: string
          contact_email: string
          contact_name?: string | null
          created_at?: string
          domain?: string | null
          employer_id?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          proposed_plan?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by_uid?: string | null
        }
        Update: {
          about?: string | null
          billing_interval?: string
          company_name?: string
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          domain?: string | null
          employer_id?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          proposed_plan?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          auto_crawl_schedule: string
          default_job_status: string
          id: string
          max_concurrent_scrapes: number
          max_job_age_days: number
          rate_limit_ms: number
          scrape_unknown_policy: string
          user_agent: string
        }
        Insert: {
          auto_crawl_schedule?: string
          default_job_status?: string
          id?: string
          max_concurrent_scrapes?: number
          max_job_age_days?: number
          rate_limit_ms?: number
          scrape_unknown_policy?: string
          user_agent?: string
        }
        Update: {
          auto_crawl_schedule?: string
          default_job_status?: string
          id?: string
          max_concurrent_scrapes?: number
          max_job_age_days?: number
          rate_limit_ms?: number
          scrape_unknown_policy?: string
          user_agent?: string
        }
        Relationships: []
      }
      tracker_items: {
        Row: {
          added_at: string
          apply_url: string | null
          canonical_url: string | null
          company: string
          company_logo: string | null
          id: string
          job_id: string | null
          job_title: string
          position: number
          source_url: string | null
          stage: Database["public"]["Enums"]["tracker_stage"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          apply_url?: string | null
          canonical_url?: string | null
          company: string
          company_logo?: string | null
          id?: string
          job_id?: string | null
          job_title: string
          position?: number
          source_url?: string | null
          stage?: Database["public"]["Enums"]["tracker_stage"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          apply_url?: string | null
          canonical_url?: string | null
          company?: string
          company_logo?: string | null
          id?: string
          job_id?: string | null
          job_title?: string
          position?: number
          source_url?: string | null
          stage?: Database["public"]["Enums"]["tracker_stage"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracker_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          note_type: Database["public"]["Enums"]["note_type"]
          tracker_item_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          tracker_item_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          tracker_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_notes_tracker_item_id_fkey"
            columns: ["tracker_item_id"]
            isOneToOne: false
            referencedRelation: "tracker_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      accept_employer_invite: { Args: { p_token: string }; Returns: Json }
      approve_employer_workspace: {
        Args: {
          p_employer_id: string
          p_review_notes?: string
          p_reviewer_uid: string
        }
        Returns: undefined
      }
      check_job_publish_allowed: {
        Args: { p_employer_id: string }
        Returns: Json
      }
      create_employer_invite: {
        Args: { p_email: string; p_employer_id: string; p_role?: string }
        Returns: Json
      }
      get_employer_active_seat_count: {
        Args: { p_employer_id: string }
        Returns: number
      }
      get_employer_owner_email: {
        Args: { p_employer_id: string }
        Returns: string
      }
      get_seat_cap: { Args: { p_plan: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_employer_member: { Args: { p_employer_id: string }; Returns: boolean }
      is_employer_member_for_job: {
        Args: { p_job_id: string }
        Returns: boolean
      }
      normalize_city: { Args: { raw_text: string }; Returns: string }
      provision_employer_workspace:
        | {
            Args: {
              p_billing_interval: string
              p_company_name: string
              p_plan_id: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_about?: string
              p_billing_interval: string
              p_company_name: string
              p_domain?: string
              p_email?: string
              p_plan_id: string
              p_user_id: string
            }
            Returns: Json
          }
      queue_application_scoring: {
        Args: { p_application_id: string }
        Returns: string
      }
      queue_notification: {
        Args: {
          p_channel?: string
          p_employer_id?: string
          p_event_type: string
          p_idempotency_key?: string
          p_payload?: Json
          p_recipient_email: string
        }
        Returns: undefined
      }
      reject_employer_workspace: {
        Args: {
          p_employer_id: string
          p_review_notes?: string
          p_reviewer_uid: string
        }
        Returns: undefined
      }
      retry_application_scoring: {
        Args: { p_application_id: string }
        Returns: string
      }
      revoke_employer_invite: { Args: { p_invite_id: string }; Returns: Json }
      set_application_ai_score: {
        Args: { p_application_id: string; p_reasoning: string; p_score: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      application_status_enum:
        | "new"
        | "reviewing"
        | "interviewing"
        | "offered"
        | "rejected"
      crawl_run_status_enum: "RUNNING" | "COMPLETED" | "FAILED"
      job_status_enum: "ACTIVE" | "INACTIVE" | "DRAFT" | "PAUSED" | "CLOSED"
      note_type: "note" | "interview_date" | "contact" | "status_change"
      policy_check_result_enum: "PASS" | "FAIL"
      policy_mode_enum:
        | "OFF"
        | "METADATA_ONLY"
        | "FULL_TEXT_ALLOWED"
        | "FEED_ONLY"
      policy_status_enum: "PENDING" | "ACTIVE" | "BLOCKED"
      removal_status_enum: "PENDING" | "REVIEWED" | "ACTIONED" | "REJECTED"
      store_mode_enum: "METADATA_ONLY" | "FULL_TEXT"
      tracker_stage:
        | "saved"
        | "applying"
        | "applied"
        | "interview"
        | "offer"
        | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      application_status_enum: [
        "new",
        "reviewing",
        "interviewing",
        "offered",
        "rejected",
      ],
      crawl_run_status_enum: ["RUNNING", "COMPLETED", "FAILED"],
      job_status_enum: ["ACTIVE", "INACTIVE", "DRAFT", "PAUSED", "CLOSED"],
      note_type: ["note", "interview_date", "contact", "status_change"],
      policy_check_result_enum: ["PASS", "FAIL"],
      policy_mode_enum: [
        "OFF",
        "METADATA_ONLY",
        "FULL_TEXT_ALLOWED",
        "FEED_ONLY",
      ],
      policy_status_enum: ["PENDING", "ACTIVE", "BLOCKED"],
      removal_status_enum: ["PENDING", "REVIEWED", "ACTIONED", "REJECTED"],
      store_mode_enum: ["METADATA_ONLY", "FULL_TEXT"],
      tracker_stage: [
        "saved",
        "applying",
        "applied",
        "interview",
        "offer",
        "rejected",
      ],
    },
  },
} as const
