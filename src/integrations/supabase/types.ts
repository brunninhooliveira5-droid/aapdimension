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
      access_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          email_sent: boolean
          id: string
          is_dimension_client: boolean
          name: string
          observation: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          email_sent?: boolean
          id?: string
          is_dimension_client?: boolean
          name: string
          observation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          email_sent?: boolean
          id?: string
          is_dimension_client?: boolean
          name?: string
          observation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      access_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          pro_access: boolean
          sections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          pro_access?: boolean
          sections?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          pro_access?: boolean
          sections?: Json
          updated_at?: string
        }
        Relationships: []
      }
      account_invites: {
        Row: {
          accepted_at: string | null
          account_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invite_token: string | null
          name: string
          permissions: Json
          status: string
          suggested_role: Database["public"]["Enums"]["account_member_role"]
          whatsapp: string | null
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          name: string
          permissions?: Json
          status?: string
          suggested_role?: Database["public"]["Enums"]["account_member_role"]
          whatsapp?: string | null
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          name?: string
          permissions?: Json
          status?: string
          suggested_role?: Database["public"]["Enums"]["account_member_role"]
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_invites_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_members: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_active: boolean
          permissions: Json
          role: Database["public"]["Enums"]["account_member_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          role?: Database["public"]["Enums"]["account_member_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          role?: Database["public"]["Enums"]["account_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string | null
          id: string
          max_members: number
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_members?: number
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_members?: number
          name?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      bulletin_reads: {
        Row: {
          bulletin_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          bulletin_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          bulletin_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_reads_bulletin_id_fkey"
            columns: ["bulletin_id"]
            isOneToOne: false
            referencedRelation: "technical_bulletins"
            referencedColumns: ["id"]
          },
        ]
      }
      client_proposals: {
        Row: {
          base_price: number | null
          client_company: string | null
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string
          delivery_days: number | null
          description: string
          id: string
          included_items: Json
          model_id: string | null
          model_name: string
          notes: string | null
          optional_items: Json
          optional_total: number | null
          payment_conditions: string | null
          pdf_url: string | null
          status: string
          tech_specs: string
          total_price: number | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          base_price?: number | null
          client_company?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by: string
          delivery_days?: number | null
          description?: string
          id?: string
          included_items?: Json
          model_id?: string | null
          model_name?: string
          notes?: string | null
          optional_items?: Json
          optional_total?: number | null
          payment_conditions?: string | null
          pdf_url?: string | null
          status?: string
          tech_specs?: string
          total_price?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          base_price?: number | null
          client_company?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string
          delivery_days?: number | null
          description?: string
          id?: string
          included_items?: Json
          model_id?: string | null
          model_name?: string
          notes?: string | null
          optional_items?: Json
          optional_total?: number | null
          payment_conditions?: string | null
          pdf_url?: string | null
          status?: string
          tech_specs?: string
          total_price?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_proposals_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "proposal_machine_models"
            referencedColumns: ["id"]
          },
        ]
      }
      cnc_investments: {
        Row: {
          created_at: string
          depreciation_method: string
          depreciation_monthly: number
          depreciation_rate_year: number
          id: string
          invested_value: number
          machine_id: string | null
          machine_name: string
          purchase_date: string
          updated_at: string
          useful_life_months: number
          user_id: string
        }
        Insert: {
          created_at?: string
          depreciation_method?: string
          depreciation_monthly?: number
          depreciation_rate_year?: number
          id?: string
          invested_value?: number
          machine_id?: string | null
          machine_name?: string
          purchase_date?: string
          updated_at?: string
          useful_life_months?: number
          user_id: string
        }
        Update: {
          created_at?: string
          depreciation_method?: string
          depreciation_monthly?: number
          depreciation_rate_year?: number
          id?: string
          invested_value?: number
          machine_id?: string | null
          machine_name?: string
          purchase_date?: string
          updated_at?: string
          useful_life_months?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnc_investments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      cnc_services: {
        Row: {
          additional_costs: number
          client_name: string
          created_at: string
          id: string
          investment_id: string
          machine_cost: number
          material_cost: number
          notes: string
          origin: string
          profit: number
          quote_id: string | null
          revenue: number
          service_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_costs?: number
          client_name?: string
          created_at?: string
          id?: string
          investment_id: string
          machine_cost?: number
          material_cost?: number
          notes?: string
          origin?: string
          profit?: number
          quote_id?: string | null
          revenue?: number
          service_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_costs?: number
          client_name?: string
          created_at?: string
          id?: string
          investment_id?: string
          machine_cost?: number
          material_cost?: number
          notes?: string
          origin?: string
          profit?: number
          quote_id?: string | null
          revenue?: number
          service_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnc_services_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "cnc_investments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_files: {
        Row: {
          category_id: string
          created_at: string
          created_by: string
          description: string
          display_name: string
          file_name_original: string
          file_size: number
          file_url: string
          id: string
          mime_type: string
          published: boolean
          tags: string[] | null
          training_sector_id: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by: string
          description?: string
          display_name: string
          file_name_original: string
          file_size?: number
          file_url: string
          id?: string
          mime_type?: string
          published?: boolean
          tags?: string[] | null
          training_sector_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string
          description?: string
          display_name?: string
          file_name_original?: string
          file_size?: number
          file_url?: string
          id?: string
          mime_type?: string
          published?: boolean
          tags?: string[] | null
          training_sector_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_files_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "file_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_files_training_sector_id_fkey"
            columns: ["training_sector_id"]
            isOneToOne: false
            referencedRelation: "training_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      cutting_material_thicknesses: {
        Row: {
          created_at: string
          dimension_default_factor: number | null
          id: string
          is_dimension_preset: boolean
          label: string
          material_id: string
          sheet_height: number
          sheet_width: number
          speed_factor: number
          unit_price: number
          value: string
        }
        Insert: {
          created_at?: string
          dimension_default_factor?: number | null
          id?: string
          is_dimension_preset?: boolean
          label: string
          material_id: string
          sheet_height?: number
          sheet_width?: number
          speed_factor?: number
          unit_price?: number
          value: string
        }
        Update: {
          created_at?: string
          dimension_default_factor?: number | null
          id?: string
          is_dimension_preset?: boolean
          label?: string
          material_id?: string
          sheet_height?: number
          sheet_width?: number
          speed_factor?: number
          unit_price?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "cutting_material_thicknesses_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "cutting_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      cutting_materials: {
        Row: {
          created_at: string
          id: string
          name: string
          price_adjustment: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_adjustment?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_adjustment?: number
          user_id?: string
        }
        Relationships: []
      }
      cutting_plan_materials: {
        Row: {
          category: string
          created_at: string
          height: number
          id: string
          is_active: boolean
          length: number
          name: string
          observation: string | null
          unit_price: number
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          category?: string
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          length?: number
          name: string
          observation?: string | null
          unit_price?: number
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          category?: string
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          length?: number
          name?: string
          observation?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: []
      }
      cutting_plans: {
        Row: {
          client_name: string | null
          created_at: string
          estimated_cost: number
          execution_status: string
          id: string
          kerf_width: number
          material_dimensions: Json
          material_name: string
          material_source: string
          material_unit_price: number
          pieces: Json
          plan_name: string
          plan_type: string
          project_name: string | null
          result_json: Json
          units_needed: number
          user_id: string
          utilization_percent: number
          waste_area: number
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          estimated_cost?: number
          execution_status?: string
          id?: string
          kerf_width?: number
          material_dimensions?: Json
          material_name?: string
          material_source?: string
          material_unit_price?: number
          pieces?: Json
          plan_name: string
          plan_type?: string
          project_name?: string | null
          result_json?: Json
          units_needed?: number
          user_id: string
          utilization_percent?: number
          waste_area?: number
        }
        Update: {
          client_name?: string | null
          created_at?: string
          estimated_cost?: number
          execution_status?: string
          id?: string
          kerf_width?: number
          material_dimensions?: Json
          material_name?: string
          material_source?: string
          material_unit_price?: number
          pieces?: Json
          plan_name?: string
          plan_type?: string
          project_name?: string | null
          result_json?: Json
          units_needed?: number
          user_id?: string
          utilization_percent?: number
          waste_area?: number
        }
        Relationships: []
      }
      cutting_quotes: {
        Row: {
          base_speed_final_mmmin: number
          base_speed_origin: string
          client_name: string
          client_phone: string
          cost_per_minute: number
          created_at: string
          effective_cut_length_m: number
          effective_speed_mmmin: number
          estimated_cost: number
          estimated_time_min: number
          file_name: string
          file_path: string | null
          id: string
          machine_id: string | null
          machine_name: string
          material: string
          material_cost: number
          material_owner: string
          min_recommended: number
          notes: string
          passes_final: number
          passes_origin: string
          path_length_m: number
          path_length_mm: number
          payment_status: string
          pdf_url: string | null
          quantity: number
          service_value: number
          service_value_included: boolean
          speed_factor_used: number
          status: string
          suggested_sale: number
          thickness: string
          total_price: number
          use_dimension_materials: boolean
          use_master_pricing: boolean
          user_id: string
        }
        Insert: {
          base_speed_final_mmmin?: number
          base_speed_origin?: string
          client_name?: string
          client_phone?: string
          cost_per_minute?: number
          created_at?: string
          effective_cut_length_m?: number
          effective_speed_mmmin?: number
          estimated_cost?: number
          estimated_time_min?: number
          file_name: string
          file_path?: string | null
          id?: string
          machine_id?: string | null
          machine_name?: string
          material: string
          material_cost?: number
          material_owner?: string
          min_recommended?: number
          notes?: string
          passes_final?: number
          passes_origin?: string
          path_length_m?: number
          path_length_mm?: number
          payment_status?: string
          pdf_url?: string | null
          quantity?: number
          service_value?: number
          service_value_included?: boolean
          speed_factor_used?: number
          status?: string
          suggested_sale?: number
          thickness: string
          total_price?: number
          use_dimension_materials?: boolean
          use_master_pricing?: boolean
          user_id: string
        }
        Update: {
          base_speed_final_mmmin?: number
          base_speed_origin?: string
          client_name?: string
          client_phone?: string
          cost_per_minute?: number
          created_at?: string
          effective_cut_length_m?: number
          effective_speed_mmmin?: number
          estimated_cost?: number
          estimated_time_min?: number
          file_name?: string
          file_path?: string | null
          id?: string
          machine_id?: string | null
          machine_name?: string
          material?: string
          material_cost?: number
          material_owner?: string
          min_recommended?: number
          notes?: string
          passes_final?: number
          passes_origin?: string
          path_length_m?: number
          path_length_mm?: number
          payment_status?: string
          pdf_url?: string | null
          quantity?: number
          service_value?: number
          service_value_included?: boolean
          speed_factor_used?: number
          status?: string
          suggested_sale?: number
          thickness?: string
          total_price?: number
          use_dimension_materials?: boolean
          use_master_pricing?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cutting_quotes_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      cutting_scraps: {
        Row: {
          created_at: string
          height: number
          id: string
          length: number
          material_name: string
          notes: string
          origin_plan_id: string | null
          scrap_type: string
          status: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          length?: number
          material_name?: string
          notes?: string
          origin_plan_id?: string | null
          scrap_type?: string
          status?: string
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          length?: number
          material_name?: string
          notes?: string
          origin_plan_id?: string | null
          scrap_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "cutting_scraps_origin_plan_id_fkey"
            columns: ["origin_plan_id"]
            isOneToOne: false
            referencedRelation: "cutting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_templates: {
        Row: {
          allowed_roles: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_locked: boolean
          layout: Json
          name: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          layout?: Json
          name: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          layout?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      debts_client_delinquency: {
        Row: {
          client: string
          collection_action: string | null
          contact_info: string | null
          created_at: string
          created_by: string
          current_amount: number
          days_overdue: number
          description: string
          id: string
          notes: string | null
          original_amount: number
          original_due_date: string
          status: string
          updated_at: string
        }
        Insert: {
          client: string
          collection_action?: string | null
          contact_info?: string | null
          created_at?: string
          created_by: string
          current_amount?: number
          days_overdue?: number
          description?: string
          id?: string
          notes?: string | null
          original_amount?: number
          original_due_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          client?: string
          collection_action?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string
          current_amount?: number
          days_overdue?: number
          description?: string
          id?: string
          notes?: string | null
          original_amount?: number
          original_due_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      debts_loans: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          created_by: string
          creditor: string
          description: string
          end_date: string | null
          id: string
          installments_paid: number
          installments_total: number
          interest_rate: number
          loan_type: string
          monthly_payment: number
          next_due_date: string | null
          notes: string | null
          outstanding_balance: number
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by: string
          creditor: string
          description?: string
          end_date?: string | null
          id?: string
          installments_paid?: number
          installments_total?: number
          interest_rate?: number
          loan_type?: string
          monthly_payment?: number
          next_due_date?: string | null
          notes?: string | null
          outstanding_balance?: number
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string
          creditor?: string
          description?: string
          end_date?: string | null
          id?: string
          installments_paid?: number
          installments_total?: number
          interest_rate?: number
          loan_type?: string
          monthly_payment?: number
          next_due_date?: string | null
          notes?: string | null
          outstanding_balance?: number
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      dimension_contract_items: {
        Row: {
          contract_id: string
          created_at: string
          description: string
          id: string
          quantity: number
          sort_order: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sort_order?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sort_order?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dimension_contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "dimension_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_contract_pdf_settings: {
        Row: {
          accent_color: string
          company_address: string
          company_cnpj: string
          company_email: string
          company_name: string
          company_phone: string
          created_at: string
          footer_text: string
          id: string
          institutional_text: string
          logo_url: string
          primary_color: string
          show_watermark: boolean
          signature_url: string
          signer_name: string
          signer_role: string
          updated_at: string
          user_id: string
          watermark_image_url: string
          watermark_opacity: number
          watermark_position: string
          watermark_text: string
        }
        Insert: {
          accent_color?: string
          company_address?: string
          company_cnpj?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          created_at?: string
          footer_text?: string
          id?: string
          institutional_text?: string
          logo_url?: string
          primary_color?: string
          show_watermark?: boolean
          signature_url?: string
          signer_name?: string
          signer_role?: string
          updated_at?: string
          user_id: string
          watermark_image_url?: string
          watermark_opacity?: number
          watermark_position?: string
          watermark_text?: string
        }
        Update: {
          accent_color?: string
          company_address?: string
          company_cnpj?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          created_at?: string
          footer_text?: string
          id?: string
          institutional_text?: string
          logo_url?: string
          primary_color?: string
          show_watermark?: boolean
          signature_url?: string
          signer_name?: string
          signer_role?: string
          updated_at?: string
          user_id?: string
          watermark_image_url?: string
          watermark_opacity?: number
          watermark_position?: string
          watermark_text?: string
        }
        Relationships: []
      }
      dimension_contracts: {
        Row: {
          clauses: string
          client_address: string
          client_document: string
          client_email: string
          client_name: string
          client_phone: string
          client_responsible: string
          closing_date: string
          commercial_conditions: string
          contract_number: number
          created_at: string
          created_by: string
          general_notes: string
          id: string
          issue_date: string
          machine_description: string
          machine_included_items: Json
          machine_model: string
          machine_optional_items: Json
          machine_specs: string
          payment_balance: number
          payment_entry: number
          payment_installments: string
          payment_method: string
          payment_notes: string
          specs_snapshot: Json
          status: string
          total_value: number
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          clauses?: string
          client_address?: string
          client_document?: string
          client_email?: string
          client_name?: string
          client_phone?: string
          client_responsible?: string
          closing_date?: string
          commercial_conditions?: string
          contract_number?: number
          created_at?: string
          created_by: string
          general_notes?: string
          id?: string
          issue_date?: string
          machine_description?: string
          machine_included_items?: Json
          machine_model?: string
          machine_optional_items?: Json
          machine_specs?: string
          payment_balance?: number
          payment_entry?: number
          payment_installments?: string
          payment_method?: string
          payment_notes?: string
          specs_snapshot?: Json
          status?: string
          total_value?: number
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          clauses?: string
          client_address?: string
          client_document?: string
          client_email?: string
          client_name?: string
          client_phone?: string
          client_responsible?: string
          closing_date?: string
          commercial_conditions?: string
          contract_number?: number
          created_at?: string
          created_by?: string
          general_notes?: string
          id?: string
          issue_date?: string
          machine_description?: string
          machine_included_items?: Json
          machine_model?: string
          machine_optional_items?: Json
          machine_specs?: string
          payment_balance?: number
          payment_entry?: number
          payment_installments?: string
          payment_method?: string
          payment_notes?: string
          specs_snapshot?: Json
          status?: string
          total_value?: number
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: []
      }
      dimension_cutting_material_thicknesses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          material_id: string
          sheet_height: number
          sheet_width: number
          speed_factor: number
          unit_price: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          material_id: string
          sheet_height?: number
          sheet_width?: number
          speed_factor?: number
          unit_price?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          material_id?: string
          sheet_height?: number
          sheet_width?: number
          speed_factor?: number
          unit_price?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_cutting_material_thicknesses_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "dimension_cutting_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_cutting_materials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_adjustment: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_adjustment?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_adjustment?: number
          updated_at?: string
        }
        Relationships: []
      }
      dimension_equipment: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          image_url: string | null
          link: string | null
          name: string
          pdf_admin_url: string | null
          pdf_url: string | null
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          image_url?: string | null
          link?: string | null
          name: string
          pdf_admin_url?: string | null
          pdf_url?: string | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          image_url?: string | null
          link?: string | null
          name?: string
          pdf_admin_url?: string | null
          pdf_url?: string | null
          status?: string
        }
        Relationships: []
      }
      dimension_goal_history: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          snapshot_date: string
          value: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          snapshot_date?: string
          value?: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          snapshot_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "dimension_goal_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "dimension_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_goals: {
        Row: {
          created_at: string
          created_by: string
          current_value: number
          description: string
          goal_type: string
          id: string
          linked_task_category: string | null
          linked_task_sector: string | null
          period_end: string
          period_start: string
          period_type: string
          responsible: string
          sector: string | null
          status: string
          target_value: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_value?: number
          description?: string
          goal_type?: string
          id?: string
          linked_task_category?: string | null
          linked_task_sector?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          responsible?: string
          sector?: string | null
          status?: string
          target_value?: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_value?: number
          description?: string
          goal_type?: string
          id?: string
          linked_task_category?: string | null
          linked_task_sector?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          responsible?: string
          sector?: string | null
          status?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimension_pendencies: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          priority: string
          resolved_at: string | null
          responsible: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          responsible?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          responsible?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimension_production_cards: {
        Row: {
          id: string
          image_url: string | null
          key: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          key: string
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          key?: string
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      dimension_production_items: {
        Row: {
          client_name: string
          created_at: string
          created_by: string
          estimated_deadline: string | null
          id: string
          machine_name: string
          notes: string
          priority: string
          project_name: string
          responsible: string
          status: string
          updated_at: string
        }
        Insert: {
          client_name?: string
          created_at?: string
          created_by: string
          estimated_deadline?: string | null
          id?: string
          machine_name?: string
          notes?: string
          priority?: string
          project_name: string
          responsible?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string
          estimated_deadline?: string | null
          id?: string
          machine_name?: string
          notes?: string
          priority?: string
          project_name?: string
          responsible?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimension_routine_activations: {
        Row: {
          activated_at: string
          activated_by: string
          context_data: Json
          id: string
          routine_id: string
          tasks_created: number
        }
        Insert: {
          activated_at?: string
          activated_by: string
          context_data?: Json
          id?: string
          routine_id: string
          tasks_created?: number
        }
        Update: {
          activated_at?: string
          activated_by?: string
          context_data?: Json
          id?: string
          routine_id?: string
          tasks_created?: number
        }
        Relationships: [
          {
            foreignKeyName: "dimension_routine_activations_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "dimension_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_routine_template_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          routine_id: string
          task_index: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          routine_id: string
          task_index: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          routine_id?: string
          task_index?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_routine_template_files_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "dimension_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_routines: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          is_active: boolean
          tasks_template: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          is_active?: boolean
          tasks_template?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_active?: boolean
          tasks_template?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimension_schedule_events: {
        Row: {
          created_at: string
          created_by: string
          description: string
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          responsible: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          responsible?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          responsible?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimension_task_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "dimension_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          priority: string
          responsible: string
          sector: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          responsible?: string
          sector?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          responsible?: string
          sector?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_access_passwords: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_accounts_payable: {
        Row: {
          amount: number
          attachment_name: string | null
          attachment_url: string | null
          category_id: string | null
          cost_center: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          installment_number: number | null
          is_recurring: boolean
          notes: string | null
          parent_id: string | null
          payment_date: string | null
          payment_method: string | null
          recurrence_period: string | null
          status: string
          supplier: string
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          category_id?: string | null
          cost_center?: string | null
          created_at?: string
          created_by: string
          description?: string
          due_date: string
          id?: string
          installment_number?: number | null
          is_recurring?: boolean
          notes?: string | null
          parent_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence_period?: string | null
          status?: string
          supplier: string
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          category_id?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          is_recurring?: boolean
          notes?: string | null
          parent_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence_period?: string | null
          status?: string
          supplier?: string
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_payable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_accounts_payable_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts_payable"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts_receivable: {
        Row: {
          amount: number
          attachment_name: string | null
          attachment_url: string | null
          category_id: string | null
          client: string
          created_at: string
          created_by: string
          description: string
          expected_date: string
          id: string
          installment_number: number | null
          notes: string | null
          parent_id: string | null
          receipt_method: string | null
          received_date: string | null
          status: string
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          category_id?: string | null
          client: string
          created_at?: string
          created_by: string
          description?: string
          expected_date: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          parent_id?: string | null
          receipt_method?: string | null
          received_date?: string | null
          status?: string
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          category_id?: string | null
          client?: string
          created_at?: string
          created_by?: string
          description?: string
          expected_date?: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          parent_id?: string | null
          receipt_method?: string | null
          received_date?: string | null
          status?: string
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_receivable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_accounts_receivable_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_fixed_expenses: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          due_day: number
          id: string
          is_active: boolean
          monthly_value: number
          name: string
          notes: string | null
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          due_day?: number
          id?: string
          is_active?: boolean
          monthly_value?: number
          name: string
          notes?: string | null
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          due_day?: number
          id?: string
          is_active?: boolean
          monthly_value?: number
          name?: string
          notes?: string | null
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_fixed_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_simulator_settings: {
        Row: {
          created_at: string
          id: string
          max_installments: number
          minimum_cash_reserve: number
          projection_horizon_months: number
          safe_commitment_limit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_installments?: number
          minimum_cash_reserve?: number
          projection_horizon_months?: number
          safe_commitment_limit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_installments?: number
          minimum_cash_reserve?: number
          projection_horizon_months?: number
          safe_commitment_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_summary: {
        Row: {
          id: string
          next_due_date: string | null
          total_contracted: number
          total_open: number
          total_overdue: number
          total_paid: number
          user_id: string
        }
        Insert: {
          id?: string
          next_due_date?: string | null
          total_contracted?: number
          total_open?: number
          total_overdue?: number
          total_paid?: number
          user_id: string
        }
        Update: {
          id?: string
          next_due_date?: string | null
          total_contracted?: number
          total_open?: number
          total_overdue?: number
          total_paid?: number
          user_id?: string
        }
        Relationships: []
      }
      impersonation_logs: {
        Row: {
          admin_id: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          target_user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_user_id?: string
        }
        Relationships: []
      }
      inventory_access_passwords: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          item_id: string
          message: string
          resolved_at: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          item_id: string
          message?: string
          resolved_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string
          message?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_calibration_logs: {
        Row: {
          calibrated_by: string
          created_at: string
          difference: number
          id: string
          item_id: string
          new_quantity: number
          old_quantity: number
          reason: string
        }
        Insert: {
          calibrated_by: string
          created_at?: string
          difference?: number
          id?: string
          item_id: string
          new_quantity?: number
          old_quantity?: number
          reason?: string
        }
        Update: {
          calibrated_by?: string
          created_at?: string
          difference?: number
          id?: string
          item_id?: string
          new_quantity?: number
          old_quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_calibration_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          item_id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          item_id: string
          mime_type?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          item_id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          avg_cost: number
          category_id: string | null
          compatible_with: string[]
          created_at: string
          created_by: string
          current_quantity: number
          id: string
          ideal_quantity: number
          image_url: string | null
          internal_code: string
          is_active: boolean
          item_type: string
          last_cost: number
          location_id: string | null
          min_quantity: number
          name: string
          reserved_quantity: number
          subcategory: string
          supplier_id: string | null
          unit_cost: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          category_id?: string | null
          compatible_with?: string[]
          created_at?: string
          created_by: string
          current_quantity?: number
          id?: string
          ideal_quantity?: number
          image_url?: string | null
          internal_code?: string
          is_active?: boolean
          item_type?: string
          last_cost?: number
          location_id?: string | null
          min_quantity?: number
          name: string
          reserved_quantity?: number
          subcategory?: string
          supplier_id?: string | null
          unit_cost?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          category_id?: string | null
          compatible_with?: string[]
          created_at?: string
          created_by?: string
          current_quantity?: number
          id?: string
          ideal_quantity?: number
          image_url?: string | null
          internal_code?: string
          is_active?: boolean
          item_type?: string
          last_cost?: number
          location_id?: string | null
          min_quantity?: number
          name?: string
          reserved_quantity?: number
          subcategory?: string
          supplier_id?: string | null
          unit_cost?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          destination: string
          id: string
          invoice_name: string | null
          invoice_url: string | null
          item_id: string
          linked_machine: string
          linked_project: string
          movement_type: string
          notes: string
          quantity: number
          reason: string
          supplier_id: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by: string
          destination?: string
          id?: string
          invoice_name?: string | null
          invoice_url?: string | null
          item_id: string
          linked_machine?: string
          linked_project?: string
          movement_type?: string
          notes?: string
          quantity?: number
          reason?: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          destination?: string
          id?: string
          invoice_name?: string | null
          invoice_url?: string | null
          item_id?: string
          linked_machine?: string
          linked_project?: string
          movement_type?: string
          notes?: string
          quantity?: number
          reason?: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          consumed_at: string | null
          created_at: string
          id: string
          item_id: string
          linked_machine: string
          linked_order: string
          linked_sheet_id: string | null
          notes: string
          quantity: number
          reserved_by: string
          status: string
          updated_at: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          id?: string
          item_id: string
          linked_machine?: string
          linked_order?: string
          linked_sheet_id?: string | null
          notes?: string
          quantity?: number
          reserved_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string
          linked_machine?: string
          linked_order?: string
          linked_sheet_id?: string | null
          notes?: string
          quantity?: number
          reserved_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_session_items: {
        Row: {
          actual_quantity: number | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          difference: number | null
          expected_quantity: number
          id: string
          item_id: string
          notes: string
          session_id: string
        }
        Insert: {
          actual_quantity?: number | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          difference?: number | null
          expected_quantity?: number
          id?: string
          item_id: string
          notes?: string
          session_id: string
        }
        Update: {
          actual_quantity?: number | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          difference?: number | null
          expected_quantity?: number
          id?: string
          item_id?: string
          notes?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_session_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inventory_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          notes: string
          started_by: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string
          started_by: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string
          started_by?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_settings: {
        Row: {
          allow_negative_stock: boolean
          compatible_options: string[] | null
          consumption_period_days: number
          global_min_alert: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_negative_stock?: boolean
          compatible_options?: string[] | null
          consumption_period_days?: number
          global_min_alert?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_negative_stock?: boolean
          compatible_options?: string[] | null
          consumption_period_days?: number
          global_min_alert?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      inventory_suppliers: {
        Row: {
          avg_delivery_days: number
          contact_name: string
          created_at: string
          created_by: string
          email: string
          id: string
          is_active: boolean
          name: string
          notes: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          avg_delivery_days?: number
          contact_name?: string
          created_at?: string
          created_by: string
          email?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          avg_delivery_days?: number
          contact_name?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      inventory_units: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      invoice_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          invoice_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          invoice_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          invoice_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment: number
          payment_date: string | null
          status: string
          total_installments: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment: number
          payment_date?: string | null
          status?: string
          total_installments: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment?: number
          payment_date?: string | null
          status?: string
          total_installments?: number
          user_id?: string
        }
        Relationships: []
      }
      legal_cases: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          case_number: string
          case_type: string
          counterparty: string
          court: string | null
          created_at: string
          created_by: string
          description: string
          estimated_value: number
          filed_date: string
          id: string
          lawyer: string | null
          next_hearing_date: string | null
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          case_number?: string
          case_type?: string
          counterparty: string
          court?: string | null
          created_at?: string
          created_by: string
          description?: string
          estimated_value?: number
          filed_date?: string
          id?: string
          lawyer?: string | null
          next_hearing_date?: string | null
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          case_number?: string
          case_type?: string
          counterparty?: string
          court?: string | null
          created_at?: string
          created_by?: string
          description?: string
          estimated_value?: number
          filed_date?: string
          id?: string
          lawyer?: string | null
          next_hearing_date?: string | null
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_collections: {
        Row: {
          amount: number
          attachment_name: string | null
          attachment_url: string | null
          collection_type: string
          created_at: string
          created_by: string
          debtor: string
          description: string
          id: string
          notes: string | null
          original_due_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          collection_type?: string
          created_at?: string
          created_by: string
          debtor: string
          description?: string
          id?: string
          notes?: string | null
          original_due_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          collection_type?: string
          created_at?: string
          created_by?: string
          debtor?: string
          description?: string
          id?: string
          notes?: string | null
          original_due_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_contracts: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          contract_type: string
          counterparty: string
          created_at: string
          created_by: string
          description: string
          end_date: string | null
          id: string
          notes: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          contract_type?: string
          counterparty: string
          created_at?: string
          created_by: string
          description?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          contract_type?: string
          counterparty?: string
          created_at?: string
          created_by?: string
          description?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      machine_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          machine_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          machine_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          machine_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_files_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_specs: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          spec_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          spec_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          spec_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_specs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: true
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_trainings: {
        Row: {
          created_at: string
          created_by: string
          description: string
          file_name: string | null
          file_path: string | null
          id: string
          machine_id: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          machine_id: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          machine_id?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_trainings_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          accessories: string[] | null
          category: string
          created_at: string
          id: string
          image_path: string | null
          install_date: string
          model: string
          name: string
          operational_status: string
          operational_status_updated_at: string | null
          operational_status_updated_by: string | null
          origin_type: string
          owner_id: string
          serial_number: string
          status: string
        }
        Insert: {
          accessories?: string[] | null
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          install_date?: string
          model: string
          name?: string
          operational_status?: string
          operational_status_updated_at?: string | null
          operational_status_updated_by?: string | null
          origin_type?: string
          owner_id: string
          serial_number: string
          status?: string
        }
        Update: {
          accessories?: string[] | null
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          install_date?: string
          model?: string
          name?: string
          operational_status?: string
          operational_status_updated_at?: string | null
          operational_status_updated_by?: string | null
          origin_type?: string
          owner_id?: string
          serial_number?: string
          status?: string
        }
        Relationships: []
      }
      maintenance_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          maintenance_id: string
          report: string
          report_date: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          maintenance_id: string
          report?: string
          report_date?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          maintenance_id?: string
          report?: string
          report_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reports_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenances: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          notes: string | null
          report: string | null
          scheduled_date: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          notes?: string | null
          report?: string | null
          scheduled_date: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          notes?: string | null
          report?: string | null
          scheduled_date?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          id: string
          page_path: string
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          page_path: string
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          page_path?: string
          user_id?: string
          visited_at?: string
        }
        Relationships: []
      }
      parts_stores: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          url?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          current_installment: number
          id: string
          party_name: string
          payment_date: string
          payment_method: string
          payment_type: string
          proposal_id: string
          receipt_id: string | null
          status: string
          total_installments: number
          user_id: string
        }
        Insert: {
          amount?: number
          contract_id?: string
          created_at?: string
          current_installment?: number
          id?: string
          party_name?: string
          payment_date?: string
          payment_method?: string
          payment_type?: string
          proposal_id?: string
          receipt_id?: string | null
          status?: string
          total_installments?: number
          user_id: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          current_installment?: number
          id?: string
          party_name?: string
          payment_date?: string
          payment_method?: string
          payment_type?: string
          proposal_id?: string
          receipt_id?: string | null
          status?: string
          total_installments?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          base_text: string
          commercial_notes: string
          complement_deadline: string
          contract_id: string
          created_at: string
          current_installment: number
          description: string
          doc_subtype: string
          enable_pix_qr: boolean
          id: string
          installment_due_date: string | null
          installment_status: string
          machine_id: string
          observations: string
          party_address: string
          party_document: string
          party_email: string
          party_name: string
          party_phone: string
          payment_method: string
          pix_beneficiary: string
          pix_key: string
          proposal_id: string
          receipt_date: string
          receipt_number: number
          receipt_type: string
          reference_type: string
          related_contract: string
          remaining_balance: number
          require_party_signature: boolean
          service_id: string
          status: string
          template_type: string
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          base_text?: string
          commercial_notes?: string
          complement_deadline?: string
          contract_id?: string
          created_at?: string
          current_installment?: number
          description?: string
          doc_subtype?: string
          enable_pix_qr?: boolean
          id?: string
          installment_due_date?: string | null
          installment_status?: string
          machine_id?: string
          observations?: string
          party_address?: string
          party_document?: string
          party_email?: string
          party_name?: string
          party_phone?: string
          payment_method?: string
          pix_beneficiary?: string
          pix_key?: string
          proposal_id?: string
          receipt_date?: string
          receipt_number?: number
          receipt_type?: string
          reference_type?: string
          related_contract?: string
          remaining_balance?: number
          require_party_signature?: boolean
          service_id?: string
          status?: string
          template_type?: string
          total_installments?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          base_text?: string
          commercial_notes?: string
          complement_deadline?: string
          contract_id?: string
          created_at?: string
          current_installment?: number
          description?: string
          doc_subtype?: string
          enable_pix_qr?: boolean
          id?: string
          installment_due_date?: string | null
          installment_status?: string
          machine_id?: string
          observations?: string
          party_address?: string
          party_document?: string
          party_email?: string
          party_name?: string
          party_phone?: string
          payment_method?: string
          pix_beneficiary?: string
          pix_key?: string
          proposal_id?: string
          receipt_date?: string
          receipt_number?: number
          receipt_type?: string
          reference_type?: string
          related_contract?: string
          remaining_balance?: number
          require_party_signature?: boolean
          service_id?: string
          status?: string
          template_type?: string
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pc_goal_history: {
        Row: {
          created_at: string | null
          goal_id: string
          id: string
          snapshot_date: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          goal_id: string
          id?: string
          snapshot_date?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          goal_id?: string
          id?: string
          snapshot_date?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_goal_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "pc_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_goals: {
        Row: {
          created_at: string | null
          created_by: string
          current_value: number | null
          description: string | null
          goal_type: string | null
          id: string
          linked_task_category: string | null
          linked_task_sector: string | null
          period_end: string | null
          period_start: string | null
          period_type: string | null
          responsible: string | null
          sector: string | null
          status: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          current_value?: number | null
          description?: string | null
          goal_type?: string | null
          id?: string
          linked_task_category?: string | null
          linked_task_sector?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          responsible?: string | null
          sector?: string | null
          status?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string | null
          id?: string
          linked_task_category?: string | null
          linked_task_sector?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          responsible?: string | null
          sector?: string | null
          status?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pc_inventory_access_passwords: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pc_inventory_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          item_id: string
          message: string | null
          resolved_at: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          item_id: string
          message?: string | null
          resolved_at?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          item_id?: string
          message?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_calibration_logs: {
        Row: {
          calibrated_by: string
          created_at: string
          difference: number
          id: string
          item_id: string
          new_quantity: number
          old_quantity: number
          reason: string
        }
        Insert: {
          calibrated_by: string
          created_at?: string
          difference?: number
          id?: string
          item_id: string
          new_quantity?: number
          old_quantity?: number
          reason?: string
        }
        Update: {
          calibrated_by?: string
          created_at?: string
          difference?: number
          id?: string
          item_id?: string
          new_quantity?: number
          old_quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_calibration_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_item_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          item_id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          item_id: string
          mime_type?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          item_id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      pc_inventory_items: {
        Row: {
          avg_cost: number | null
          category_id: string | null
          compatible_with: string[] | null
          created_at: string | null
          created_by: string
          current_quantity: number | null
          id: string
          ideal_quantity: number | null
          image_url: string | null
          internal_code: string | null
          is_active: boolean | null
          item_type: string | null
          last_cost: number | null
          location_id: string | null
          min_quantity: number | null
          name: string
          reserved_quantity: number | null
          subcategory: string | null
          supplier_id: string | null
          unit_cost: number | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          avg_cost?: number | null
          category_id?: string | null
          compatible_with?: string[] | null
          created_at?: string | null
          created_by: string
          current_quantity?: number | null
          id?: string
          ideal_quantity?: number | null
          image_url?: string | null
          internal_code?: string | null
          is_active?: boolean | null
          item_type?: string | null
          last_cost?: number | null
          location_id?: string | null
          min_quantity?: number | null
          name: string
          reserved_quantity?: number | null
          subcategory?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_cost?: number | null
          category_id?: string | null
          compatible_with?: string[] | null
          created_at?: string | null
          created_by?: string
          current_quantity?: number | null
          id?: string
          ideal_quantity?: number | null
          image_url?: string | null
          internal_code?: string | null
          is_active?: boolean | null
          item_type?: string | null
          last_cost?: number | null
          location_id?: string | null
          min_quantity?: number | null
          name?: string
          reserved_quantity?: number | null
          subcategory?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_locations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      pc_inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string
          destination: string | null
          id: string
          invoice_name: string | null
          invoice_url: string | null
          item_id: string
          linked_machine: string | null
          linked_project: string | null
          movement_type: string | null
          notes: string | null
          quantity: number | null
          reason: string | null
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          destination?: string | null
          id?: string
          invoice_name?: string | null
          invoice_url?: string | null
          item_id: string
          linked_machine?: string | null
          linked_project?: string | null
          movement_type?: string | null
          notes?: string | null
          quantity?: number | null
          reason?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          destination?: string | null
          id?: string
          invoice_name?: string | null
          invoice_url?: string | null
          item_id?: string
          linked_machine?: string | null
          linked_project?: string | null
          movement_type?: string | null
          notes?: string | null
          quantity?: number | null
          reason?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_reservations: {
        Row: {
          consumed_at: string | null
          created_at: string | null
          id: string
          item_id: string
          linked_machine: string | null
          linked_order: string | null
          linked_sheet_id: string | null
          notes: string | null
          quantity: number | null
          reserved_by: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          linked_machine?: string | null
          linked_order?: string | null
          linked_sheet_id?: string | null
          notes?: string | null
          quantity?: number | null
          reserved_by: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          linked_machine?: string | null
          linked_order?: string | null
          linked_sheet_id?: string | null
          notes?: string | null
          quantity?: number | null
          reserved_by?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_session_items: {
        Row: {
          actual_quantity: number | null
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          difference: number | null
          expected_quantity: number | null
          id: string
          item_id: string
          notes: string | null
          session_id: string
        }
        Insert: {
          actual_quantity?: number | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          difference?: number | null
          expected_quantity?: number | null
          id?: string
          item_id: string
          notes?: string | null
          session_id: string
        }
        Update: {
          actual_quantity?: number | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          difference?: number | null
          expected_quantity?: number | null
          id?: string
          item_id?: string
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_inventory_session_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_inventory_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_inventory_sessions: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          started_by: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          started_by: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          started_by?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      pc_inventory_settings: {
        Row: {
          allow_negative_stock: boolean | null
          compatible_options: string[] | null
          consumption_period_days: number | null
          created_at: string | null
          global_min_alert: number | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allow_negative_stock?: boolean | null
          compatible_options?: string[] | null
          consumption_period_days?: number | null
          created_at?: string | null
          global_min_alert?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allow_negative_stock?: boolean | null
          compatible_options?: string[] | null
          consumption_period_days?: number | null
          created_at?: string | null
          global_min_alert?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pc_inventory_suppliers: {
        Row: {
          avg_delivery_days: number | null
          contact_name: string | null
          created_at: string | null
          created_by: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          whatsapp: string | null
        }
        Insert: {
          avg_delivery_days?: number | null
          contact_name?: string | null
          created_at?: string | null
          created_by: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          whatsapp?: string | null
        }
        Update: {
          avg_delivery_days?: number | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      pc_inventory_units: {
        Row: {
          abbreviation: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      pc_member_sector_access: {
        Row: {
          account_id: string
          created_at: string
          id: string
          sector_key: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          sector_key: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          sector_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_member_sector_access_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_pendencies: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          resolved_at: string | null
          responsible: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          responsible?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          responsible?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pc_process_template_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          step_index: number
          template_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          step_index: number
          template_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          step_index?: number
          template_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_process_template_files_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pc_production_process_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_production_bom_items: {
        Row: {
          categoria: string
          created_at: string
          deducted_quantity: number
          ficha_id: string
          fornecedor: string | null
          id: string
          inventory_item_id: string | null
          item_nome: string
          lead_time_dias: number | null
          observacao: string | null
          quantidade: number
          shortage_quantity: number
          unidade: string
          updated_at: string
          valor_unitario: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          deducted_quantity?: number
          ficha_id: string
          fornecedor?: string | null
          id?: string
          inventory_item_id?: string | null
          item_nome?: string
          lead_time_dias?: number | null
          observacao?: string | null
          quantidade?: number
          shortage_quantity?: number
          unidade?: string
          updated_at?: string
          valor_unitario?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          deducted_quantity?: number
          ficha_id?: string
          fornecedor?: string | null
          id?: string
          inventory_item_id?: string | null
          item_nome?: string
          lead_time_dias?: number | null
          observacao?: string | null
          quantidade?: number
          shortage_quantity?: number
          unidade?: string
          updated_at?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pc_production_bom_items_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "pc_production_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pc_production_bom_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "pc_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_production_bom_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          items: Json
          nome: string
          produto_modelo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          items?: Json
          nome: string
          produto_modelo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          items?: Json
          nome?: string
          produto_modelo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pc_production_cards: {
        Row: {
          created_by: string | null
          id: string
          image_url: string | null
          key: string
          title: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          created_by?: string | null
          id?: string
          image_url?: string | null
          key: string
          title: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          created_by?: string | null
          id?: string
          image_url?: string | null
          key?: string
          title?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      pc_production_items: {
        Row: {
          client_name: string | null
          created_at: string | null
          created_by: string
          estimated_deadline: string | null
          id: string
          machine_name: string | null
          notes: string | null
          priority: string | null
          project_name: string
          responsible: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          created_by: string
          estimated_deadline?: string | null
          id?: string
          machine_name?: string | null
          notes?: string | null
          priority?: string | null
          project_name: string
          responsible?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          created_by?: string
          estimated_deadline?: string | null
          id?: string
          machine_name?: string | null
          notes?: string | null
          priority?: string | null
          project_name?: string
          responsible?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pc_production_pdf_config: {
        Row: {
          cor_principal: string | null
          created_by: string | null
          empresa_cnpj: string | null
          empresa_contato: string | null
          empresa_endereco: string | null
          empresa_nome: string | null
          id: string
          logo_url: string | null
          mostrar_cliente: boolean | null
          mostrar_fornecedor: boolean | null
          mostrar_valores: boolean | null
          rodape_texto: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cor_principal?: string | null
          created_by?: string | null
          empresa_cnpj?: string | null
          empresa_contato?: string | null
          empresa_endereco?: string | null
          empresa_nome?: string | null
          id?: string
          logo_url?: string | null
          mostrar_cliente?: boolean | null
          mostrar_fornecedor?: boolean | null
          mostrar_valores?: boolean | null
          rodape_texto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cor_principal?: string | null
          created_by?: string | null
          empresa_cnpj?: string | null
          empresa_contato?: string | null
          empresa_endereco?: string | null
          empresa_nome?: string | null
          id?: string
          logo_url?: string | null
          mostrar_cliente?: boolean | null
          mostrar_fornecedor?: boolean | null
          mostrar_valores?: boolean | null
          rodape_texto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pc_production_process_steps: {
        Row: {
          created_at: string
          data_alvo: string | null
          data_inicio: string | null
          etapa_nome: string
          ficha_id: string
          id: string
          observacao: string | null
          ordem: number
          prazo_dias: number | null
          setor_responsavel: string
          status: string
          tempo_estimado_horas: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_alvo?: string | null
          data_inicio?: string | null
          etapa_nome?: string
          ficha_id: string
          id?: string
          observacao?: string | null
          ordem?: number
          prazo_dias?: number | null
          setor_responsavel?: string
          status?: string
          tempo_estimado_horas?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_alvo?: string | null
          data_inicio?: string | null
          etapa_nome?: string
          ficha_id?: string
          id?: string
          observacao?: string | null
          ordem?: number
          prazo_dias?: number | null
          setor_responsavel?: string
          status?: string
          tempo_estimado_horas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_production_process_steps_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "pc_production_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_production_process_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          nome: string
          produto_modelo: string | null
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          nome: string
          produto_modelo?: string | null
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          produto_modelo?: string | null
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pc_production_sheets: {
        Row: {
          activated_at: string | null
          cliente: string | null
          created_at: string
          created_by: string
          data_inicio: string | null
          id: string
          nome_projeto: string
          observacoes: string | null
          prazo_final: string | null
          produto_modelo: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          cliente?: string | null
          created_at?: string
          created_by: string
          data_inicio?: string | null
          id?: string
          nome_projeto: string
          observacoes?: string | null
          prazo_final?: string | null
          produto_modelo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          cliente?: string | null
          created_at?: string
          created_by?: string
          data_inicio?: string | null
          id?: string
          nome_projeto?: string
          observacoes?: string | null
          prazo_final?: string | null
          produto_modelo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      pc_routine_activations: {
        Row: {
          activated_at: string | null
          activated_by: string
          context_data: Json | null
          id: string
          routine_id: string
          tasks_created: number | null
        }
        Insert: {
          activated_at?: string | null
          activated_by: string
          context_data?: Json | null
          id?: string
          routine_id: string
          tasks_created?: number | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string
          context_data?: Json | null
          id?: string
          routine_id?: string
          tasks_created?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pc_routine_activations_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "pc_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_routine_template_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          routine_id: string
          task_index: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          routine_id: string
          task_index: number
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          routine_id?: string
          task_index?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_routine_template_files_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "pc_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_routines: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          tasks_template: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          tasks_template?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          tasks_template?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pc_schedule_events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          id: string
          responsible: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          responsible?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          responsible?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pc_task_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pc_task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pc_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pc_tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          responsible: string | null
          sector: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          responsible?: string | null
          sector?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          responsible?: string | null
          sector?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pdf_quote_settings: {
        Row: {
          accent_color: string | null
          company_address: string | null
          company_cep: string | null
          company_cnpj: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          footer_text: string | null
          id: string
          label_service_value: string | null
          logo_url: string | null
          pix_qr_image_url: string
          primary_color: string | null
          show_customer: boolean | null
          show_cutting_value: boolean | null
          show_date: boolean | null
          show_delivery: boolean | null
          show_material: boolean | null
          show_material_value: boolean | null
          show_payment_conditions: boolean | null
          show_service_value: boolean | null
          show_thickness: boolean | null
          show_watermark: boolean | null
          updated_at: string
          user_id: string
          watermark_url: string | null
        }
        Insert: {
          accent_color?: string | null
          company_address?: string | null
          company_cep?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          label_service_value?: string | null
          logo_url?: string | null
          pix_qr_image_url?: string
          primary_color?: string | null
          show_customer?: boolean | null
          show_cutting_value?: boolean | null
          show_date?: boolean | null
          show_delivery?: boolean | null
          show_material?: boolean | null
          show_material_value?: boolean | null
          show_payment_conditions?: boolean | null
          show_service_value?: boolean | null
          show_thickness?: boolean | null
          show_watermark?: boolean | null
          updated_at?: string
          user_id: string
          watermark_url?: string | null
        }
        Update: {
          accent_color?: string | null
          company_address?: string | null
          company_cep?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          label_service_value?: string | null
          logo_url?: string | null
          pix_qr_image_url?: string
          primary_color?: string | null
          show_customer?: boolean | null
          show_cutting_value?: boolean | null
          show_date?: boolean | null
          show_delivery?: boolean | null
          show_material?: boolean | null
          show_material_value?: boolean | null
          show_payment_conditions?: boolean | null
          show_service_value?: boolean | null
          show_thickness?: boolean | null
          show_watermark?: boolean | null
          updated_at?: string
          user_id?: string
          watermark_url?: string | null
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          allow_user_override_passes: boolean
          allow_user_override_speed: boolean
          avg_cut_speed: number
          electricity: number
          energy_cost_per_kwh: number | null
          gas_consumable: number
          id: string
          internet: number
          machine_cost: number
          machine_energy_consumption_kw: number | null
          maintenance_cost: number
          max_passes_override: number
          max_speed_override_mmmin: number
          min_speed_override_mmmin: number
          operator_salary: number | null
          other_fixed: number
          other_machine: number
          pricing_mode: string
          productive_hours: number
          profit_margin: number
          rent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_user_override_passes?: boolean
          allow_user_override_speed?: boolean
          avg_cut_speed?: number
          electricity?: number
          energy_cost_per_kwh?: number | null
          gas_consumable?: number
          id?: string
          internet?: number
          machine_cost?: number
          machine_energy_consumption_kw?: number | null
          maintenance_cost?: number
          max_passes_override?: number
          max_speed_override_mmmin?: number
          min_speed_override_mmmin?: number
          operator_salary?: number | null
          other_fixed?: number
          other_machine?: number
          pricing_mode?: string
          productive_hours?: number
          profit_margin?: number
          rent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_user_override_passes?: boolean
          allow_user_override_speed?: boolean
          avg_cut_speed?: number
          electricity?: number
          energy_cost_per_kwh?: number | null
          gas_consumable?: number
          id?: string
          internet?: number
          machine_cost?: number
          machine_energy_consumption_kw?: number | null
          maintenance_cost?: number
          max_passes_override?: number
          max_speed_override_mmmin?: number
          min_speed_override_mmmin?: number
          operator_salary?: number | null
          other_fixed?: number
          other_machine?: number
          pricing_mode?: string
          productive_hours?: number
          profit_margin?: number
          rent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_access_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      production_bom_items: {
        Row: {
          categoria: string
          created_at: string
          deducted_quantity: number
          ficha_id: string
          fornecedor: string | null
          id: string
          inventory_item_id: string | null
          item_nome: string
          lead_time_dias: number | null
          observacao: string | null
          quantidade: number
          shortage_quantity: number
          unidade: string
          updated_at: string
          valor_unitario: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          deducted_quantity?: number
          ficha_id: string
          fornecedor?: string | null
          id?: string
          inventory_item_id?: string | null
          item_nome?: string
          lead_time_dias?: number | null
          observacao?: string | null
          quantidade?: number
          shortage_quantity?: number
          unidade?: string
          updated_at?: string
          valor_unitario?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          deducted_quantity?: number
          ficha_id?: string
          fornecedor?: string | null
          id?: string
          inventory_item_id?: string | null
          item_nome?: string
          lead_time_dias?: number | null
          observacao?: string | null
          quantidade?: number
          shortage_quantity?: number
          unidade?: string
          updated_at?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_bom_items_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_bom_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_bom_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          items: Json
          nome: string
          produto_modelo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          items?: Json
          nome: string
          produto_modelo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          items?: Json
          nome?: string
          produto_modelo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      production_pdf_config: {
        Row: {
          cor_principal: string | null
          empresa_cnpj: string | null
          empresa_contato: string | null
          empresa_endereco: string | null
          empresa_nome: string | null
          id: string
          logo_url: string | null
          mostrar_cliente: boolean | null
          mostrar_fornecedor: boolean | null
          mostrar_valores: boolean | null
          rodape_texto: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cor_principal?: string | null
          empresa_cnpj?: string | null
          empresa_contato?: string | null
          empresa_endereco?: string | null
          empresa_nome?: string | null
          id?: string
          logo_url?: string | null
          mostrar_cliente?: boolean | null
          mostrar_fornecedor?: boolean | null
          mostrar_valores?: boolean | null
          rodape_texto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cor_principal?: string | null
          empresa_cnpj?: string | null
          empresa_contato?: string | null
          empresa_endereco?: string | null
          empresa_nome?: string | null
          id?: string
          logo_url?: string | null
          mostrar_cliente?: boolean | null
          mostrar_fornecedor?: boolean | null
          mostrar_valores?: boolean | null
          rodape_texto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      production_process_steps: {
        Row: {
          created_at: string
          data_alvo: string | null
          etapa_nome: string
          ficha_id: string
          id: string
          observacao: string | null
          ordem: number
          prazo_dias: number | null
          setor_responsavel: string
          status: string
          tempo_estimado_horas: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_alvo?: string | null
          etapa_nome?: string
          ficha_id: string
          id?: string
          observacao?: string | null
          ordem?: number
          prazo_dias?: number | null
          setor_responsavel?: string
          status?: string
          tempo_estimado_horas?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_alvo?: string | null
          etapa_nome?: string
          ficha_id?: string
          id?: string
          observacao?: string | null
          ordem?: number
          prazo_dias?: number | null
          setor_responsavel?: string
          status?: string
          tempo_estimado_horas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_process_steps_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      production_process_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          nome: string
          produto_modelo: string | null
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          nome: string
          produto_modelo?: string | null
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          produto_modelo?: string | null
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      production_sheets: {
        Row: {
          activated_at: string | null
          cliente: string | null
          created_at: string
          created_by: string
          data_inicio: string | null
          id: string
          nome_projeto: string
          observacoes: string | null
          prazo_final: string | null
          produto_modelo: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          cliente?: string | null
          created_at?: string
          created_by: string
          data_inicio?: string | null
          id?: string
          nome_projeto: string
          observacoes?: string | null
          prazo_final?: string | null
          produto_modelo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          cliente?: string | null
          created_at?: string
          created_by?: string
          data_inicio?: string | null
          id?: string
          nome_projeto?: string
          observacoes?: string | null
          prazo_final?: string | null
          produto_modelo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          approved: boolean
          city: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          initials: string
          name: string
          phone: string | null
          pix_qr_image_url: string | null
          rejected: boolean
          signature_darkness: number
          signature_offset_x: number | null
          signature_offset_y: number | null
          signature_size: number
          signature_url: string | null
          signature_zoom: number | null
          state: string | null
          suspended_by: string | null
          suspended_reason: string | null
          suspended_until: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          approved?: boolean
          city?: string | null
          company?: string | null
          created_at?: string
          email: string
          id: string
          initials?: string
          name: string
          phone?: string | null
          pix_qr_image_url?: string | null
          rejected?: boolean
          signature_darkness?: number
          signature_offset_x?: number | null
          signature_offset_y?: number | null
          signature_size?: number
          signature_url?: string | null
          signature_zoom?: number | null
          state?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          suspended_until?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          approved?: boolean
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          initials?: string
          name?: string
          phone?: string | null
          pix_qr_image_url?: string | null
          rejected?: boolean
          signature_darkness?: number
          signature_offset_x?: number | null
          signature_offset_y?: number | null
          signature_size?: number
          signature_url?: string | null
          signature_zoom?: number | null
          state?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          suspended_until?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      proposal_machine_included_items: {
        Row: {
          created_at: string
          id: string
          model_id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_machine_included_items_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "proposal_machine_models"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_machine_models: {
        Row: {
          area_x: number | null
          area_y: number | null
          area_z: number | null
          base_price: number | null
          category: string | null
          created_at: string
          created_by: string
          delivery_days: number | null
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          tech_specs: string
          updated_at: string
        }
        Insert: {
          area_x?: number | null
          area_y?: number | null
          area_z?: number | null
          base_price?: number | null
          category?: string | null
          created_at?: string
          created_by: string
          delivery_days?: number | null
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          tech_specs?: string
          updated_at?: string
        }
        Update: {
          area_x?: number | null
          area_y?: number | null
          area_z?: number | null
          base_price?: number | null
          category?: string | null
          created_at?: string
          created_by?: string
          delivery_days?: number | null
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          tech_specs?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_machine_optional_items: {
        Row: {
          created_at: string
          id: string
          model_id: string
          name: string
          price: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          name: string
          price?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          name?: string
          price?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_machine_optional_items_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "proposal_machine_models"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_pdf_settings: {
        Row: {
          address: string
          company_name: string
          created_at: string
          default_template_type: string
          document_number: string
          document_title: string
          email: string
          enable_pix_qr: boolean
          footer_text: string
          id: string
          institutional_text: string
          logo_url: string
          phone: string
          pix_qr_image_url: string
          primary_color: string
          show_emitter_signature: boolean
          show_footer: boolean
          show_history_summary: boolean
          show_installment_info: boolean
          show_logo: boolean
          show_observations: boolean
          show_party_signature: boolean
          show_remaining_balance: boolean
          show_watermark: boolean
          signer_name: string
          signer_role: string
          subtitle_text: string
          updated_at: string
          user_id: string
          watermark_image_url: string
          watermark_opacity: number
          watermark_text: string
        }
        Insert: {
          address?: string
          company_name?: string
          created_at?: string
          default_template_type?: string
          document_number?: string
          document_title?: string
          email?: string
          enable_pix_qr?: boolean
          footer_text?: string
          id?: string
          institutional_text?: string
          logo_url?: string
          phone?: string
          pix_qr_image_url?: string
          primary_color?: string
          show_emitter_signature?: boolean
          show_footer?: boolean
          show_history_summary?: boolean
          show_installment_info?: boolean
          show_logo?: boolean
          show_observations?: boolean
          show_party_signature?: boolean
          show_remaining_balance?: boolean
          show_watermark?: boolean
          signer_name?: string
          signer_role?: string
          subtitle_text?: string
          updated_at?: string
          user_id: string
          watermark_image_url?: string
          watermark_opacity?: number
          watermark_text?: string
        }
        Update: {
          address?: string
          company_name?: string
          created_at?: string
          default_template_type?: string
          document_number?: string
          document_title?: string
          email?: string
          enable_pix_qr?: boolean
          footer_text?: string
          id?: string
          institutional_text?: string
          logo_url?: string
          phone?: string
          pix_qr_image_url?: string
          primary_color?: string
          show_emitter_signature?: boolean
          show_footer?: boolean
          show_history_summary?: boolean
          show_installment_info?: boolean
          show_logo?: boolean
          show_observations?: boolean
          show_party_signature?: boolean
          show_remaining_balance?: boolean
          show_watermark?: boolean
          signer_name?: string
          signer_role?: string
          subtitle_text?: string
          updated_at?: string
          user_id?: string
          watermark_image_url?: string
          watermark_opacity?: number
          watermark_text?: string
        }
        Relationships: []
      }
      receipt_signatures: {
        Row: {
          created_at: string
          id: string
          image_url: string
          receipt_id: string
          signer_name: string
          signer_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string
          receipt_id: string
          signer_name?: string
          signer_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          receipt_id?: string
          signer_name?: string
          signer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_signatures_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_equipment: {
        Row: {
          accessories: string[] | null
          category: string
          created_at: string
          id: string
          image_path: string | null
          install_date: string
          model: string
          name: string
          owner_id: string
          serial_number: string
          status: string
        }
        Insert: {
          accessories?: string[] | null
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          install_date?: string
          model: string
          name?: string
          owner_id: string
          serial_number: string
          status?: string
        }
        Update: {
          accessories?: string[] | null
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          install_date?: string
          model?: string
          name?: string
          owner_id?: string
          serial_number?: string
          status?: string
        }
        Relationships: []
      }
      registered_equipment_files: {
        Row: {
          created_at: string
          created_by: string
          description: string
          equipment_id: string
          file_path: string | null
          file_type: string
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          equipment_id: string
          file_path?: string | null
          file_type?: string
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          equipment_id?: string
          file_path?: string | null
          file_type?: string
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registered_equipment_files_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "registered_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_equipment_specs: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          spec_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          spec_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          spec_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registered_equipment_specs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: true
            referencedRelation: "registered_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_equipment_trainings: {
        Row: {
          created_at: string
          created_by: string
          description: string
          equipment_id: string
          file_name: string | null
          file_path: string | null
          id: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          equipment_id: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          equipment_id?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registered_equipment_trainings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "registered_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bonuses: {
        Row: {
          amount: number
          created_at: string
          description: string
          granted_by: string
          id: string
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          granted_by: string
          id?: string
          notes?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          granted_by?: string
          id?: string
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      slicer_materials: {
        Row: {
          created_at: string
          height: number
          id: string
          name: string
          thickness: number
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          name: string
          thickness?: number
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          name?: string
          thickness?: number
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: []
      }
      technical_bulletins: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string
          details: string
          id: string
          target_models: string[] | null
          target_roles: string[] | null
          title: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          created_by: string
          details?: string
          id?: string
          target_models?: string[] | null
          target_roles?: string[] | null
          title: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string
          details?: string
          id?: string
          target_models?: string[] | null
          target_roles?: string[] | null
          title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      technical_report_clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_report_files: {
        Row: {
          created_at: string
          description: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          mime_type: string
          report_id: string
          sort_order: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          report_id: string
          sort_order?: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          report_id?: string
          sort_order?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_report_files_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "technical_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_report_pdf_config: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          footer_text: string | null
          header_color: string | null
          id: string
          logo_bg_color: string | null
          logo_url: string | null
          phone: string | null
          role_title: string | null
          show_checklist: boolean | null
          show_logo: boolean | null
          show_photos: boolean | null
          show_signature: boolean | null
          show_watermark: boolean | null
          updated_at: string
          user_id: string
          watermark_image_url: string | null
          watermark_opacity: number | null
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          footer_text?: string | null
          header_color?: string | null
          id?: string
          logo_bg_color?: string | null
          logo_url?: string | null
          phone?: string | null
          role_title?: string | null
          show_checklist?: boolean | null
          show_logo?: boolean | null
          show_photos?: boolean | null
          show_signature?: boolean | null
          show_watermark?: boolean | null
          updated_at?: string
          user_id: string
          watermark_image_url?: string | null
          watermark_opacity?: number | null
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          footer_text?: string | null
          header_color?: string | null
          id?: string
          logo_bg_color?: string | null
          logo_url?: string | null
          phone?: string | null
          role_title?: string | null
          show_checklist?: boolean | null
          show_logo?: boolean | null
          show_photos?: boolean | null
          show_signature?: boolean | null
          show_watermark?: boolean | null
          updated_at?: string
          user_id?: string
          watermark_image_url?: string | null
          watermark_opacity?: number | null
        }
        Relationships: []
      }
      technical_reports: {
        Row: {
          attendance_date: string
          checklist: Json
          client_city: string
          client_company: string
          client_id: string | null
          client_name: string
          client_signature: string | null
          client_signature_image_url: string | null
          created_at: string
          created_by: string
          equipment_name: string
          final_observations: string
          id: string
          machine_model: string
          parts_replaced: string
          problem_reported: string
          recommendations: string
          related_ticket: string | null
          report_number: number
          serial_number: string
          service_performed: string
          status: string
          technical_diagnosis: string
          technician_name: string
          technician_signature: string | null
          tests_performed: string
          time_end: string | null
          time_start: string | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          checklist?: Json
          client_city?: string
          client_company?: string
          client_id?: string | null
          client_name?: string
          client_signature?: string | null
          client_signature_image_url?: string | null
          created_at?: string
          created_by: string
          equipment_name?: string
          final_observations?: string
          id?: string
          machine_model?: string
          parts_replaced?: string
          problem_reported?: string
          recommendations?: string
          related_ticket?: string | null
          report_number?: number
          serial_number?: string
          service_performed?: string
          status?: string
          technical_diagnosis?: string
          technician_name?: string
          technician_signature?: string | null
          tests_performed?: string
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          checklist?: Json
          client_city?: string
          client_company?: string
          client_id?: string | null
          client_name?: string
          client_signature?: string | null
          client_signature_image_url?: string | null
          created_at?: string
          created_by?: string
          equipment_name?: string
          final_observations?: string
          id?: string
          machine_model?: string
          parts_replaced?: string
          problem_reported?: string
          recommendations?: string
          related_ticket?: string | null
          report_number?: number
          serial_number?: string
          service_performed?: string
          status?: string
          technical_diagnosis?: string
          technician_name?: string
          technician_signature?: string | null
          tests_performed?: string
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "technical_report_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_files_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          admin_email_sent: boolean
          created_at: string
          description: string
          id: string
          machine_id: string
          status: string
          type: string
          updated_at: string
          user_email_sent: boolean
          user_id: string
        }
        Insert: {
          admin_email_sent?: boolean
          created_at?: string
          description: string
          id?: string
          machine_id: string
          status?: string
          type: string
          updated_at?: string
          user_email_sent?: boolean
          user_id: string
        }
        Update: {
          admin_email_sent?: boolean
          created_at?: string
          description?: string
          id?: string
          machine_id?: string
          status?: string
          type?: string
          updated_at?: string
          user_email_sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sectors: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          id: string
          last_login_at: string | null
          login_count: number
          user_id: string
        }
        Insert: {
          id?: string
          last_login_at?: string | null
          login_count?: number
          user_id: string
        }
        Update: {
          id?: string
          last_login_at?: string | null
          login_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_appearance_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_layout: {
        Row: {
          applied_template_id: string | null
          dashboard_locked: boolean
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_template_id?: string | null
          dashboard_locked?: boolean
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_template_id?: string | null
          dashboard_locked?: boolean
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_layout_applied_template_id_fkey"
            columns: ["applied_template_id"]
            isOneToOne: false
            referencedRelation: "dashboard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_login_events: {
        Row: {
          id: string
          logged_in_at: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_in_at?: string
          user_id: string
        }
        Update: {
          id?: string
          logged_in_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          features_enabled: string[]
          id: string
          last_access_at: string | null
          max_financial_entries: number
          max_quotes_per_month: number
          plan: string
          pro_access: boolean
          pro_activated_at: string | null
          pro_granted_by: string | null
          pro_notes: string | null
          updated_at: string
          use_dimension_materials: boolean
          use_master_pricing: boolean
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          features_enabled?: string[]
          id?: string
          last_access_at?: string | null
          max_financial_entries?: number
          max_quotes_per_month?: number
          plan?: string
          pro_access?: boolean
          pro_activated_at?: string | null
          pro_granted_by?: string | null
          pro_notes?: string | null
          updated_at?: string
          use_dimension_materials?: boolean
          use_master_pricing?: boolean
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          features_enabled?: string[]
          id?: string
          last_access_at?: string | null
          max_financial_entries?: number
          max_quotes_per_month?: number
          plan?: string
          pro_access?: boolean
          pro_activated_at?: string | null
          pro_granted_by?: string | null
          pro_notes?: string | null
          updated_at?: string
          use_dimension_materials?: boolean
          use_master_pricing?: boolean
          user_id?: string
          valid_until?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_section_access: {
        Row: {
          applied_template_id: string | null
          created_at: string
          id: string
          sections: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_template_id?: string | null
          created_at?: string
          id?: string
          sections?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_template_id?: string | null
          created_at?: string
          id?: string
          sections?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_section_access_applied_template_id_fkey"
            columns: ["applied_template_id"]
            isOneToOne: false
            referencedRelation: "access_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suggestions: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      work_diary_clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_diary_entries: {
        Row: {
          activity_type: string
          client_company: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          contracted_service: string | null
          contracted_services: Json | null
          created_at: string
          description: string | null
          entry_date: string
          entry_number: number
          execution_deadline: string | null
          execution_process: string | null
          id: string
          impediment_reason: string | null
          location: string | null
          materials_to_use: string | null
          materials_used: string | null
          observations: string | null
          pending_reason: string | null
          required_materials: Json | null
          responsible: string | null
          status: string
          team: string | null
          time_end: string | null
          time_start: string | null
          title: string
          unit_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          client_company?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          contracted_service?: string | null
          contracted_services?: Json | null
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_number?: number
          execution_deadline?: string | null
          execution_process?: string | null
          id?: string
          impediment_reason?: string | null
          location?: string | null
          materials_to_use?: string | null
          materials_used?: string | null
          observations?: string | null
          pending_reason?: string | null
          required_materials?: Json | null
          responsible?: string | null
          status?: string
          team?: string | null
          time_end?: string | null
          time_start?: string | null
          title?: string
          unit_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          client_company?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          contracted_service?: string | null
          contracted_services?: Json | null
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_number?: number
          execution_deadline?: string | null
          execution_process?: string | null
          id?: string
          impediment_reason?: string | null
          location?: string | null
          materials_to_use?: string | null
          materials_used?: string | null
          observations?: string | null
          pending_reason?: string | null
          required_materials?: Json | null
          responsible?: string | null
          status?: string
          team?: string | null
          time_end?: string | null
          time_start?: string | null
          title?: string
          unit_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_diary_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "work_diary_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      work_diary_files: {
        Row: {
          caption: string | null
          created_at: string
          entry_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          entry_id: string
          file_name?: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          entry_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_diary_files_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "work_diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      work_diary_pdf_config: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          footer_text: string | null
          header_color: string | null
          id: string
          logo_bg_color: string | null
          logo_url: string | null
          phone: string | null
          role_title: string | null
          show_logo: boolean | null
          show_materials: boolean | null
          show_photos: boolean | null
          show_signature: boolean | null
          show_status: boolean | null
          show_time: boolean | null
          show_watermark: boolean | null
          updated_at: string
          user_id: string
          watermark_image_url: string | null
          watermark_opacity: number | null
          watermark_text: string | null
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          footer_text?: string | null
          header_color?: string | null
          id?: string
          logo_bg_color?: string | null
          logo_url?: string | null
          phone?: string | null
          role_title?: string | null
          show_logo?: boolean | null
          show_materials?: boolean | null
          show_photos?: boolean | null
          show_signature?: boolean | null
          show_status?: boolean | null
          show_time?: boolean | null
          show_watermark?: boolean | null
          updated_at?: string
          user_id: string
          watermark_image_url?: string | null
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          footer_text?: string | null
          header_color?: string | null
          id?: string
          logo_bg_color?: string | null
          logo_url?: string | null
          phone?: string | null
          role_title?: string | null
          show_logo?: boolean | null
          show_materials?: boolean | null
          show_photos?: boolean | null
          show_signature?: boolean | null
          show_status?: boolean | null
          show_time?: boolean | null
          show_watermark?: boolean | null
          updated_at?: string
          user_id?: string
          watermark_image_url?: string | null
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_master_user_id: { Args: never; Returns: string }
      get_user_account_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_owner: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_client_admin: { Args: { _user_id: string }; Returns: boolean }
      is_same_account: { Args: { _user_id: string }; Returns: boolean }
      record_login_activity: { Args: { p_user_id: string }; Returns: undefined }
      record_login_event: { Args: { p_user_id: string }; Returns: undefined }
      record_page_visit: {
        Args: { p_page_path: string; p_user_id: string }
        Returns: undefined
      }
      start_account_impersonation: {
        Args: { _target_user_id: string }
        Returns: string
      }
      start_impersonation: { Args: { target_user_id: string }; Returns: string }
      stop_impersonation: { Args: { log_id: string }; Returns: undefined }
    }
    Enums: {
      account_member_role:
        | "client_admin"
        | "operator"
        | "client_finance"
        | "viewer"
      app_role:
        | "admin_master"
        | "admin"
        | "operador"
        | "financeiro"
        | "servico"
        | "usuario_interno"
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
      account_member_role: [
        "client_admin",
        "operator",
        "client_finance",
        "viewer",
      ],
      app_role: [
        "admin_master",
        "admin",
        "operador",
        "financeiro",
        "servico",
        "usuario_interno",
      ],
    },
  },
} as const
