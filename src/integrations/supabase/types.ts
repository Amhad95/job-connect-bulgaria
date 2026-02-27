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
      employers: {
        Row: {
          ats_direct_access: boolean
          billing_email: string | null
          company_type: string
          created_at: string
          features_json: Json | null
          hq_city: string | null
          id: string
          industry_tags: string[] | null
          is_featured: boolean
          is_signed_up_active: boolean
          logo_url: string | null
          name: string
          plan_tier: string
          slug: string
          stripe_customer_id: string | null
          website_domain: string | null
        }
        Insert: {
          ats_direct_access?: boolean
          billing_email?: string | null
          company_type?: string
          created_at?: string
          features_json?: Json | null
          hq_city?: string | null
          id?: string
          industry_tags?: string[] | null
          is_featured?: boolean
          is_signed_up_active?: boolean
          logo_url?: string | null
          name: string
          plan_tier?: string
          slug: string
          stripe_customer_id?: string | null
          website_domain?: string | null
        }
        Update: {
          ats_direct_access?: boolean
          billing_email?: string | null
          company_type?: string
          created_at?: string
          features_json?: Json | null
          hq_city?: string | null
          id?: string
          industry_tags?: string[] | null
          is_featured?: boolean
          is_signed_up_active?: boolean
          logo_url?: string | null
          name?: string
          plan_tier?: string
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
          canonical_url: string
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
          posted_at: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          seniority: string | null
          status: Database["public"]["Enums"]["job_status_enum"]
          title: string
          title_bg: string | null
          title_en: string | null
          work_mode: string | null
        }
        Insert: {
          apply_url?: string | null
          approval_status?: string
          canonical_url: string
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
          posted_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          seniority?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
          title: string
          title_bg?: string | null
          title_en?: string | null
          work_mode?: string | null
        }
        Update: {
          apply_url?: string | null
          approval_status?: string
          canonical_url?: string
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
          posted_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          seniority?: string | null
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
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          message: string | null
          phone: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      crawl_run_status_enum: "RUNNING" | "COMPLETED" | "FAILED"
      job_status_enum: "ACTIVE" | "INACTIVE"
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
      crawl_run_status_enum: ["RUNNING", "COMPLETED", "FAILED"],
      job_status_enum: ["ACTIVE", "INACTIVE"],
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
