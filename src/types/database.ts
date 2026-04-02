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
      adjustment_reasons: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_reasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      badges: {
        Row: {
          assignment_method: string
          color: string
          created_at: string
          deactivated_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          segment_id: string | null
          show_in_register: boolean
          updated_at: string
        }
        Insert: {
          assignment_method?: string
          color?: string
          created_at?: string
          deactivated_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          segment_id?: string | null
          show_in_register?: boolean
          updated_at?: string
        }
        Update: {
          assignment_method?: string
          color?: string
          created_at?: string
          deactivated_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          segment_id?: string | null
          show_in_register?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      biotrack_config: {
        Row: {
          biotrack_location_id: string | null
          created_at: string
          default_labs_in_receive: boolean
          display_approval_date: boolean
          enable_deliveries: boolean
          id: string
          is_enabled: boolean
          location_id: string
          password_encrypted: string | null
          report_discounted_prices: boolean
          rest_api_url: string | null
          schedule_returns_for_destruction: boolean
          state_code: string
          ubi: string | null
          updated_at: string
          use_allotment_check: boolean
          use_lab_data: boolean
          use_other_plant_material: boolean
          use_training_mode: boolean
          username_encrypted: string | null
          xml_api_url: string | null
        }
        Insert: {
          biotrack_location_id?: string | null
          created_at?: string
          default_labs_in_receive?: boolean
          display_approval_date?: boolean
          enable_deliveries?: boolean
          id?: string
          is_enabled?: boolean
          location_id: string
          password_encrypted?: string | null
          report_discounted_prices?: boolean
          rest_api_url?: string | null
          schedule_returns_for_destruction?: boolean
          state_code?: string
          ubi?: string | null
          updated_at?: string
          use_allotment_check?: boolean
          use_lab_data?: boolean
          use_other_plant_material?: boolean
          use_training_mode?: boolean
          username_encrypted?: string | null
          xml_api_url?: string | null
        }
        Update: {
          biotrack_location_id?: string | null
          created_at?: string
          default_labs_in_receive?: boolean
          display_approval_date?: boolean
          enable_deliveries?: boolean
          id?: string
          is_enabled?: boolean
          location_id?: string
          password_encrypted?: string | null
          report_discounted_prices?: boolean
          rest_api_url?: string | null
          schedule_returns_for_destruction?: boolean
          state_code?: string
          ubi?: string | null
          updated_at?: string
          use_allotment_check?: boolean
          use_lab_data?: boolean
          use_other_plant_material?: boolean
          use_training_mode?: boolean
          username_encrypted?: string | null
          xml_api_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biotrack_config_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      biotrack_destruction_queue: {
        Row: {
          biotrack_id: string
          created_at: string
          destroyed_at: string | null
          eligible_on: string | null
          id: string
          inventory_item_id: string | null
          item_type: string
          location_id: string
          quantity: number
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          biotrack_id: string
          created_at?: string
          destroyed_at?: string | null
          eligible_on?: string | null
          id?: string
          inventory_item_id?: string | null
          item_type: string
          location_id: string
          quantity: number
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          biotrack_id?: string
          created_at?: string
          destroyed_at?: string | null
          eligible_on?: string | null
          id?: string
          inventory_item_id?: string | null
          item_type?: string
          location_id?: string
          quantity?: number
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biotrack_destruction_queue_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biotrack_destruction_queue_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      campaign_analytics: {
        Row: {
          campaign_id: string
          click_rate: number | null
          created_at: string
          delivery_rate: number | null
          id: string
          open_rate: number | null
          snapshot_at: string
          total_carts_created: number
          total_clicked: number
          total_delivered: number
          total_failed: number
          total_opened: number
          total_orders_placed: number
          total_recipients: number
          total_revenue: number
          total_unsubscribes: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          click_rate?: number | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          open_rate?: number | null
          snapshot_at?: string
          total_carts_created?: number
          total_clicked?: number
          total_delivered?: number
          total_failed?: number
          total_opened?: number
          total_orders_placed?: number
          total_recipients?: number
          total_revenue?: number
          total_unsubscribes?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          click_rate?: number | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          open_rate?: number | null
          snapshot_at?: string
          total_carts_created?: number
          total_clicked?: number
          total_delivered?: number
          total_failed?: number
          total_opened?: number
          total_orders_placed?: number
          total_recipients?: number
          total_revenue?: number
          total_unsubscribes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          id: string
          opened_at: string | null
          revenue_attributed: number
          sent_at: string | null
          status: string
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          id?: string
          opened_at?: string | null
          revenue_attributed?: number
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          id?: string
          opened_at?: string | null
          revenue_attributed?: number
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          preview_text: string | null
          segment_ids: string[]
          send_complete_date: string | null
          send_date: string | null
          sender_email: string | null
          sending_count: number
          smart_sending: boolean
          status: string
          subject: string | null
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
          preview_text?: string | null
          segment_ids?: string[]
          send_complete_date?: string | null
          send_date?: string | null
          sender_email?: string | null
          sending_count?: number
          smart_sending?: boolean
          status?: string
          subject?: string | null
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
          preview_text?: string | null
          segment_ids?: string[]
          send_complete_date?: string | null
          send_date?: string | null
          sender_email?: string | null
          sending_count?: number
          smart_sending?: boolean
          status?: string
          subject?: string | null
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
          adjustment_reason: string | null
          amount: number
          created_at: string
          drawer_id: string
          drop_type: string
          employee_id: string
          id: string
          notes: string | null
          reason_id: string | null
        }
        Insert: {
          adjustment_reason?: string | null
          amount: number
          created_at?: string
          drawer_id: string
          drop_type: string
          employee_id: string
          id?: string
          notes?: string | null
          reason_id?: string | null
        }
        Update: {
          adjustment_reason?: string | null
          amount?: number
          created_at?: string
          drawer_id?: string
          drop_type?: string
          employee_id?: string
          id?: string
          notes?: string | null
          reason_id?: string | null
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
      customer_badges: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          badge_id: string
          customer_id: string
          id: string
          notes: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          badge_id: string
          customer_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          badge_id?: string
          customer_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_badges_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_badges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_doctors: {
        Row: {
          created_at: string
          customer_id: string
          doctor_id: string
          id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          doctor_id: string
          id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          doctor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_doctors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_doctors_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
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
          loyalty_tier_id: string | null
          member_count: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          loyalty_tier_id?: string | null
          member_count?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          loyalty_tier_id?: string | null
          member_count?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_groups_loyalty_tier_id_fkey"
            columns: ["loyalty_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merge_history: {
        Row: {
          created_at: string
          field_overrides: Json | null
          groups_moved: number | null
          id: string
          loser_id: string
          loyalty_points_moved: number | null
          merged_by: string
          organization_id: string
          transactions_moved: number | null
          winner_id: string
        }
        Insert: {
          created_at?: string
          field_overrides?: Json | null
          groups_moved?: number | null
          id?: string
          loser_id: string
          loyalty_points_moved?: number | null
          merged_by: string
          organization_id: string
          transactions_moved?: number | null
          winner_id: string
        }
        Update: {
          created_at?: string
          field_overrides?: Json | null
          groups_moved?: number | null
          id?: string
          loser_id?: string
          loyalty_points_moved?: number | null
          merged_by?: string
          organization_id?: string
          transactions_moved?: number | null
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_merge_history_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_history_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_history_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_qualifying_conditions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          qualifying_condition_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          qualifying_condition_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          qualifying_condition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_qualifying_conditions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_qualifying_conditions_qualifying_condition_id_fkey"
            columns: ["qualifying_condition_id"]
            isOneToOne: false
            referencedRelation: "qualifying_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          allotment_overridden: boolean | null
          ban_reason: string | null
          caregiver_info: Json | null
          city: string | null
          created_at: string
          created_at_location_id: string | null
          custom_identifier: string | null
          customer_type: string
          date_of_birth: string | null
          deactivated_at: string | null
          doctor_id: string | null
          drivers_license: string | null
          drivers_license_expiration: string | null
          dutchie_customer_id: number | null
          email: string | null
          external_code: string | null
          external_name: string | null
          first_name: string | null
          gender: string | null
          id: string
          id_expiration: string | null
          id_number_hash: string | null
          id_start_date: string | null
          id_state: string | null
          id_type: string | null
          is_active: boolean | null
          is_anonymous: boolean | null
          is_medical: boolean
          last_name: string | null
          last_visit_at: string | null
          lifetime_spend: number
          medical_card_expiration: string | null
          medical_card_number: string | null
          medical_provider: string | null
          middle_name: string | null
          mobile_phone: string | null
          nickname: string | null
          notes: string | null
          opted_into_loyalty: boolean | null
          opted_into_marketing: boolean
          opted_into_push: boolean | null
          opted_into_sms: boolean | null
          organization_id: string
          other_referral_source: string | null
          patient_certification: string | null
          phone: string | null
          preferred_contact_method: string | null
          prefix: string | null
          prescription_date: string | null
          prescription_electronic: boolean | null
          prescription_expiration_date: string | null
          prescription_notes: string | null
          prescription_product: string | null
          prescription_quantity: number | null
          prescription_rx_number: string | null
          prescription_unit: string | null
          pronoun: string | null
          referral_source: string | null
          springbig_member_id: string | null
          state: string | null
          status: string
          suffix: string | null
          tribal_affiliation: string | null
          updated_at: string
          visit_count: number
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          allotment_overridden?: boolean | null
          ban_reason?: string | null
          caregiver_info?: Json | null
          city?: string | null
          created_at?: string
          created_at_location_id?: string | null
          custom_identifier?: string | null
          customer_type?: string
          date_of_birth?: string | null
          deactivated_at?: string | null
          doctor_id?: string | null
          drivers_license?: string | null
          drivers_license_expiration?: string | null
          dutchie_customer_id?: number | null
          email?: string | null
          external_code?: string | null
          external_name?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          id_expiration?: string | null
          id_number_hash?: string | null
          id_start_date?: string | null
          id_state?: string | null
          id_type?: string | null
          is_active?: boolean | null
          is_anonymous?: boolean | null
          is_medical?: boolean
          last_name?: string | null
          last_visit_at?: string | null
          lifetime_spend?: number
          medical_card_expiration?: string | null
          medical_card_number?: string | null
          medical_provider?: string | null
          middle_name?: string | null
          mobile_phone?: string | null
          nickname?: string | null
          notes?: string | null
          opted_into_loyalty?: boolean | null
          opted_into_marketing?: boolean
          opted_into_push?: boolean | null
          opted_into_sms?: boolean | null
          organization_id: string
          other_referral_source?: string | null
          patient_certification?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          prefix?: string | null
          prescription_date?: string | null
          prescription_electronic?: boolean | null
          prescription_expiration_date?: string | null
          prescription_notes?: string | null
          prescription_product?: string | null
          prescription_quantity?: number | null
          prescription_rx_number?: string | null
          prescription_unit?: string | null
          pronoun?: string | null
          referral_source?: string | null
          springbig_member_id?: string | null
          state?: string | null
          status?: string
          suffix?: string | null
          tribal_affiliation?: string | null
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          allotment_overridden?: boolean | null
          ban_reason?: string | null
          caregiver_info?: Json | null
          city?: string | null
          created_at?: string
          created_at_location_id?: string | null
          custom_identifier?: string | null
          customer_type?: string
          date_of_birth?: string | null
          deactivated_at?: string | null
          doctor_id?: string | null
          drivers_license?: string | null
          drivers_license_expiration?: string | null
          dutchie_customer_id?: number | null
          email?: string | null
          external_code?: string | null
          external_name?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          id_expiration?: string | null
          id_number_hash?: string | null
          id_start_date?: string | null
          id_state?: string | null
          id_type?: string | null
          is_active?: boolean | null
          is_anonymous?: boolean | null
          is_medical?: boolean
          last_name?: string | null
          last_visit_at?: string | null
          lifetime_spend?: number
          medical_card_expiration?: string | null
          medical_card_number?: string | null
          medical_provider?: string | null
          middle_name?: string | null
          mobile_phone?: string | null
          nickname?: string | null
          notes?: string | null
          opted_into_loyalty?: boolean | null
          opted_into_marketing?: boolean
          opted_into_push?: boolean | null
          opted_into_sms?: boolean | null
          organization_id?: string
          other_referral_source?: string | null
          patient_certification?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          prefix?: string | null
          prescription_date?: string | null
          prescription_electronic?: boolean | null
          prescription_expiration_date?: string | null
          prescription_notes?: string | null
          prescription_product?: string | null
          prescription_quantity?: number | null
          prescription_rx_number?: string | null
          prescription_unit?: string | null
          pronoun?: string | null
          referral_source?: string | null
          springbig_member_id?: string | null
          state?: string | null
          status?: string
          suffix?: string | null
          tribal_affiliation?: string | null
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_at_location_id_fkey"
            columns: ["created_at_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
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
          recurrence_end_time: string | null
          recurrence_start_time: string | null
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
          recurrence_end_time?: string | null
          recurrence_start_time?: string | null
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
          recurrence_end_time?: string | null
          recurrence_start_time?: string | null
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
      doctors: {
        Row: {
          created_at: string
          deactivated_at: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          license_number: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          license_number?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          license_number?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dosage_presets: {
        Row: {
          cbd_mg: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          serving_size: string | null
          thc_mg: number | null
        }
        Insert: {
          cbd_mg?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          serving_size?: string | null
          thc_mg?: number | null
        }
        Update: {
          cbd_mg?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          serving_size?: string | null
          thc_mg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dosage_presets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dutchie_locations: {
        Row: {
          api_key: string
          created_at: string | null
          dutchie_location_id: number | null
          dutchie_location_name: string | null
          id: string
          is_active: boolean | null
          last_connected_at: string | null
          last_error: string | null
          last_sync_at: string | null
          location_id: string | null
          location_name: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          dutchie_location_id?: number | null
          dutchie_location_name?: string | null
          id?: string
          is_active?: boolean | null
          last_connected_at?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          location_id?: string | null
          location_name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          dutchie_location_id?: number | null
          dutchie_location_name?: string | null
          id?: string
          is_active?: boolean | null
          last_connected_at?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          location_id?: string | null
          location_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dutchie_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      dutchie_sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customers_created: number | null
          customers_fetched: number | null
          customers_skipped_dupes: number | null
          customers_updated: number | null
          error_count: number | null
          errors: Json | null
          id: string
          inventory_created: number | null
          inventory_fetched: number | null
          job_type: string
          location_id: string | null
          lookups_created: Json | null
          products_created: number | null
          products_fetched: number | null
          products_updated: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customers_created?: number | null
          customers_fetched?: number | null
          customers_skipped_dupes?: number | null
          customers_updated?: number | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          inventory_created?: number | null
          inventory_fetched?: number | null
          job_type: string
          location_id?: string | null
          lookups_created?: Json | null
          products_created?: number | null
          products_fetched?: number | null
          products_updated?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customers_created?: number | null
          customers_fetched?: number | null
          customers_skipped_dupes?: number | null
          customers_updated?: number | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          inventory_created?: number | null
          inventory_fetched?: number | null
          job_type?: string
          location_id?: string | null
          lookups_created?: Json | null
          products_created?: number | null
          products_fetched?: number | null
          products_updated?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dutchie_sync_jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          preferences: Json
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
          preferences?: Json
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
          preferences?: Json
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
      guestlist_entries: {
        Row: {
          called_at: string | null
          cancelled_at: string | null
          checked_in_at: string
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_type: string | null
          employee_id: string | null
          id: string
          location_id: string
          notes: string | null
          online_order_id: string | null
          party_size: number
          position: number
          register_id: string | null
          source: string
          started_at: string | null
          status_id: string
          updated_at: string
        }
        Insert: {
          called_at?: string | null
          cancelled_at?: string | null
          checked_in_at?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_type?: string | null
          employee_id?: string | null
          id?: string
          location_id: string
          notes?: string | null
          online_order_id?: string | null
          party_size?: number
          position?: number
          register_id?: string | null
          source?: string
          started_at?: string | null
          status_id: string
          updated_at?: string
        }
        Update: {
          called_at?: string | null
          cancelled_at?: string | null
          checked_in_at?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_type?: string | null
          employee_id?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          online_order_id?: string | null
          party_size?: number
          position?: number
          register_id?: string | null
          source?: string
          started_at?: string | null
          status_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_online_order_id_fkey"
            columns: ["online_order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "guestlist_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      guestlist_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          location_id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_statuses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_items: {
        Row: {
          audit_id: string
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string | null
          discrepancy: number | null
          expected_quantity: number
          id: string
          inventory_item_id: string
          notes: string | null
          product_id: string | null
        }
        Insert: {
          audit_id: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          discrepancy?: number | null
          expected_quantity?: number
          id?: string
          inventory_item_id: string
          notes?: string | null
          product_id?: string | null
        }
        Update: {
          audit_id?: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          discrepancy?: number | null
          expected_quantity?: number
          id?: string
          inventory_item_id?: string
          notes?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audits: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string
          name: string
          notes: string | null
          organization_id: string
          scope_categories: string[] | null
          scope_rooms: string[] | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id: string
          name: string
          notes?: string | null
          organization_id: string
          scope_categories?: string[] | null
          scope_rooms?: string[] | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          scope_categories?: string[] | null
          scope_rooms?: string[] | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          available_for: string[] | null
          batch_id: string | null
          biotrack_barcode: string | null
          cbd_percentage: number | null
          cost_per_unit: number | null
          created_at: string
          deactivated_at: string | null
          deactivation_reason: string | null
          expiration_date: string | null
          external_package_id: string | null
          flower_equivalent_grams: number | null
          gross_weight: number | null
          hold_reason: string | null
          id: string
          inventory_status: string | null
          is_active: boolean
          is_on_hold: boolean | null
          lab_test_date: string | null
          lab_test_results: Json | null
          location_id: string
          lot_number: string | null
          med_price: number | null
          organization_id: string | null
          package_ndc: string | null
          packaging_date: string | null
          producer_id: string | null
          product_id: string
          quantity: number
          quantity_reserved: number
          rec_price: number | null
          received_at: string | null
          received_by: string | null
          room_id: string | null
          source_batch_id: string | null
          strain_id: string | null
          subroom_id: string | null
          testing_status: string | null
          thc_percentage: number | null
          updated_at: string
          vendor_id: string | null
          weight: number | null
        }
        Insert: {
          available_for?: string[] | null
          batch_id?: string | null
          biotrack_barcode?: string | null
          cbd_percentage?: number | null
          cost_per_unit?: number | null
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          expiration_date?: string | null
          external_package_id?: string | null
          flower_equivalent_grams?: number | null
          gross_weight?: number | null
          hold_reason?: string | null
          id?: string
          inventory_status?: string | null
          is_active?: boolean
          is_on_hold?: boolean | null
          lab_test_date?: string | null
          lab_test_results?: Json | null
          location_id: string
          lot_number?: string | null
          med_price?: number | null
          organization_id?: string | null
          package_ndc?: string | null
          packaging_date?: string | null
          producer_id?: string | null
          product_id: string
          quantity?: number
          quantity_reserved?: number
          rec_price?: number | null
          received_at?: string | null
          received_by?: string | null
          room_id?: string | null
          source_batch_id?: string | null
          strain_id?: string | null
          subroom_id?: string | null
          testing_status?: string | null
          thc_percentage?: number | null
          updated_at?: string
          vendor_id?: string | null
          weight?: number | null
        }
        Update: {
          available_for?: string[] | null
          batch_id?: string | null
          biotrack_barcode?: string | null
          cbd_percentage?: number | null
          cost_per_unit?: number | null
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          expiration_date?: string | null
          external_package_id?: string | null
          flower_equivalent_grams?: number | null
          gross_weight?: number | null
          hold_reason?: string | null
          id?: string
          inventory_status?: string | null
          is_active?: boolean
          is_on_hold?: boolean | null
          lab_test_date?: string | null
          lab_test_results?: Json | null
          location_id?: string
          lot_number?: string | null
          med_price?: number | null
          organization_id?: string | null
          package_ndc?: string | null
          packaging_date?: string | null
          producer_id?: string | null
          product_id?: string
          quantity?: number
          quantity_reserved?: number
          rec_price?: number | null
          received_at?: string | null
          received_by?: string | null
          room_id?: string | null
          source_batch_id?: string | null
          strain_id?: string | null
          subroom_id?: string | null
          testing_status?: string | null
          thc_percentage?: number | null
          updated_at?: string
          vendor_id?: string | null
          weight?: number | null
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
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
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
            foreignKeyName: "inventory_items_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
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
      inventory_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      label_images: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          image_url: string
          name: string | null
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          image_url: string
          name?: string | null
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          image_url?: string
          name?: string | null
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
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
      manifest_items: {
        Row: {
          accepted_quantity: number | null
          batch: string | null
          brand: string | null
          created_at: string
          description: string
          discount: number
          discrepancy_reason: string | null
          id: string
          inventory_item_id: string | null
          manifest_id: string
          package_id: string | null
          product_id: string | null
          quantity: number
          sku: string | null
          sort_order: number
          subtotal: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          accepted_quantity?: number | null
          batch?: string | null
          brand?: string | null
          created_at?: string
          description: string
          discount?: number
          discrepancy_reason?: string | null
          id?: string
          inventory_item_id?: string | null
          manifest_id: string
          package_id?: string | null
          product_id?: string | null
          quantity: number
          sku?: string | null
          sort_order?: number
          subtotal?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          accepted_quantity?: number | null
          batch?: string | null
          brand?: string | null
          created_at?: string
          description?: string
          discount?: number
          discrepancy_reason?: string | null
          id?: string
          inventory_item_id?: string | null
          manifest_id?: string
          package_id?: string | null
          product_id?: string | null
          quantity?: number
          sku?: string | null
          sort_order?: number
          subtotal?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manifest_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_items_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      manifests: {
        Row: {
          biotrack_manifest_id: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          created_date: string
          credits: number
          customer_name: string | null
          destination_location_id: string | null
          direction: string
          discounts: number
          driver_id: string | null
          driver_name: string | null
          id: string
          is_active: boolean
          last_modified_date: string
          license_number: string | null
          manifest_number: number
          notes: Json | null
          organization_id: string
          pickup: boolean
          point_of_contact: string | null
          source_location_id: string | null
          status: string
          stop_number_on_route: number | null
          subtotal: number
          tab: string
          taxes: number
          title: string
          total: number
          total_stops_on_route: number | null
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          biotrack_manifest_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          created_date?: string
          credits?: number
          customer_name?: string | null
          destination_location_id?: string | null
          direction?: string
          discounts?: number
          driver_id?: string | null
          driver_name?: string | null
          id?: string
          is_active?: boolean
          last_modified_date?: string
          license_number?: string | null
          manifest_number?: number
          notes?: Json | null
          organization_id: string
          pickup?: boolean
          point_of_contact?: string | null
          source_location_id?: string | null
          status?: string
          stop_number_on_route?: number | null
          subtotal?: number
          tab?: string
          taxes?: number
          title: string
          total?: number
          total_stops_on_route?: number | null
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          biotrack_manifest_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          created_date?: string
          credits?: number
          customer_name?: string | null
          destination_location_id?: string | null
          direction?: string
          discounts?: number
          driver_id?: string | null
          driver_name?: string | null
          id?: string
          is_active?: boolean
          last_modified_date?: string
          license_number?: string | null
          manifest_number?: number
          notes?: Json | null
          organization_id?: string
          pickup?: boolean
          point_of_contact?: string | null
          source_location_id?: string | null
          status?: string
          stop_number_on_route?: number | null
          subtotal?: number
          tab?: string
          taxes?: number
          title?: string
          total?: number
          total_stops_on_route?: number | null
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      order_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_sources_location_id_fkey"
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
      pricing_tier_groups: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tier_groups_organization_id_fkey"
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
          group_id: string | null
          id: string
          is_active: boolean
          multiplier: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      print_service_config: {
        Row: {
          account_email: string | null
          api_key_encrypted: string | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          service_type: string
          updated_at: string
        }
        Insert: {
          account_email?: string | null
          api_key_encrypted?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          service_type?: string
          updated_at?: string
        }
        Update: {
          account_email?: string | null
          api_key_encrypted?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_service_config_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          id: string
          is_default: boolean
          printer_id: string
          register_id: string
        }
        Insert: {
          assignment_type: string
          created_at?: string
          id?: string
          is_default?: boolean
          printer_id: string
          register_id: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          id?: string
          is_default?: boolean
          printer_id?: string
          register_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "printer_assignments_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_assignments_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          computer_name: string | null
          connection_type: string
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          location_id: string
          name: string
          port: number | null
          printer_id: string | null
          printer_type: string
          supports_labels: boolean
          supports_receipts: boolean
          updated_at: string
        }
        Insert: {
          computer_name?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          location_id: string
          name: string
          port?: number | null
          printer_id?: string | null
          printer_type?: string
          supports_labels?: boolean
          supports_receipts?: boolean
          updated_at?: string
        }
        Update: {
          computer_name?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          location_id?: string
          name?: string
          port?: number | null
          printer_id?: string | null
          printer_type?: string
          supports_labels?: boolean
          supports_receipts?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          license_number: string | null
          name: string
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producers_organization_id_fkey"
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
          default_flower_equivalent: number | null
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
          default_flower_equivalent?: number | null
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
          default_flower_equivalent?: number | null
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
      product_kit_items: {
        Row: {
          created_at: string | null
          id: string
          kit_id: string
          product_id: string
          quantity: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kit_id: string
          product_id: string
          quantity?: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kit_id?: string
          product_id?: string
          quantity?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "product_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_kits: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          price: number | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          price?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          price?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_kits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          allergens: string | null
          allow_automatic_discounts: boolean | null
          alternate_name: string | null
          available_for: string | null
          available_on_pos: boolean | null
          available_online: boolean | null
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
          dosage: string | null
          dutchie_product_id: number | null
          ecom_category: string | null
          ecom_subcategory: string | null
          effects: string[] | null
          external_category: string | null
          external_sub_category: string | null
          flavor: string | null
          flower_equivalent: number | null
          grams_concentration: number | null
          gross_weight_grams: number | null
          id: string
          ingredients: string | null
          instructions: string | null
          is_active: boolean
          is_cannabis: boolean
          is_coupon: boolean | null
          is_on_sale: boolean
          is_taxable: boolean
          max_per_transaction: number | null
          med_price: number | null
          name: string
          net_weight: number | null
          net_weight_unit: string | null
          oil_volume: number | null
          online_description: string | null
          online_description_long: string | null
          online_title: string | null
          organization_id: string
          package_size: number | null
          producer: string | null
          producer_id: string | null
          product_type: string
          rec_price: number
          regulatory_category: string | null
          requires_medical_card: boolean
          sale_price: number | null
          serving_size: string | null
          serving_size_per_unit: number | null
          size: string | null
          sku: string | null
          slug: string
          standard_allergens: Json | null
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
          allergens?: string | null
          allow_automatic_discounts?: boolean | null
          alternate_name?: string | null
          available_for?: string | null
          available_on_pos?: boolean | null
          available_online?: boolean | null
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
          dosage?: string | null
          dutchie_product_id?: number | null
          ecom_category?: string | null
          ecom_subcategory?: string | null
          effects?: string[] | null
          external_category?: string | null
          external_sub_category?: string | null
          flavor?: string | null
          flower_equivalent?: number | null
          grams_concentration?: number | null
          gross_weight_grams?: number | null
          id?: string
          ingredients?: string | null
          instructions?: string | null
          is_active?: boolean
          is_cannabis?: boolean
          is_coupon?: boolean | null
          is_on_sale?: boolean
          is_taxable?: boolean
          max_per_transaction?: number | null
          med_price?: number | null
          name: string
          net_weight?: number | null
          net_weight_unit?: string | null
          oil_volume?: number | null
          online_description?: string | null
          online_description_long?: string | null
          online_title?: string | null
          organization_id: string
          package_size?: number | null
          producer?: string | null
          producer_id?: string | null
          product_type?: string
          rec_price?: number
          regulatory_category?: string | null
          requires_medical_card?: boolean
          sale_price?: number | null
          serving_size?: string | null
          serving_size_per_unit?: number | null
          size?: string | null
          sku?: string | null
          slug: string
          standard_allergens?: Json | null
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
          allergens?: string | null
          allow_automatic_discounts?: boolean | null
          alternate_name?: string | null
          available_for?: string | null
          available_on_pos?: boolean | null
          available_online?: boolean | null
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
          dosage?: string | null
          dutchie_product_id?: number | null
          ecom_category?: string | null
          ecom_subcategory?: string | null
          effects?: string[] | null
          external_category?: string | null
          external_sub_category?: string | null
          flavor?: string | null
          flower_equivalent?: number | null
          grams_concentration?: number | null
          gross_weight_grams?: number | null
          id?: string
          ingredients?: string | null
          instructions?: string | null
          is_active?: boolean
          is_cannabis?: boolean
          is_coupon?: boolean | null
          is_on_sale?: boolean
          is_taxable?: boolean
          max_per_transaction?: number | null
          med_price?: number | null
          name?: string
          net_weight?: number | null
          net_weight_unit?: string | null
          oil_volume?: number | null
          online_description?: string | null
          online_description_long?: string | null
          online_title?: string | null
          organization_id?: string
          package_size?: number | null
          producer?: string | null
          producer_id?: string | null
          product_type?: string
          rec_price?: number
          regulatory_category?: string | null
          requires_medical_card?: boolean
          sale_price?: number | null
          serving_size?: string | null
          serving_size_per_unit?: number | null
          size?: string | null
          sku?: string | null
          slug?: string
          standard_allergens?: Json | null
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
            foreignKeyName: "products_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
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
          calendar_days: number
          category_id: string | null
          created_at: string
          customer_type: string
          cycle_days: number | null
          id: string
          is_active: boolean
          limit_type: string | null
          location_id: string
          max_amount: number
          time_period: string
          unit: string
          updated_at: string
        }
        Insert: {
          calendar_days?: number
          category_id?: string | null
          created_at?: string
          customer_type?: string
          cycle_days?: number | null
          id?: string
          is_active?: boolean
          limit_type?: string | null
          location_id: string
          max_amount: number
          time_period?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          calendar_days?: number
          category_id?: string | null
          created_at?: string
          customer_type?: string
          cycle_days?: number | null
          id?: string
          is_active?: boolean
          limit_type?: string | null
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
      purchase_order_lines: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          po_number: string
          status: string
          submitted_at: string | null
          total_cost: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          po_number: string
          status?: string
          submitted_at?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          po_number?: string
          status?: string
          submitted_at?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifying_conditions: {
        Row: {
          created_at: string
          deactivated_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifying_conditions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      reconciliation_reports: {
        Row: {
          auto_resolved: number
          created_at: string
          details: Json
          id: string
          items_biotrack_only: number
          items_local_only: number
          items_matched: number
          items_with_discrepancy: number
          location_id: string
          needs_review: number
          organization_id: string
          run_at: string
          run_by: string | null
          status: string
        }
        Insert: {
          auto_resolved?: number
          created_at?: string
          details?: Json
          id?: string
          items_biotrack_only?: number
          items_local_only?: number
          items_matched?: number
          items_with_discrepancy?: number
          location_id: string
          needs_review?: number
          organization_id: string
          run_at?: string
          run_by?: string | null
          status?: string
        }
        Update: {
          auto_resolved?: number
          created_at?: string
          details?: Json
          id?: string
          items_biotrack_only?: number
          items_local_only?: number
          items_matched?: number
          items_with_discrepancy?: number
          location_id?: string
          needs_review?: number
          organization_id?: string
          run_at?: string
          run_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_reports_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_reports_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "employees"
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
          badge_color: string | null
          badge_icon: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          rules: Json
          show_in_register: boolean | null
          updated_at: string
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          rules?: Json
          show_in_register?: boolean | null
          updated_at?: string
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          rules?: Json
          show_in_register?: boolean | null
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
      smart_tag_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          organization_id: string
          rules: Json
          tag_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          organization_id: string
          rules?: Json
          tag_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          organization_id?: string
          rules?: Json
          tag_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_tag_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_tag_rules_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      strains: {
        Row: {
          abbreviation: string | null
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
          abbreviation?: string | null
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
          abbreviation?: string | null
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
          flat_amount: number | null
          id: string
          is_active: boolean
          is_arms_length: boolean
          is_excise: boolean
          is_included_in_price: boolean
          location_id: string
          name: string
          rate_percent: number
          rate_type: string
          tax_category_id: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          effective_date?: string
          flat_amount?: number | null
          id?: string
          is_active?: boolean
          is_arms_length?: boolean
          is_excise?: boolean
          is_included_in_price?: boolean
          location_id: string
          name: string
          rate_percent: number
          rate_type?: string
          tax_category_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          effective_date?: string
          flat_amount?: number | null
          id?: string
          is_active?: boolean
          is_arms_length?: boolean
          is_excise?: boolean
          is_included_in_price?: boolean
          location_id?: string
          name?: string
          rate_percent?: number
          rate_type?: string
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
          break_end: string | null
          break_minutes: number | null
          break_start: string | null
          clock_in: string
          clock_out: string | null
          created_at: string
          edit_reason: string | null
          edited_by: string | null
          employee_id: string
          id: string
          is_overtime: boolean
          location_id: string
          notes: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_minutes?: number | null
          break_start?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          edit_reason?: string | null
          edited_by?: string | null
          employee_id: string
          id?: string
          is_overtime?: boolean
          location_id: string
          notes?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_minutes?: number | null
          break_start?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          edit_reason?: string | null
          edited_by?: string | null
          employee_id?: string
          id?: string
          is_overtime?: boolean
          location_id?: string
          notes?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_entries_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
          cost: number | null
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
          cost?: number | null
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
          cost?: number | null
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
      transaction_reasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          reason_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          reason_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          reason_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_reasons_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          cancel_reason_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          employee_id: string
          id: string
          is_medical: boolean
          location_id: string
          notes: string | null
          order_source: string | null
          original_transaction_id: string | null
          receipt_printed: boolean
          register_id: string | null
          return_reason_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
          transaction_number: number
          transaction_type: string
          updated_at: string
          void_reason: string | null
          void_reason_id: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          biotrack_sync_error?: string | null
          biotrack_synced?: boolean
          biotrack_synced_at?: string | null
          biotrack_transaction_id?: string | null
          cancel_reason_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          employee_id: string
          id?: string
          is_medical?: boolean
          location_id: string
          notes?: string | null
          order_source?: string | null
          original_transaction_id?: string | null
          receipt_printed?: boolean
          register_id?: string | null
          return_reason_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          transaction_number?: never
          transaction_type: string
          updated_at?: string
          void_reason?: string | null
          void_reason_id?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          biotrack_sync_error?: string | null
          biotrack_synced?: boolean
          biotrack_synced_at?: string | null
          biotrack_transaction_id?: string | null
          cancel_reason_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          employee_id?: string
          id?: string
          is_medical?: boolean
          location_id?: string
          notes?: string | null
          order_source?: string | null
          original_transaction_id?: string | null
          receipt_printed?: boolean
          register_id?: string | null
          return_reason_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          transaction_number?: never
          transaction_type?: string
          updated_at?: string
          void_reason?: string | null
          void_reason_id?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_cancel_reason_id_fkey"
            columns: ["cancel_reason_id"]
            isOneToOne: false
            referencedRelation: "transaction_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "transactions_return_reason_id_fkey"
            columns: ["return_reason_id"]
            isOneToOne: false
            referencedRelation: "transaction_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_void_reason_id_fkey"
            columns: ["void_reason_id"]
            isOneToOne: false
            referencedRelation: "transaction_reasons"
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
          abbreviation: string | null
          address: string | null
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
          postal_code: string | null
          state: string | null
          updated_at: string
          vendor_code: string | null
          zip: string | null
        }
        Insert: {
          abbreviation?: string | null
          address?: string | null
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
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          vendor_code?: string | null
          zip?: string | null
        }
        Update: {
          abbreviation?: string | null
          address?: string | null
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
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          vendor_code?: string | null
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
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          customer_id: string
          id: string
          started_at: string
          status: string
          step_results: Json
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          customer_id: string
          id?: string
          started_at?: string
          status?: string
          step_results?: Json
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          customer_id?: string
          id?: string
          started_at?: string
          status?: string
          step_results?: Json
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          segment_ids: string[]
          status: string
          steps: Json
          tag_ids: string[]
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          segment_ids?: string[]
          status?: string
          steps?: Json
          tag_ids?: string[]
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          segment_ids?: string[]
          status?: string
          steps?: Json
          tag_ids?: string[]
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
      create_return_transaction: {
        Args: {
          p_cash_drawer_id: string
          p_customer_id: string
          p_employee_id: string
          p_location_id: string
          p_organization_id: string
          p_original_transaction_id: string
          p_refund_amount: number
          p_register_id: string
          p_return_lines: Json
          p_return_reason: string
        }
        Returns: Json
      }
      create_sale_transaction: {
        Args: {
          p_cash_drawer_id: string
          p_customer_id: string
          p_discount_total: number
          p_discounts: Json
          p_employee_id: string
          p_is_medical: boolean
          p_lines: Json
          p_location_id: string
          p_loyalty_points?: number
          p_organization_id?: string
          p_payments: Json
          p_register_id: string
          p_subtotal: number
          p_tax_total: number
          p_taxes: Json
          p_total: number
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      void_transaction: {
        Args: {
          p_cash_drawer_id: string
          p_employee_id: string
          p_transaction_id: string
          p_void_reason: string
        }
        Returns: Json
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
