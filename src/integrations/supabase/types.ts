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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      baby_care_logs: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          log_type: string
          logged_at: string
          notes: string | null
          subtype: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          log_type?: string
          logged_at?: string
          notes?: string | null
          subtype?: string | null
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          log_type?: string
          logged_at?: string
          notes?: string | null
          subtype?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      baby_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          name: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      camera_heartbeats: {
        Row: {
          battery_level: number | null
          created_at: string
          id: string
          last_heartbeat: string
          network_quality: string | null
          network_type: string | null
          room_name: string
          status: string
          stream_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          id?: string
          last_heartbeat?: string
          network_quality?: string | null
          network_type?: string | null
          room_name: string
          status?: string
          stream_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          id?: string
          last_heartbeat?: string
          network_quality?: string | null
          network_type?: string | null
          room_name?: string
          status?: string
          stream_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      caregiver_access: {
        Row: {
          access_level: string
          caregiver_email: string
          caregiver_name: string | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          owner_id: string
        }
        Insert: {
          access_level?: string
          caregiver_email: string
          caregiver_name?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          owner_id: string
        }
        Update: {
          access_level?: string
          caregiver_email?: string
          caregiver_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
        }
        Relationships: []
      }
      external_cameras: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          protocol: string
          room_id: string | null
          stream_url: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          protocol?: string
          room_id?: string | null
          stream_url: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          protocol?: string
          room_id?: string | null
          stream_url?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_cameras_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_measurements: {
        Row: {
          baby_id: string
          created_at: string
          head_cm: number | null
          height_cm: number | null
          id: string
          measured_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          baby_id: string
          created_at?: string
          head_cm?: number | null
          height_cm?: number | null
          id?: string
          measured_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          baby_id?: string
          created_at?: string
          head_cm?: number | null
          height_cm?: number | null
          id?: string
          measured_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_measurements_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "baby_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_at: string | null
          baby_id: string
          created_at: string
          id: string
          milestone_key: string
          notes: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          baby_id: string
          created_at?: string
          id?: string
          milestone_key: string
          notes?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          baby_id?: string
          created_at?: string
          id?: string
          milestone_key?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "baby_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_provider: string
          provider_payment_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_provider: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_settings: {
        Row: {
          created_at: string
          id: string
          key_name: string
          key_value: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_name: string
          key_value: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_name?: string
          key_value?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          fcm_token: string | null
          id: string
          p256dh: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          fcm_token?: string | null
          id?: string
          p256dh: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          fcm_token?: string | null
          id?: string
          p256dh?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          created_at: string
          duration_seconds: number
          file_path: string
          file_size_bytes: number
          id: string
          mime_type: string
          room_name: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          file_path: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          room_name: string
          trigger_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          file_path?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          room_name?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          owner_id: string
          room_name: string
          room_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id: string
          room_name: string
          room_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
          room_name?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_access: {
        Row: {
          access_code: string
          created_at: string
          granted_by: string
          id: string
          is_active: boolean
          room_id: string
          shared_with_email: string
        }
        Insert: {
          access_code: string
          created_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          room_id: string
          shared_with_email: string
        }
        Update: {
          access_code?: string
          created_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          room_id?: string
          shared_with_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_access_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_recordings: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          recording_id: string
          shared_by: string
          shared_with_email: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string
          id?: string
          recording_id: string
          shared_by: string
          shared_with_email: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          recording_id?: string
          shared_by?: string
          shared_with_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_recordings_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          intensity: number
          room_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          intensity?: number
          room_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          intensity?: number
          room_name?: string
          user_id?: string
        }
        Relationships: []
      }
      sponsor_videos: {
        Row: {
          click_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          placement: string
          resolution: string
          sort_order: number
          sponsor_name: string
          storage_path: string
          title: string
        }
        Insert: {
          click_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          placement?: string
          resolution?: string
          sort_order?: number
          sponsor_name?: string
          storage_path: string
          title: string
        }
        Update: {
          click_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          placement?: string
          resolution?: string
          sort_order?: number
          sponsor_name?: string
          storage_path?: string
          title?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_provider: string | null
          plan: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_camera_settings: {
        Row: {
          created_at: string
          id: string
          motion_enabled: boolean
          motion_sensitivity: number
          recording_duration_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motion_enabled?: boolean
          motion_sensitivity?: number
          recording_duration_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motion_enabled?: boolean
          motion_sensitivity?: number
          recording_duration_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
