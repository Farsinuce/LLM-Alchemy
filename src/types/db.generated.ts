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
      challenge_completions: {
        Row: {
          challenge_id: string
          completed_at: string
          element_discovered: string
          game_mode: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          element_discovered: string
          game_mode: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          element_discovered?: string
          game_mode?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          created_at: string
          end_date: string
          game_mode: string | null
          id: string
          reward_tokens: number
          start_date: string
          target_category: string | null
          target_element: string | null
          title: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          end_date: string
          game_mode?: string | null
          id?: string
          reward_tokens?: number
          start_date: string
          target_category?: string | null
          target_element?: string | null
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          end_date?: string
          game_mode?: string | null
          id?: string
          reward_tokens?: number
          start_date?: string
          target_category?: string | null
          target_element?: string | null
          title?: string
        }
        Relationships: []
      }
      game_states: {
        Row: {
          created_at: string
          elements: Json | null
          game_mode: string
          id: string
          total_elements: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elements?: Json | null
          game_mode?: string
          id?: string
          total_elements?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elements?: Json | null
          game_mode?: string
          id?: string
          total_elements?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_id: string | null
          stripe_session_id: string
          tokens_granted: number | null
          type: string
          updated_at: string
          user_id: string
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_id?: string | null
          stripe_session_id: string
          tokens_granted?: number | null
          type: string
          updated_at?: string
          user_id: string
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string
          tokens_granted?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          next_payment_date: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          next_payment_date?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          next_payment_date?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          challenge_preference: boolean | null
          created_at: string
          daily_count: number | null
          email: string | null
          id: string
          is_anonymous: boolean | null
          llm_model_preference: string | null
          monthly_usage: number | null
          subscription_ends_at: string | null
          subscription_status: string | null
          token_balance: number | null
          updated_at: string
        }
        Insert: {
          challenge_preference?: boolean | null
          created_at?: string
          daily_count?: number | null
          email?: string | null
          id: string
          is_anonymous?: boolean | null
          llm_model_preference?: string | null
          monthly_usage?: number | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          token_balance?: number | null
          updated_at?: string
        }
        Update: {
          challenge_preference?: boolean | null
          created_at?: string
          daily_count?: number | null
          email?: string | null
          id?: string
          is_anonymous?: boolean | null
          llm_model_preference?: string | null
          monthly_usage?: number | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          token_balance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_stripe_payment: {
        Args: {
          p_user_id: string
          p_stripe_session_id: string
          p_amount: number
          p_currency: string
          p_type: string
          p_tokens_granted: number
        }
        Returns: string
      }
      increment_user_tokens: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: number
      }
      update_stripe_payment_status: {
        Args: {
          p_stripe_session_id: string
          p_stripe_payment_id: string
          p_status: string
          p_stripe_customer_id: string
          p_webhook_data: Json
        }
        Returns: boolean
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
