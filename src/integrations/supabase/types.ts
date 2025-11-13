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
      admin_activity_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          class_id: string
          created_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          booking_date: string
          class_id: string
          created_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          class_id?: string
          created_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_status_changes: {
        Row: {
          affected_date: string | null
          changed_by: string
          class_id: string
          created_at: string
          id: string
          new_status: string
          old_status: string
          reason: string | null
        }
        Insert: {
          affected_date?: string | null
          changed_by: string
          class_id: string
          created_at?: string
          id?: string
          new_status: string
          old_status: string
          reason?: string | null
        }
        Update: {
          affected_date?: string | null
          changed_by?: string
          class_id?: string
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_status_changes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          day_of_week: number
          description: string | null
          duration_minutes: number
          id: string
          max_capacity: number
          name: string
          status: string
          time: string
          trainer_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          description?: string | null
          duration_minutes: number
          id?: string
          max_capacity?: number
          name: string
          status?: string
          time: string
          trainer_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          max_capacity?: number
          name?: string
          status?: string
          time?: string
          trainer_id?: string | null
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          key: string
          metadata: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          key: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          key?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_interactions: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          description?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          is_pinned: boolean
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_executions: {
        Row: {
          created_at: string
          customer_id: string
          error_message: string | null
          executed_actions: Json | null
          id: string
          status: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          error_message?: string | null
          executed_actions?: Json | null
          id?: string
          status: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          error_message?: string | null
          executed_actions?: Json | null
          id?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_executions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflows: {
        Row: {
          actions: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          total_runs: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          total_runs?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          total_runs?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          conditions: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_tag_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          customer_id: string
          id: string
          tag_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          customer_id: string
          id?: string
          tag_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          customer_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          subscriber_email: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          subscriber_email: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          subscriber_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_analytics"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          html_template: string
          id: string
          is_system: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_template: string
          id?: string
          is_system?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_system?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          total_price: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          total_price: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          bank_details: string | null
          brand_color: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          company_phone: string | null
          company_tax_id: string | null
          default_payment_terms: string | null
          default_tax_rate: number
          footer_text: string | null
          id: string
          invoice_prefix: string
          next_invoice_number: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_details?: string | null
          brand_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_phone?: string | null
          company_tax_id?: string | null
          default_payment_terms?: string | null
          default_tax_rate?: number
          footer_text?: string | null
          id?: string
          invoice_prefix?: string
          next_invoice_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_details?: string | null
          brand_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_phone?: string | null
          company_tax_id?: string | null
          default_payment_terms?: string | null
          default_tax_rate?: number
          footer_text?: string | null
          id?: string
          invoice_prefix?: string
          next_invoice_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          discount_amount: number
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_terms: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          discount_amount?: number
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          discount_amount?: number
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_months: number
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_campaigns: {
        Row: {
          created_at: string | null
          created_by: string
          html_content: string
          id: string
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          text_content: string | null
          title: string
          tracking_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          html_content: string
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          text_content?: string | null
          title: string
          tracking_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          html_content?: string
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          text_content?: string | null
          title?: string
          tracking_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          subscribed: boolean | null
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          subscribed?: boolean | null
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          subscribed?: boolean | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      password_change_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acquisition_source: string | null
          created_at: string | null
          customer_status: string | null
          email: string
          full_name: string | null
          id: string
          last_booking_date: string | null
          lifetime_value: number | null
          notes_summary: string | null
          phone: string | null
          total_bookings: number | null
          updated_at: string | null
        }
        Insert: {
          acquisition_source?: string | null
          created_at?: string | null
          customer_status?: string | null
          email: string
          full_name?: string | null
          id: string
          last_booking_date?: string | null
          lifetime_value?: number | null
          notes_summary?: string | null
          phone?: string | null
          total_bookings?: number | null
          updated_at?: string | null
        }
        Update: {
          acquisition_source?: string | null
          created_at?: string | null
          customer_status?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_booking_date?: string | null
          lifetime_value?: number | null
          notes_summary?: string | null
          phone?: string | null
          total_bookings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_packages: {
        Row: {
          created_at: string
          description: string | null
          duration_months: number | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          sessions_included: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_months?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          sessions_included?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_months?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sessions_included?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          specialization: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          specialization?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          specialization?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          booking_date: string
          class_id: string
          created_at: string
          id: string
          notified: boolean | null
          position: number
          user_id: string
        }
        Insert: {
          booking_date: string
          class_id: string
          created_at?: string
          id?: string
          notified?: boolean | null
          position: number
          user_id: string
        }
        Update: {
          booking_date?: string
          class_id?: string
          created_at?: string
          id?: string
          notified?: boolean | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      campaign_analytics: {
        Row: {
          bounces: number | null
          campaign_id: string | null
          click_through_rate: number | null
          open_rate: number | null
          sent_at: string | null
          sent_count: number | null
          title: string | null
          total_clicks: number | null
          total_opens: number | null
          unique_clicks: number | null
          unique_opens: number | null
          unsubscribes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_campaign_analytics: { Args: never; Returns: undefined }
      update_cron_schedule: {
        Args: { job_id: number; new_schedule: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member" | "trainer"
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
      app_role: ["admin", "member", "trainer"],
    },
  },
} as const
