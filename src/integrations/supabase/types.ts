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
      pdf_quote_settings: {
        Row: {
          accent_color: string | null
          company_address: string | null
          company_cnpj: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          footer_text: string | null
          id: string
          label_service_value: string | null
          logo_url: string | null
          primary_color: string | null
          show_customer: boolean | null
          show_cutting_value: boolean | null
          show_date: boolean | null
          show_delivery: boolean | null
          show_material: boolean | null
          show_material_value: boolean | null
          show_service_value: boolean | null
          show_thickness: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          company_address?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          label_service_value?: string | null
          logo_url?: string | null
          primary_color?: string | null
          show_customer?: boolean | null
          show_cutting_value?: boolean | null
          show_date?: boolean | null
          show_delivery?: boolean | null
          show_material?: boolean | null
          show_material_value?: boolean | null
          show_service_value?: boolean | null
          show_thickness?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          company_address?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          label_service_value?: string | null
          logo_url?: string | null
          primary_color?: string | null
          show_customer?: boolean | null
          show_cutting_value?: boolean | null
          show_date?: boolean | null
          show_delivery?: boolean | null
          show_material?: boolean | null
          show_material_value?: boolean | null
          show_service_value?: boolean | null
          show_thickness?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          allow_user_override_passes: boolean
          allow_user_override_speed: boolean
          avg_cut_speed: number
          electricity: number
          gas_consumable: number
          id: string
          internet: number
          machine_cost: number
          maintenance_cost: number
          max_passes_override: number
          max_speed_override_mmmin: number
          min_speed_override_mmmin: number
          other_fixed: number
          other_machine: number
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
          gas_consumable?: number
          id?: string
          internet?: number
          machine_cost?: number
          maintenance_cost?: number
          max_passes_override?: number
          max_speed_override_mmmin?: number
          min_speed_override_mmmin?: number
          other_fixed?: number
          other_machine?: number
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
          gas_consumable?: number
          id?: string
          internet?: number
          machine_cost?: number
          maintenance_cost?: number
          max_passes_override?: number
          max_speed_override_mmmin?: number
          min_speed_override_mmmin?: number
          other_fixed?: number
          other_machine?: number
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
          rejected: boolean
          state: string | null
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
          rejected?: boolean
          state?: string | null
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
          rejected?: boolean
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
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
      technical_bulletins: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string
          details: string
          id: string
          target_models: string[] | null
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
          title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          machine_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          machine_id: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          machine_id?: string
          status?: string
          type?: string
          updated_at?: string
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
          created_at: string
          id: string
          sections: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sections?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sections?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_master_user_id: { Args: never; Returns: string }
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
    }
    Enums: {
      app_role: "admin_master" | "admin" | "operador" | "financeiro" | "servico"
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
      app_role: ["admin_master", "admin", "operador", "financeiro", "servico"],
    },
  },
} as const
