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
      app_settings: {
        Row: {
          auto_approval_enabled: boolean
          discount_metafields_enabled: boolean
          extra_customer_tags: string[]
          founder_call_enabled: boolean
          founder_call_high_volume_only: boolean
          id: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
          welcome_offer_enabled: boolean
        }
        Insert: {
          auto_approval_enabled?: boolean
          discount_metafields_enabled?: boolean
          extra_customer_tags?: string[]
          founder_call_enabled?: boolean
          founder_call_high_volume_only?: boolean
          id?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          welcome_offer_enabled?: boolean
        }
        Update: {
          auto_approval_enabled?: boolean
          discount_metafields_enabled?: boolean
          extra_customer_tags?: string[]
          founder_call_enabled?: boolean
          founder_call_high_volume_only?: boolean
          id?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          welcome_offer_enabled?: boolean
        }
        Relationships: []
      }
      error_alerts: {
        Row: {
          alert_key: string
          first_seen_at: string
          last_context: Json | null
          last_message: string | null
          last_notified_at: string | null
          last_seen_at: string
          occurrence_count: number
          source: string
        }
        Insert: {
          alert_key: string
          first_seen_at?: string
          last_context?: Json | null
          last_message?: string | null
          last_notified_at?: string | null
          last_seen_at?: string
          occurrence_count?: number
          source: string
        }
        Update: {
          alert_key?: string
          first_seen_at?: string
          last_context?: Json | null
          last_message?: string | null
          last_notified_at?: string | null
          last_seen_at?: string
          occurrence_count?: number
          source?: string
        }
        Relationships: []
      }
      helium_customers_backfill: {
        Row: {
          created_at: string
          email: string | null
          fetched_at: string
          helium_id: string
          raw: Json
          shopify_id: number | null
        }
        Insert: {
          created_at: string
          email?: string | null
          fetched_at?: string
          helium_id: string
          raw: Json
          shopify_id?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          fetched_at?: string
          helium_id?: string
          raw?: Json
          shopify_id?: number | null
        }
        Relationships: []
      }
      marketing_consent_log: {
        Row: {
          channel: string
          created_at: string
          disclosure_text: string
          email: string | null
          granted: boolean
          id: string
          ip_address: string | null
          opt_in_level: string
          phone_e164: string | null
          shopify_customer_id: string | null
          source_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          disclosure_text: string
          email?: string | null
          granted: boolean
          id?: string
          ip_address?: string | null
          opt_in_level?: string
          phone_e164?: string | null
          shopify_customer_id?: string | null
          source_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          disclosure_text?: string
          email?: string | null
          granted?: boolean
          id?: string
          ip_address?: string | null
          opt_in_level?: string
          phone_e164?: string | null
          shopify_customer_id?: string | null
          source_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      not_stylist_events: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          application_status: string | null
          birthday_day: string | null
          birthday_month: string | null
          business_address: string | null
          business_name: string | null
          business_operation_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          enrollment_proof_paths: string[] | null
          first_name: string | null
          has_tax_exemption: boolean | null
          id: string
          last_name: string | null
          license_document_path: string | null
          license_number: string | null
          license_proof_paths: string[] | null
          phone_country_code: string | null
          phone_number: string | null
          preferred_name: string | null
          salon_size: string | null
          salon_structure: string | null
          school_name: string | null
          school_state: string | null
          social_media_handle: string | null
          state: string | null
          subscribe_order_updates: boolean | null
          subscribe_promotions: boolean | null
          subscribe_sms_promotions: boolean | null
          suite_number: string | null
          tax_exempt_document_path: string | null
          updated_at: string | null
          wholesale_agreed: boolean | null
          zip_code: string | null
        }
        Insert: {
          account_type?: string | null
          application_status?: string | null
          birthday_day?: string | null
          birthday_month?: string | null
          business_address?: string | null
          business_name?: string | null
          business_operation_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          enrollment_proof_paths?: string[] | null
          first_name?: string | null
          has_tax_exemption?: boolean | null
          id: string
          last_name?: string | null
          license_document_path?: string | null
          license_number?: string | null
          license_proof_paths?: string[] | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_name?: string | null
          salon_size?: string | null
          salon_structure?: string | null
          school_name?: string | null
          school_state?: string | null
          social_media_handle?: string | null
          state?: string | null
          subscribe_order_updates?: boolean | null
          subscribe_promotions?: boolean | null
          subscribe_sms_promotions?: boolean | null
          suite_number?: string | null
          tax_exempt_document_path?: string | null
          updated_at?: string | null
          wholesale_agreed?: boolean | null
          zip_code?: string | null
        }
        Update: {
          account_type?: string | null
          application_status?: string | null
          birthday_day?: string | null
          birthday_month?: string | null
          business_address?: string | null
          business_name?: string | null
          business_operation_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          enrollment_proof_paths?: string[] | null
          first_name?: string | null
          has_tax_exemption?: boolean | null
          id?: string
          last_name?: string | null
          license_document_path?: string | null
          license_number?: string | null
          license_proof_paths?: string[] | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_name?: string | null
          salon_size?: string | null
          salon_structure?: string | null
          school_name?: string | null
          school_state?: string | null
          social_media_handle?: string | null
          state?: string | null
          subscribe_order_updates?: boolean | null
          subscribe_promotions?: boolean | null
          subscribe_sms_promotions?: boolean | null
          suite_number?: string | null
          tax_exempt_document_path?: string | null
          updated_at?: string | null
          wholesale_agreed?: boolean | null
          zip_code?: string | null
        }
        Relationships: []
      }
      registration_leads: {
        Row: {
          account_type: string | null
          completed_at: string | null
          created_at: string
          device_type: string | null
          email: string
          first_order_at: string | null
          first_order_id: string | null
          first_order_synced_at: string | null
          first_order_value: number | null
          founder_call_booked_at: string | null
          founder_call_invitee_uri: string | null
          founder_call_no_show_at: string | null
          founder_call_start_time: string | null
          id: string
          ip_address: string | null
          klaviyo_synced_at: string | null
          last_field: string | null
          last_step: string | null
          monthly_order_volume: string | null
          started_at: string
          updated_at: string
          user_agent: string | null
          validation_errors: Json
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          account_type?: string | null
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          email: string
          first_order_at?: string | null
          first_order_id?: string | null
          first_order_synced_at?: string | null
          first_order_value?: number | null
          founder_call_booked_at?: string | null
          founder_call_invitee_uri?: string | null
          founder_call_no_show_at?: string | null
          founder_call_start_time?: string | null
          id?: string
          ip_address?: string | null
          klaviyo_synced_at?: string | null
          last_field?: string | null
          last_step?: string | null
          monthly_order_volume?: string | null
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          validation_errors?: Json
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          account_type?: string | null
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          email?: string
          first_order_at?: string | null
          first_order_id?: string | null
          first_order_synced_at?: string | null
          first_order_value?: number | null
          founder_call_booked_at?: string | null
          founder_call_invitee_uri?: string | null
          founder_call_no_show_at?: string | null
          founder_call_start_time?: string | null
          id?: string
          ip_address?: string | null
          klaviyo_synced_at?: string | null
          last_field?: string | null
          last_step?: string | null
          monthly_order_volume?: string | null
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          validation_errors?: Json
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      registration_submissions: {
        Row: {
          account_type: string | null
          created_at: string
          email: string
          error_log: Json
          helium_customer_id: string | null
          id: string
          ip_address: string | null
          payload: Json
          shopify_customer_id: number | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string
          email: string
          error_log?: Json
          helium_customer_id?: string | null
          id?: string
          ip_address?: string | null
          payload: Json
          shopify_customer_id?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string
          email?: string
          error_log?: Json
          helium_customer_id?: string | null
          id?: string
          ip_address?: string | null
          payload?: Json
          shopify_customer_id?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      welcome_offer_codes: {
        Row: {
          code: string
          created_at: string
          email: string | null
          ends_at: string | null
          id: string
          shopify_customer_id: string | null
          shopify_discount_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email?: string | null
          ends_at?: string | null
          id?: string
          shopify_customer_id?: string | null
          shopify_discount_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string | null
          ends_at?: string | null
          id?: string
          shopify_customer_id?: string | null
          shopify_discount_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auto_approval_enabled: { Args: never; Returns: boolean }
      get_discount_metafields_enabled: { Args: never; Returns: boolean }
      get_extra_customer_tags: { Args: never; Returns: string[] }
      get_founder_call_high_volume_only: { Args: never; Returns: boolean }
      get_welcome_offer_enabled: { Args: never; Returns: boolean }
      increment_registration_validation_errors: {
        Args: { _email: string; _fields: string[] }
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
    Enums: {},
  },
} as const
