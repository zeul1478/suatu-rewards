export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_type: string;
          created_at: string;
          details: NonNullable<Json>;
          id: string;
          store_id: string | null;
          target_id: string | null;
          target_type: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_type: string;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          store_id?: string | null;
          target_id?: string | null;
          target_type?: string | null;
          updated_at?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_type?: string;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          store_id?: string | null;
          target_id?: string | null;
          target_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_throttles: {
        Row: {
          created_at: string;
          failed_count: number;
          key: string;
          locked_until: string | null;
          scope: string;
          updated_at: string;
          window_started_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          failed_count?: number;
          key: string;
          locked_until?: string | null;
          scope: string;
          updated_at?: string;
          window_started_at?: string;
        };
        Update: {
          created_at?: string;
          failed_count?: number;
          key?: string;
          locked_until?: string | null;
          scope?: string;
          updated_at?: string;
          window_started_at?: string;
        };
        Relationships: [];
      };
      consent_events: {
        Row: {
          created_at: string;
          customer_id: string;
          document_version: string | null;
          granted: boolean;
          id: string;
          kind: string;
          source: string;
          store_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          customer_id: string;
          document_version?: string | null;
          granted: boolean;
          id?: string;
          kind: string;
          source: string;
          store_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          document_version?: string | null;
          granted?: boolean;
          id?: string;
          kind?: string;
          source?: string;
          store_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consent_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consent_events_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          email_verified_at: string | null;
          first_name: string | null;
          id: string;
          is_adult_confirmed: boolean;
          last_name: string | null;
          phone_e164: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          email_verified_at?: string | null;
          first_name?: string | null;
          id?: string;
          is_adult_confirmed?: boolean;
          last_name?: string | null;
          phone_e164?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          email_verified_at?: string | null;
          first_name?: string | null;
          id?: string;
          is_adult_confirmed?: boolean;
          last_name?: string | null;
          phone_e164?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_verifications: {
        Row: {
          created_at: string;
          customer_id: string;
          email: string;
          expires_at: string;
          id: string;
          token_hash: string;
          updated_at: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          customer_id: string;
          email: string;
          expires_at: string;
          id?: string;
          token_hash: string;
          updated_at?: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          token_hash?: string;
          updated_at?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_verifications_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      point_transactions: {
        Row: {
          amount_cents: number | null;
          created_at: string;
          customer_id: string;
          external_ref: string | null;
          id: string;
          idempotency_key: string;
          note: string | null;
          points: number;
          reverses_transaction_id: string | null;
          source: string;
          staff_id: string | null;
          store_id: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents?: number | null;
          created_at?: string;
          customer_id: string;
          external_ref?: string | null;
          id?: string;
          idempotency_key: string;
          note?: string | null;
          points: number;
          reverses_transaction_id?: string | null;
          source: string;
          staff_id?: string | null;
          store_id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number | null;
          created_at?: string;
          customer_id?: string;
          external_ref?: string | null;
          id?: string;
          idempotency_key?: string;
          note?: string | null;
          points?: number;
          reverses_transaction_id?: string | null;
          source?: string;
          staff_id?: string | null;
          store_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_transactions_reverses_transaction_id_fkey";
            columns: ["reverses_transaction_id"];
            isOneToOne: false;
            referencedRelation: "point_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_transactions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_transactions_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      redemptions: {
        Row: {
          code: string;
          completed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          customer_id: string;
          expires_at: string;
          id: string;
          reward_id: string;
          status: string;
          store_id: string;
          transaction_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          completed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          customer_id: string;
          expires_at: string;
          id?: string;
          reward_id: string;
          status?: string;
          store_id: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          completed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          customer_id?: string;
          expires_at?: string;
          id?: string;
          reward_id?: string;
          status?: string;
          store_id?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "redemptions_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "rewards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemptions_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemptions_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "point_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards: {
        Row: {
          active: boolean;
          cost_points: number;
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          store_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          cost_points: number;
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          store_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          cost_points?: number;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          store_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rewards_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string;
          id: string;
          is_platform_admin: boolean;
          last_login_at: string | null;
          must_change_password: boolean;
          password_hash: string;
          role: string;
          staff_code: string;
          store_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name: string;
          id?: string;
          is_platform_admin?: boolean;
          last_login_at?: string | null;
          must_change_password?: boolean;
          password_hash: string;
          role: string;
          staff_code: string;
          store_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_platform_admin?: boolean;
          last_login_at?: string | null;
          must_change_password?: boolean;
          password_hash?: string;
          role?: string;
          staff_code?: string;
          store_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_sessions: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          last_seen_at: string;
          revoked_at: string | null;
          staff_id: string;
          store_id: string;
          token_hash: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          staff_id: string;
          store_id: string;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          staff_id?: string;
          store_id?: string;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_sessions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_sessions_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      store_customers: {
        Row: {
          created_at: string;
          customer_id: string;
          id: string;
          joined_at: string;
          last_visit_at: string | null;
          marketing_email_consent: boolean;
          marketing_email_consent_at: string | null;
          marketing_email_consent_source: string | null;
          points_balance: number;
          privacy_accepted_at: string | null;
          privacy_version: string | null;
          program_terms_accepted_at: string | null;
          program_terms_version: string | null;
          store_id: string;
          updated_at: string;
          visit_count: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          customer_id: string;
          id?: string;
          joined_at?: string;
          last_visit_at?: string | null;
          marketing_email_consent?: boolean;
          marketing_email_consent_at?: string | null;
          marketing_email_consent_source?: string | null;
          points_balance?: number;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          program_terms_accepted_at?: string | null;
          program_terms_version?: string | null;
          store_id: string;
          updated_at?: string;
          visit_count?: number;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          id?: string;
          joined_at?: string;
          last_visit_at?: string | null;
          marketing_email_consent?: boolean;
          marketing_email_consent_at?: string | null;
          marketing_email_consent_source?: string | null;
          points_balance?: number;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          program_terms_accepted_at?: string | null;
          program_terms_version?: string | null;
          store_id?: string;
          updated_at?: string;
          visit_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "store_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_customers_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          address: string | null;
          branding: NonNullable<Json>;
          country: string;
          created_at: string;
          currency: string;
          daily_earn_cap: number | null;
          id: string;
          locale: string;
          max_amount_per_transaction_cents: number | null;
          name: string;
          points_per_currency_unit: number | null;
          points_per_visit: number;
          repeat_entry_warning_seconds: number | null;
          reward_mode: string;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          branding?: NonNullable<Json>;
          country: string;
          created_at?: string;
          currency: string;
          daily_earn_cap?: number | null;
          id?: string;
          locale: string;
          max_amount_per_transaction_cents?: number | null;
          name: string;
          points_per_currency_unit?: number | null;
          points_per_visit?: number;
          repeat_entry_warning_seconds?: number | null;
          reward_mode?: string;
          slug: string;
          status?: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          branding?: NonNullable<Json>;
          country?: string;
          created_at?: string;
          currency?: string;
          daily_earn_cap?: number | null;
          id?: string;
          locale?: string;
          max_amount_per_transaction_cents?: number | null;
          name?: string;
          points_per_currency_unit?: number | null;
          points_per_visit?: number;
          repeat_entry_warning_seconds?: number | null;
          reward_mode?: string;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      anonymize_customer: { Args: { p_customer_id: string }; Returns: undefined };
      auth_throttle_clear: { Args: { p_key: string; p_scope: string }; Returns: undefined };
      auth_throttle_fail: {
        Args: { p_key: string; p_lock: string; p_max: number; p_scope: string; p_window: string };
        Returns: string;
      };
      auth_throttle_locked_until: { Args: { p_key: string; p_scope: string }; Returns: string };
      complete_redemption: {
        Args: { p_code: string; p_staff_id: string; p_store_id: string };
        Returns: Json;
      };
      create_redemption: {
        Args: { p_customer_id: string; p_reward_id: string; p_store_id: string };
        Returns: Json;
      };
      earn_points: {
        Args: {
          p_idempotency_key: string;
          p_phone_e164: string;
          p_staff_id: string;
          p_store_id: string;
        };
        Returns: Json;
      };
      register_customer: {
        Args: {
          p_auth_user_id: string;
          p_email: string;
          p_first_name: string;
          p_last_name: string;
          p_marketing_email: boolean;
          p_phone_e164: string;
          p_privacy_version: string;
          p_program_terms_version: string;
          p_source: string;
          p_store_id: string;
          p_terms_of_use_version: string;
        };
        Returns: string;
      };
      set_marketing_consent: {
        Args: { p_customer_id: string; p_granted: boolean; p_source: string; p_store_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
