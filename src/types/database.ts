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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          created_at: string
          employee_id: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          field_edited: string | null
          id: string
          location_id: string | null
          metadata: Json | null
          new_value: string | null
          organization_id: string
          previous_value: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          field_edited?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          new_value?: string | null
          organization_id: string
          previous_value?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          field_edited?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          new_value?: string | null
          organization_id?: string
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      biotrack_sync_log: {
        Row: {
          api_version: string
          biotrack_endpoint: string
          completed_at: string | null
          created_at: string
          direction: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          location_id: string | null
          organization_id: string
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number
          status: string
          sync_type: string
        }
        Insert: {
          api_version: string
          biotrack_endpoint: string
          completed_at?: string | null
          created_at?: string
          direction: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          location_id?: string | null
          organization_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status: string
          sync_type: string
        }
        Update: {
          api_version?: string
          biotrack_endpoint?: string
          completed_at?: string | null
          created_at?: string
          direction?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "biotrack_sync_log_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biotrack_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          created_at: string
          html_content: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string
          channel: string
          created_at: string
          id: string
          name: string
          organization_id: string
          segment_ids: string[]
          send_complete_date: string | null
          send_date: string | null
          sending_count: number
          smart_sending: boolean
          status: string
          tag_ids: string[]
          template_id: string | null
          total_recipients: number
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          campaign_type: string
          channel?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          segment_ids?: string[]
          send_complete_date?: string | null
          send_date?: string | null
          sending_count?: number
          smart_sending?: boolean
          status?: string
          tag_ids?: string[]
          template_id?: string | null
          total_recipients?: number
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          segment_ids?: string[]
          send_complete_date?: string | null
          send_date?: string | null
          sending_count?: number
          smart_sending?: boolean
          status?: string
          tag_ids?: string[]
          template_id?: string | null
          total_recipients?: number
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_drawer_drops: {
        Row: {
          amount: number
          created_at: string
          drawer_id: string
          drop_type: string
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          drawer_id: string
          drop_type: string
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          drawer_id?: string
          drop_type?: string
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_drawer_drops_drawer_id_fkey"
            columns: ["drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawer_drops_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_drawers: {
        Row: {
          actual_amount: number | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          expected_amount: number | null
          id: string
          location_id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          reconciled_at: string | null
          register_id: string
          status: string
          total_drops: number
          total_returns: number
          total_sales: number
          updated_at: string
          variance: number | null
        }
        Insert: {
          actual_amount?: number | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          expected_amount?: number | null
          id?: string
          location_id: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount: number
          reconciled_at?: string | null
          register_id: string
          status?: string
          total_drops?: number
          total_returns?: number
          total_sales?: number
          updated_at?: string
          variance?: number | null
        }
        Update: {
          actual_amount?: number | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          expected_amount?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          reconciled_at?: string | null
          register_id?: string
          status?: string
          total_drops?: number
          total_returns?: number
          total_sales?: number
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_drawers_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawers_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawers_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_group_members: {
        Row: {
          created_at: string
          customer_group_id: string
          customer_id: string
        }
        Insert: {
          created_at?: string
          customer_group_id: string
          customer_id: string
        }
        Update: {
          created_at?: string
          customer_group_id?: string
          customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_group_members_customer_group_id_fkey"
            columns: ["customer_group_id"]
            isOneToOne: false
            referencedRelation: "customer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_group_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          ban_reason: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          external_code: string | null
          first_name: string | null
          id: string
          id_expiration: string | null
          id_number_hash: string | null
          id_state: string | null
          id_type: string | null
          is_medical: boolean
          last_name: string | null
          last_visit_at: string | null
          lifetime_spend: number
          medical_card_expiration: string | null
          medical_card_number: string | null
          medical_provider: string | null
          middle_name: string | null
          notes: string | null
          opted_into_marketing: boolean
          organization_id: string
          phone: string | null
          prefix: string | null
          state: string | null
          status: string
          suffix: string | null
          updated_at: string
          visit_count: number
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          ban_reason?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          external_code?: string | null
          first_name?: string | null
          id?: string
          id_expiration?: string | null
          id_number_hash?: string | null
          id_state?: string | null
          id_type?: string | null
          is_medical?: boolean
          last_name?: string | null
          last_visit_at?: string | null
          lifetime_spend?: number
          medical_card_expiration?: string | null
          medical_card_number?: string | null
          medical_provider?: string | null
          middle_name?: string | null
          notes?: string | null
          opted_into_marketing?: boolean
          organization_id: string
          phone?: string | null
          prefix?: string | null
          state?: string | null
          status?: string
          suffix?: string | null
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          ban_reason?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          external_code?: string | null
          first_name?: string | null
          id?: string
          id_expiration?: string | null
          id_number_hash?: string | null
          id_state?: string | null
          id_type?: string | null
          is_medical?: boolean
          last_name?: string | null
          last_visit_at?: string | null
          lifetime_spend?: number
          medical_card_expiration?: string | null
          medical_card_number?: string | null
          medical_provider?: string | null
          middle_name?: string | null
          notes?: string | null
          opted_into_marketing?: boolean
          organization_id?: string
          phone?: string | null
          prefix?: string | null
          state?: string | null
          status?: string
          suffix?: string | null
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_config: {
        Row: {
          created_at: string
          default_delivery_enabled: boolean
          default_end_time: string | null
          default_start_time: string | null
          id: string
          max_concentrate_weight_grams: number | null
          max_total_value: number | null
          max_total_weight_grams: number | null
          max_unordered_value: number | null
          organization_id: string
          title_format: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_delivery_enabled?: boolean
          default_end_time?: string | null
          default_start_time?: string | null
          id?: string
          max_concentrate_weight_grams?: number | null
          max_total_value?: number | null
          max_total_weight_grams?: number | null
          max_unordered_value?: number | null
          organization_id: string
          title_format?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_delivery_enabled?: boolean
          default_end_time?: string | null
          default_start_time?: string | null
          id?: string
          max_concentrate_weight_grams?: number | null
          max_total_value?: number | null
          max_total_weight_grams?: number | null
          max_unordered_value?: number | null
          organization_id?: string
          title_format?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string | null
          employee_id: string | null
          hire_date: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          state_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employee_id?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          state_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employee_id?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          state_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          inventory_room_id: string | null
          is_active: boolean
          license_plate: string | null
          license_state: string | null
          make: string | null
          model: string | null
          name: string
          organization_id: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          inventory_room_id?: string | null
          is_active?: boolean
          license_plate?: string | null
          license_state?: string | null
          make?: string | null
          model?: string | null
          name: string
          organization_id: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          inventory_room_id?: string | null
          is_active?: boolean
          license_plate?: string | null
          license_state?: string | null
          make?: string | null
          model?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_vehicles_inventory_room_id_fkey"
            columns: ["inventory_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          boundaries: Json | null
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          min_order: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          boundaries?: Json | null
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          min_order?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          boundaries?: Json | null
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          min_order?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_constraint_filters: {
        Row: {
          constraint_id: string
          created_at: string
          filter_type: string
          filter_value_ids: string[]
          id: string
        }
        Insert: {
          constraint_id: string
          created_at?: string
          filter_type: string
          filter_value_ids?: string[]
          id?: string
        }
        Update: {
          constraint_id?: string
          created_at?: string
          filter_type?: string
          filter_value_ids?: string[]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_constraint_filters_constraint_id_fkey"
            columns: ["constraint_id"]
            isOneToOne: false
            referencedRelation: "discount_constraints"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_constraints: {
        Row: {
          created_at: string
          discount_id: string
          group_by_sku: boolean
          id: string
          include_non_cannabis: boolean
          min_value: number
          sort_order: number
          threshold_type: string
        }
        Insert: {
          created_at?: string
          discount_id: string
          group_by_sku?: boolean
          id?: string
          include_non_cannabis?: boolean
          min_value?: number
          sort_order?: number
          threshold_type: string
        }
        Update: {
          created_at?: string
          discount_id?: string
          group_by_sku?: boolean
          id?: string
          include_non_cannabis?: boolean
          min_value?: number
          sort_order?: number
          threshold_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_constraints_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_reward_filters: {
        Row: {
          created_at: string
          filter_type: string
          filter_value_ids: string[]
          id: string
          reward_id: string
        }
        Insert: {
          created_at?: string
          filter_type: string
          filter_value_ids?: string[]
          id?: string
          reward_id: string
        }
        Update: {
          created_at?: string
          filter_type?: string
          filter_value_ids?: string[]
          id?: string
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_reward_filters_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "discount_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rewards: {
        Row: {
          created_at: string
          discount_id: string
          discount_method: string
          discount_value: number
          id: string
          include_non_cannabis: boolean
          sort_order: number
          threshold_type: string | null
          threshold_value: number | null
        }
        Insert: {
          created_at?: string
          discount_id: string
          discount_method: string
          discount_value?: number
          id?: string
          include_non_cannabis?: boolean
          sort_order?: number
          threshold_type?: string | null
          threshold_value?: number | null
        }
        Update: {
          created_at?: string
          discount_id?: string
          discount_method?: string
          discount_value?: number
          id?: string
          include_non_cannabis?: boolean
          sort_order?: number
          threshold_type?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_rewards_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          application_method: string
          available_online: boolean
          code: string | null
          created_at: string
          customer_group_ids: string[]
          customer_types: string[]
          description: string | null
          discount_stacking: boolean
          end_date: string | null
          first_time_customer_only: boolean
          id: string
          ignore_net_tax_rates: boolean
          include_non_cannabis: boolean
          is_bundled: boolean
          location_ids: string[]
          name: string
          organization_id: string
          per_customer_limit: number | null
          requires_manager_approval: boolean
          segment_ids: string[]
          start_date: string | null
          status: string
          updated_at: string
          weekly_recurrence: number[] | null
        }
        Insert: {
          application_method?: string
          available_online?: boolean
          code?: string | null
          created_at?: string
          customer_group_ids?: string[]
          customer_types?: string[]
          description?: string | null
          discount_stacking?: boolean
          end_date?: string | null
          first_time_customer_only?: boolean
          id?: string
          ignore_net_tax_rates?: boolean
          include_non_cannabis?: boolean
          is_bundled?: boolean
          location_ids?: string[]
          name: string
          organization_id: string
          per_customer_limit?: number | null
          requires_manager_approval?: boolean
          segment_ids?: string[]
          start_date?: string | null
          status?: string
          updated_at?: string
          weekly_recurrence?: number[] | null
        }
        Update: {
          application_method?: string
          available_online?: boolean
          code?: string | null
          created_at?: string
          customer_group_ids?: string[]
          customer_types?: string[]
          description?: string | null
          discount_stacking?: boolean
          end_date?: string | null
          first_time_customer_only?: boolean
          id?: string
          ignore_net_tax_rates?: boolean
          include_non_cannabis?: boolean
          is_bundled?: boolean
          location_ids?: string[]
          name?: string
          organization_id?: string
          per_customer_limit?: number | null
          requires_manager_approval?: boolean
          segment_ids?: string[]
          start_date?: string | null
          status?: string
          updated_at?: string
          weekly_recurrence?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_locations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean
          location_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean
          location_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_primary?: boolean
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          auth_user_id: string | null
          biotrack_employee_id: string | null
          created_at: string
          email: string | null
          first_name: string
          hire_date: string
          id: string
          is_active: boolean
          last_name: string
          organization_id: string
          phone: string | null
          pin_hash: string
          role: string
          state_id: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          biotrack_employee_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          hire_date?: string
          id?: string
          is_active?: boolean
          last_name: string
          organization_id: string
          phone?: string | null
          pin_hash: string
          role: string
          state_id?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          biotrack_employee_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          last_name?: string
          organization_id?: string
          phone?: string | null
          pin_hash?: string
          role?: string
          state_id?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          location_id: string | null
          name: string
          organization_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          location_id?: string | null
          name: string
          organization_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fees_donations: {
        Row: {
          amount: number
          auto_apply_rules: Json | null
          created_at: string
          fee_type: string
          id: string
          is_active: boolean
          is_percentage: boolean
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          auto_apply_rules?: Json | null
          created_at?: string
          fee_type: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          location_id: string
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_apply_rules?: Json | null
          created_at?: string
          fee_type?: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_donations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_tags: {
        Row: {
          inventory_item_id: string
          tag_id: string
        }
        Insert: {
          inventory_item_id: string
          tag_id: string
        }
        Update: {
          inventory_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_tags_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          batch_id: string | null
          biotrack_barcode: string | null
          cost_per_unit: number | null
          created_at: string
          deactivated_at: string | null
          expiration_date: string | null
          id: string
          is_active: boolean
          lab_test_date: string | null
          lab_test_results: Json | null
          location_id: string
          lot_number: string | null
          product_id: string
          quantity: number
          quantity_reserved: number
          received_at: string | null
          received_by: string | null
          room_id: string | null
          subroom_id: string | null
          testing_status: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          batch_id?: string | null
          biotrack_barcode?: string | null
          cost_per_unit?: number | null
          created_at?: string
          deactivated_at?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          lab_test_date?: string | null
          lab_test_results?: Json | null
          location_id: string
          lot_number?: string | null
          product_id: string
          quantity?: number
          quantity_reserved?: number
          received_at?: string | null
          received_by?: string | null
          room_id?: string | null
          subroom_id?: string | null
          testing_status?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          batch_id?: string | null
          biotrack_barcode?: string | null
          cost_per_unit?: number | null
          created_at?: string
          deactivated_at?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          lab_test_date?: string | null
          lab_test_results?: Json | null
          location_id?: string
          lot_number?: string | null
          product_id?: string
          quantity?: number
          quantity_reserved?: number
          received_at?: string | null
          received_by?: string | null
          room_id?: string | null
          subroom_id?: string | null
          testing_status?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_subroom_id_fkey"
            columns: ["subroom_id"]
            isOneToOne: false
            referencedRelation: "subrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      label_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      label_templates: {
        Row: {
          created_at: string
          dpi: number
          fields: Json
          height_inches: number
          id: string
          is_active: boolean
          label_type: string
          labels_per_sheet: number
          name: string
          organization_id: string
          orientation: string | null
          updated_at: string
          width_inches: number
        }
        Insert: {
          created_at?: string
          dpi?: number
          fields?: Json
          height_inches?: number
          id?: string
          is_active?: boolean
          label_type?: string
          labels_per_sheet?: number
          name: string
          organization_id: string
          orientation?: string | null
          updated_at?: string
          width_inches?: number
        }
        Update: {
          created_at?: string
          dpi?: number
          fields?: Json
          height_inches?: number
          id?: string
          is_active?: boolean
          label_type?: string
          labels_per_sheet?: number
          name?: string
          organization_id?: string
          orientation?: string | null
          updated_at?: string
          width_inches?: number
        }
        Relationships: [
          {
            foreignKeyName: "label_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_product_prices: {
        Row: {
          available_on_pos: boolean
          available_online: boolean
          cost_price: number | null
          created_at: string
          external_category: string | null
          external_id: string | null
          id: string
          is_active: boolean
          location_id: string
          low_inventory_threshold: number | null
          max_purchase_per_transaction: number | null
          med_price: number | null
          pricing_tier_id: string | null
          product_id: string
          rec_price: number | null
          updated_at: string
        }
        Insert: {
          available_on_pos?: boolean
          available_online?: boolean
          cost_price?: number | null
          created_at?: string
          external_category?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          low_inventory_threshold?: number | null
          max_purchase_per_transaction?: number | null
          med_price?: number | null
          pricing_tier_id?: string | null
          product_id: string
          rec_price?: number | null
          updated_at?: string
        }
        Update: {
          available_on_pos?: boolean
          available_online?: boolean
          cost_price?: number | null
          created_at?: string
          external_category?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          low_inventory_threshold?: number | null
          max_purchase_per_transaction?: number | null
          med_price?: number | null
          pricing_tier_id?: string | null
          product_id?: string
          rec_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_product_prices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_product_prices_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      location_settings: {
        Row: {
          created_at: string
          id: string
          location_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string
          address_line2: string | null
          allows_delivery: boolean
          allows_online_orders: boolean
          biotrack_location_id: string | null
          city: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_number: string
          medical_reserve_pct: number
          name: string
          operating_hours: Json
          organization_id: string
          phone: string | null
          state: string
          timezone: string
          updated_at: string
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          allows_delivery?: boolean
          allows_online_orders?: boolean
          biotrack_location_id?: string | null
          city: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number: string
          medical_reserve_pct?: number
          name: string
          operating_hours?: Json
          organization_id: string
          phone?: string | null
          state?: string
          timezone?: string
          updated_at?: string
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          allows_delivery?: boolean
          allows_online_orders?: boolean
          biotrack_location_id?: string | null
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string
          medical_reserve_pct?: number
          name?: string
          operating_hours?: Json
          organization_id?: string
          phone?: string | null
          state?: string
          timezone?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_adjustment_reasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_adjustment_reasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_balances: {
        Row: {
          current_points: number
          customer_id: string
          enrolled_at: string
          id: string
          lifetime_points: number
          organization_id: string
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          current_points?: number
          customer_id: string
          enrolled_at?: string
          id?: string
          lifetime_points?: number
          organization_id: string
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          current_points?: number
          customer_id?: string
          enrolled_at?: string
          id?: string
          lifetime_points?: number
          organization_id?: string
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_balances_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_config: {
        Row: {
          accrual_rate: number
          auto_apply_to_cart: boolean
          created_at: string
          enrollment_type: string
          id: string
          initial_signup_reward: number
          is_active: boolean
          online_description: string | null
          organization_id: string
          point_expiration_days: number | null
          redemption_method: string
          tiers_enabled: boolean
          updated_at: string
        }
        Insert: {
          accrual_rate?: number
          auto_apply_to_cart?: boolean
          created_at?: string
          enrollment_type?: string
          id?: string
          initial_signup_reward?: number
          is_active?: boolean
          online_description?: string | null
          organization_id: string
          point_expiration_days?: number | null
          redemption_method?: string
          tiers_enabled?: boolean
          updated_at?: string
        }
        Update: {
          accrual_rate?: number
          auto_apply_to_cart?: boolean
          created_at?: string
          enrollment_type?: string
          id?: string
          initial_signup_reward?: number
          is_active?: boolean
          online_description?: string | null
          organization_id?: string
          point_expiration_days?: number | null
          redemption_method?: string
          tiers_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          created_at: string
          id: string
          loyalty_config_id: string
          min_points: number
          multiplier: number
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          loyalty_config_id: string
          min_points?: number
          multiplier?: number
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          loyalty_config_id?: string
          min_points?: number
          multiplier?: number
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_loyalty_config_id_fkey"
            columns: ["loyalty_config_id"]
            isOneToOne: false
            referencedRelation: "loyalty_config"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          adjustment_reason_id: string | null
          balance_after: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          organization_id: string
          points_change: number
          reason: string
          transaction_id: string | null
        }
        Insert: {
          adjustment_reason_id?: string | null
          balance_after: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          organization_id: string
          points_change: number
          reason: string
          transaction_id?: string | null
        }
        Update: {
          adjustment_reason_id?: string | null
          balance_after?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          organization_id?: string
          points_change?: number
          reason?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_adjustment_reason_id_fkey"
            columns: ["adjustment_reason_id"]
            isOneToOne: false
            referencedRelation: "loyalty_adjustment_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      online_order_lines: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          tax_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total: number
          order_id: string
          product_id: string
          quantity?: number
          tax_amount?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          quantity?: number
          tax_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      online_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          converted_transaction_id: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_driver_id: string | null
          delivery_fee: number
          delivery_vehicle_id: string | null
          delivery_zone_id: string | null
          discount_amount: number
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          location_id: string
          notes: string | null
          order_number: number
          order_type: string
          scheduled_time: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          converted_transaction_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_driver_id?: string | null
          delivery_fee?: number
          delivery_vehicle_id?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          location_id: string
          notes?: string | null
          order_number?: never
          order_type?: string
          scheduled_time?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          converted_transaction_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_driver_id?: string | null
          delivery_fee?: number
          delivery_vehicle_id?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          order_number?: never
          order_type?: string
          scheduled_time?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_converted_transaction_id_fkey"
            columns: ["converted_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          legal_name: string
          logo_url: string | null
          name: string
          primary_contact_email: string | null
          primary_contact_phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name: string
          logo_url?: string | null
          name: string
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name?: string
          logo_url?: string | null
          name?: string
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permission_definitions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          sub_category: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sub_category: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sub_category?: string
        }
        Relationships: []
      }
      permission_group_permissions: {
        Row: {
          permission_group_id: string
          permission_id: string
        }
        Insert: {
          permission_group_id: string
          permission_id: string
        }
        Update: {
          permission_group_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_group_permissions_permission_group_id_fkey"
            columns: ["permission_group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_group_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permission_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_default: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          multiplier: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          available_for: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          master_category: string | null
          name: string
          organization_id: string
          parent_id: string | null
          purchase_limit_category: string | null
          regulatory_category: string | null
          slug: string
          sort_order: number
          tax_category: string
          updated_at: string
        }
        Insert: {
          available_for?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          master_category?: string | null
          name: string
          organization_id: string
          parent_id?: string | null
          purchase_limit_category?: string | null
          regulatory_category?: string | null
          slug: string
          sort_order?: number
          tax_category?: string
          updated_at?: string
        }
        Update: {
          available_for?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          master_category?: string | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          purchase_limit_category?: string | null
          regulatory_category?: string | null
          slug?: string
          sort_order?: number
          tax_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_label_settings: {
        Row: {
          auto_print: boolean
          created_at: string
          customer_type: string
          id: string
          label_template_id: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          auto_print?: boolean
          created_at?: string
          customer_type: string
          id?: string
          label_template_id?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          auto_print?: boolean
          created_at?: string
          customer_type?: string
          id?: string
          label_template_id?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_label_template"
            columns: ["label_template_id"]
            isOneToOne: false
            referencedRelation: "label_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_label_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          administration_method: string | null
          barcode: string | null
          biotrack_inventory_type: number | null
          biotrack_product_name: string | null
          brand_id: string | null
          category_id: string
          cbd_content_mg: number | null
          cbd_percentage: number | null
          cost_price: number | null
          created_at: string
          deactivated_at: string | null
          default_unit: string
          description: string | null
          external_category: string | null
          flower_equivalent: number | null
          grams_concentration: number | null
          gross_weight_grams: number | null
          id: string
          is_active: boolean
          is_cannabis: boolean
          is_on_sale: boolean
          is_taxable: boolean
          med_price: number | null
          name: string
          net_weight: number | null
          net_weight_unit: string | null
          online_description: string | null
          online_description_long: string | null
          online_title: string | null
          organization_id: string
          package_size: number | null
          product_type: string
          rec_price: number
          regulatory_category: string | null
          requires_medical_card: boolean
          sku: string | null
          slug: string
          strain_id: string | null
          strain_type: string | null
          thc_content_mg: number | null
          thc_percentage: number | null
          unit_cbd_dose: number | null
          unit_thc_dose: number | null
          updated_at: string
          vendor_id: string | null
          weight_grams: number | null
        }
        Insert: {
          administration_method?: string | null
          barcode?: string | null
          biotrack_inventory_type?: number | null
          biotrack_product_name?: string | null
          brand_id?: string | null
          category_id: string
          cbd_content_mg?: number | null
          cbd_percentage?: number | null
          cost_price?: number | null
          created_at?: string
          deactivated_at?: string | null
          default_unit?: string
          description?: string | null
          external_category?: string | null
          flower_equivalent?: number | null
          grams_concentration?: number | null
          gross_weight_grams?: number | null
          id?: string
          is_active?: boolean
          is_cannabis?: boolean
          is_on_sale?: boolean
          is_taxable?: boolean
          med_price?: number | null
          name: string
          net_weight?: number | null
          net_weight_unit?: string | null
          online_description?: string | null
          online_description_long?: string | null
          online_title?: string | null
          organization_id: string
          package_size?: number | null
          product_type?: string
          rec_price?: number
          regulatory_category?: string | null
          requires_medical_card?: boolean
          sku?: string | null
          slug: string
          strain_id?: string | null
          strain_type?: string | null
          thc_content_mg?: number | null
          thc_percentage?: number | null
          unit_cbd_dose?: number | null
          unit_thc_dose?: number | null
          updated_at?: string
          vendor_id?: string | null
          weight_grams?: number | null
        }
        Update: {
          administration_method?: string | null
          barcode?: string | null
          biotrack_inventory_type?: number | null
          biotrack_product_name?: string | null
          brand_id?: string | null
          category_id?: string
          cbd_content_mg?: number | null
          cbd_percentage?: number | null
          cost_price?: number | null
          created_at?: string
          deactivated_at?: string | null
          default_unit?: string
          description?: string | null
          external_category?: string | null
          flower_equivalent?: number | null
          grams_concentration?: number | null
          gross_weight_grams?: number | null
          id?: string
          is_active?: boolean
          is_cannabis?: boolean
          is_on_sale?: boolean
          is_taxable?: boolean
          med_price?: number | null
          name?: string
          net_weight?: number | null
          net_weight_unit?: string | null
          online_description?: string | null
          online_description_long?: string | null
          online_title?: string | null
          organization_id?: string
          package_size?: number | null
          product_type?: string
          rec_price?: number
          regulatory_category?: string | null
          requires_medical_card?: boolean
          sku?: string | null
          slug?: string
          strain_id?: string | null
          strain_type?: string | null
          thc_content_mg?: number | null
          thc_percentage?: number | null
          unit_cbd_dose?: number | null
          unit_thc_dose?: number | null
          updated_at?: string
          vendor_id?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_limits: {
        Row: {
          category_id: string | null
          created_at: string
          customer_type: string
          id: string
          is_active: boolean
          location_id: string
          max_amount: number
          time_period: string
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          customer_type?: string
          id?: string
          is_active?: boolean
          location_id: string
          max_amount: number
          time_period?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          customer_type?: string
          id?: string
          is_active?: boolean
          location_id?: string
          max_amount?: number
          time_period?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_limits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_limits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_config: {
        Row: {
          additional_config: Json
          config_type: string
          created_at: string
          email_from: string | null
          footer_config: Json
          header_config: Json
          id: string
          line_item_config: Json
          location_id: string
          logo_url: string | null
          qr_config: Json
          updated_at: string
        }
        Insert: {
          additional_config?: Json
          config_type: string
          created_at?: string
          email_from?: string | null
          footer_config?: Json
          header_config?: Json
          id?: string
          line_item_config?: Json
          location_id: string
          logo_url?: string | null
          qr_config?: Json
          updated_at?: string
        }
        Update: {
          additional_config?: Json
          config_type?: string
          created_at?: string
          email_from?: string | null
          footer_config?: Json
          header_config?: Json
          id?: string
          line_item_config?: Json
          location_id?: string
          logo_url?: string | null
          qr_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_config_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          referee_reward_points: number
          referrer_reward_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          referee_reward_points?: number
          referrer_reward_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          referee_reward_points?: number
          referrer_reward_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tracking: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          referee_customer_id: string
          referrer_customer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          referee_customer_id: string
          referrer_customer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          referee_customer_id?: string
          referrer_customer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tracking_referee_customer_id_fkey"
            columns: ["referee_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tracking_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      register_rooms: {
        Row: {
          register_id: string
          room_id: string
        }
        Insert: {
          register_id: string
          room_id: string
        }
        Update: {
          register_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "register_rooms_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "register_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      registers: {
        Row: {
          auto_print_labels: boolean
          auto_print_receipts: boolean
          created_at: string
          hide_from_pos: boolean
          id: string
          is_active: boolean
          is_vault: boolean
          location_id: string
          name: string
          show_notes: boolean
          updated_at: string
        }
        Insert: {
          auto_print_labels?: boolean
          auto_print_receipts?: boolean
          created_at?: string
          hide_from_pos?: boolean
          id?: string
          is_active?: boolean
          is_vault?: boolean
          location_id: string
          name: string
          show_notes?: boolean
          updated_at?: string
        }
        Update: {
          auto_print_labels?: boolean
          auto_print_receipts?: boolean
          created_at?: string
          hide_from_pos?: boolean
          id?: string
          is_active?: boolean
          is_vault?: boolean
          location_id?: string
          name?: string
          show_notes?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          email_body: string | null
          email_subject: string
          frequency: string
          id: string
          is_active: boolean
          location_id: string | null
          organization_id: string
          recipients: string[]
          report_params: Json
          report_type: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_body?: string | null
          email_subject: string
          frequency: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          organization_id: string
          recipients?: string[]
          report_params?: Json
          report_type: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_body?: string | null
          email_subject?: string
          frequency?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          organization_id?: string
          recipients?: string[]
          report_params?: Json
          report_type?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          accessible_by_menu: boolean
          created_at: string
          external_id: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          room_area: number | null
          room_area_unit: string | null
          room_purpose: string | null
          room_types: string[]
          updated_at: string
        }
        Insert: {
          accessible_by_menu?: boolean
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          room_area?: number | null
          room_area_unit?: string | null
          room_purpose?: string | null
          room_types?: string[]
          updated_at?: string
        }
        Update: {
          accessible_by_menu?: boolean
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          room_area?: number | null
          room_area_unit?: string | null
          room_purpose?: string | null
          room_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          rules: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          rules?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      strains: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          strain_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          strain_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          strain_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subrooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subrooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          tag_type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          tag_type?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          tag_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          applies_to: string
          created_at: string
          effective_date: string
          id: string
          is_active: boolean
          is_excise: boolean
          is_included_in_price: boolean
          location_id: string
          name: string
          rate_percent: number
          tax_category_id: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          is_excise?: boolean
          is_included_in_price?: boolean
          location_id: string
          name: string
          rate_percent: number
          tax_category_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          is_excise?: boolean
          is_included_in_price?: boolean
          location_id?: string
          name?: string
          rate_percent?: number
          tax_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_tax_category_id_fkey"
            columns: ["tax_category_id"]
            isOneToOne: false
            referencedRelation: "tax_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          location_id: string
          notes: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          location_id: string
          notes?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_discounts: {
        Row: {
          applied_by: string | null
          created_at: string
          discount_amount: number
          discount_id: string | null
          discount_name: string
          id: string
          transaction_id: string
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          discount_amount: number
          discount_id?: string | null
          discount_name: string
          id?: string
          transaction_id: string
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          discount_amount?: number
          discount_id?: string | null
          discount_name?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_discounts_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_discounts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_lines: {
        Row: {
          biotrack_barcode: string | null
          category_name: string | null
          created_at: string
          discount_amount: number
          flower_equivalent_grams: number | null
          id: string
          inventory_item_id: string | null
          is_cannabis: boolean
          is_medical: boolean
          line_total: number
          product_id: string
          product_name: string
          quantity: number
          tax_amount: number
          transaction_id: string
          unit_price: number
          weight_grams: number | null
        }
        Insert: {
          biotrack_barcode?: string | null
          category_name?: string | null
          created_at?: string
          discount_amount?: number
          flower_equivalent_grams?: number | null
          id?: string
          inventory_item_id?: string | null
          is_cannabis?: boolean
          is_medical?: boolean
          line_total: number
          product_id: string
          product_name: string
          quantity?: number
          tax_amount?: number
          transaction_id: string
          unit_price: number
          weight_grams?: number | null
        }
        Update: {
          biotrack_barcode?: string | null
          category_name?: string | null
          created_at?: string
          discount_amount?: number
          flower_equivalent_grams?: number | null
          id?: string
          inventory_item_id?: string | null
          is_cannabis?: boolean
          is_medical?: boolean
          line_total?: number
          product_id?: string
          product_name?: string
          quantity?: number
          tax_amount?: number
          transaction_id?: string
          unit_price?: number
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_payments: {
        Row: {
          amount: number
          cash_back: number | null
          change_given: number | null
          created_at: string
          id: string
          payment_method: string
          reference_number: string | null
          tendered: number | null
          transaction_id: string
        }
        Insert: {
          amount: number
          cash_back?: number | null
          change_given?: number | null
          created_at?: string
          id?: string
          payment_method: string
          reference_number?: string | null
          tendered?: number | null
          transaction_id: string
        }
        Update: {
          amount?: number
          cash_back?: number | null
          change_given?: number | null
          created_at?: string
          id?: string
          payment_method?: string
          reference_number?: string | null
          tendered?: number | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_taxes: {
        Row: {
          created_at: string
          id: string
          is_excise: boolean
          tax_amount: number
          tax_name: string
          tax_rate: number
          taxable_amount: number
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_excise?: boolean
          tax_amount: number
          tax_name: string
          tax_rate: number
          taxable_amount: number
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_excise?: boolean
          tax_amount?: number
          tax_name?: string
          tax_rate?: number
          taxable_amount?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_taxes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          biotrack_sync_error: string | null
          biotrack_synced: boolean
          biotrack_synced_at: string | null
          biotrack_transaction_id: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          employee_id: string
          id: string
          is_medical: boolean
          location_id: string
          notes: string | null
          original_transaction_id: string | null
          receipt_printed: boolean
          register_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
          transaction_number: number
          transaction_type: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          biotrack_sync_error?: string | null
          biotrack_synced?: boolean
          biotrack_synced_at?: string | null
          biotrack_transaction_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          employee_id: string
          id?: string
          is_medical?: boolean
          location_id: string
          notes?: string | null
          original_transaction_id?: string | null
          receipt_printed?: boolean
          register_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          transaction_number?: never
          transaction_type: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          biotrack_sync_error?: string | null
          biotrack_synced?: boolean
          biotrack_synced_at?: string | null
          biotrack_transaction_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          employee_id?: string
          id?: string
          is_medical?: boolean
          location_id?: string
          notes?: string | null
          original_transaction_id?: string | null
          receipt_printed?: boolean
          register_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          transaction_number?: never
          transaction_type?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_groups: {
        Row: {
          created_at: string
          employee_id: string
          permission_group_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          permission_group_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          permission_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_groups_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_groups_permission_group_id_fkey"
            columns: ["permission_group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_number: string | null
          name: string
          organization_id: string
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          name: string
          organization_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          status: string
          steps: Json
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          status?: string
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
