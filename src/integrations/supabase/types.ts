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
          passes_final: number
          passes_origin: string
          path_length_m: number
          path_length_mm: number
          quantity: number
          service_value: number
          service_value_included: boolean
          speed_factor_used: number
          status: string
          suggested_sale: number
          thickness: string
          total_price: number
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
          passes_final?: number
          passes_origin?: string
          path_length_m?: number
          path_length_mm?: number
          quantity?: number
          service_value?: number
          service_value_included?: boolean
          speed_factor_used?: number
          status?: string
          suggested_sale?: number
          thickness: string
          total_price?: number
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
          passes_final?: number
          passes_origin?: string
          path_length_m?: number
          path_length_mm?: number
          quantity?: number
          service_value?: number
          service_value_included?: boolean
          speed_factor_used?: number
          status?: string
          suggested_sale?: number
          thickness?: string
          total_price?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      app_role: "admin_master" | "admin" | "operador" | "financeiro"
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
      app_role: ["admin_master", "admin", "operador", "financeiro"],
    },
  },
} as const
