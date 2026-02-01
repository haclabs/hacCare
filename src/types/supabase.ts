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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_locations: {
        Row: {
          body_view: string | null
          created_at: string
          created_by: string
          free_text: string | null
          id: string
          patient_id: string
          region_key: string
          tenant_id: string
          x_percent: number
          y_percent: number
        }
        Insert: {
          body_view?: string | null
          created_at?: string
          created_by: string
          free_text?: string | null
          id?: string
          patient_id: string
          region_key: string
          tenant_id: string
          x_percent: number
          y_percent: number
        }
        Update: {
          body_view?: string | null
          created_at?: string
          created_by?: string
          free_text?: string | null
          id?: string
          patient_id?: string
          region_key?: string
          tenant_id?: string
          x_percent?: number
          y_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "avatar_locations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avatar_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avatar_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_audit_log: {
        Row: {
          action: string
          backup_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          backup_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          backup_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backup_files: {
        Row: {
          backup_id: string
          compression_type: string | null
          created_at: string
          file_data: string
          file_hash: string | null
          id: string
        }
        Insert: {
          backup_id: string
          compression_type?: string | null
          created_at?: string
          file_data: string
          file_hash?: string | null
          id?: string
        }
        Update: {
          backup_id?: string
          compression_type?: string | null
          created_at?: string
          file_data?: string
          file_hash?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_files_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_metadata: {
        Row: {
          backup_type: string
          checksum: string
          created_at: string
          created_by: string
          download_count: number
          encrypted: boolean
          expiry_date: string
          file_size: number
          id: string
          last_downloaded: string | null
          options: Json
          record_count: number
          status: string
          updated_at: string
        }
        Insert: {
          backup_type: string
          checksum: string
          created_at?: string
          created_by: string
          download_count?: number
          encrypted?: boolean
          expiry_date: string
          file_size?: number
          id: string
          last_downloaded?: string | null
          options?: Json
          record_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          backup_type?: string
          checksum?: string
          created_at?: string
          created_by?: string
          download_count?: number
          encrypted?: boolean
          expiry_date?: string
          file_size?: number
          id?: string
          last_downloaded?: string | null
          options?: Json
          record_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bowel_records: {
        Row: {
          bowel_incontinence: string | null
          created_at: string | null
          id: string
          notes: string | null
          nurse_id: string
          nurse_name: string
          patient_id: string
          recorded_at: string
          stool_amount: string | null
          stool_appearance: string | null
          stool_colour: string | null
          stool_consistency: string | null
          student_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          bowel_incontinence?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          nurse_id: string
          nurse_name: string
          patient_id: string
          recorded_at?: string
          stool_amount?: string | null
          stool_appearance?: string | null
          stool_colour?: string | null
          stool_consistency?: string | null
          student_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bowel_incontinence?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          nurse_id?: string
          nurse_name?: string
          patient_id?: string
          recorded_at?: string
          stool_amount?: string | null
          stool_appearance?: string | null
          stool_colour?: string | null
          stool_consistency?: string | null
          student_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          institution: string | null
          message: string
          name: string
          notes: string | null
          processed: boolean | null
          processed_at: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          institution?: string | null
          message: string
          name: string
          notes?: string | null
          processed?: boolean | null
          processed_at?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          institution?: string | null
          message?: string
          name?: string
          notes?: string | null
          processed?: boolean | null
          processed_at?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_assessments: {
        Row: {
          assessed_at: string
          assessment_data: Json
          created_at: string
          device_id: string
          device_type: string
          id: string
          notes: string | null
          output_amount_ml: number | null
          patient_id: string
          status: string | null
          student_name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessment_data?: Json
          created_at?: string
          device_id: string
          device_type: string
          id?: string
          notes?: string | null
          output_amount_ml?: number | null
          patient_id: string
          status?: string | null
          student_name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessment_data?: Json
          created_at?: string
          device_id?: string
          device_type?: string
          id?: string
          notes?: string | null
          output_amount_ml?: number | null
          patient_id?: string
          status?: string | null
          student_name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_assessments_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          created_by: string
          external_length_cm: number | null
          gauge: string | null
          id: string
          initial_aspirate_appearance: string | null
          initial_ph: number | null
          initial_xray_confirmed: boolean | null
          inserted_by: string | null
          location_id: string
          notes: string | null
          number_of_sutures_placed: number | null
          orientation: Database["public"]["Enums"]["orientation_enum"][] | null
          patient_id: string
          patient_tolerance: string | null
          placed_pre_arrival: string | null
          placement_confirmed: boolean | null
          placement_date: string | null
          placement_time: string | null
          reservoir_size_ml: number | null
          reservoir_type:
            | Database["public"]["Enums"]["reservoir_type_enum"]
            | null
          route: string | null
          securement_method: string[] | null
          site_location: string | null
          site_side: string | null
          tenant_id: string
          tube_number: number | null
          tube_size_fr: string | null
          type: Database["public"]["Enums"]["device_type_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          external_length_cm?: number | null
          gauge?: string | null
          id?: string
          initial_aspirate_appearance?: string | null
          initial_ph?: number | null
          initial_xray_confirmed?: boolean | null
          inserted_by?: string | null
          location_id: string
          notes?: string | null
          number_of_sutures_placed?: number | null
          orientation?: Database["public"]["Enums"]["orientation_enum"][] | null
          patient_id: string
          patient_tolerance?: string | null
          placed_pre_arrival?: string | null
          placement_confirmed?: boolean | null
          placement_date?: string | null
          placement_time?: string | null
          reservoir_size_ml?: number | null
          reservoir_type?:
            | Database["public"]["Enums"]["reservoir_type_enum"]
            | null
          route?: string | null
          securement_method?: string[] | null
          site_location?: string | null
          site_side?: string | null
          tenant_id: string
          tube_number?: number | null
          tube_size_fr?: string | null
          type?: Database["public"]["Enums"]["device_type_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          external_length_cm?: number | null
          gauge?: string | null
          id?: string
          initial_aspirate_appearance?: string | null
          initial_ph?: number | null
          initial_xray_confirmed?: boolean | null
          inserted_by?: string | null
          location_id?: string
          notes?: string | null
          number_of_sutures_placed?: number | null
          orientation?: Database["public"]["Enums"]["orientation_enum"][] | null
          patient_id?: string
          patient_tolerance?: string | null
          placed_pre_arrival?: string | null
          placement_confirmed?: boolean | null
          placement_date?: string | null
          placement_time?: string | null
          reservoir_size_ml?: number | null
          reservoir_type?:
            | Database["public"]["Enums"]["reservoir_type_enum"]
            | null
          route?: string | null
          securement_method?: string[] | null
          site_location?: string | null
          site_side?: string | null
          tenant_id?: string
          tube_number?: number | null
          tube_size_fr?: string | null
          type?: Database["public"]["Enums"]["device_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "avatar_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diabetic_records: {
        Row: {
          basal_insulin: Json | null
          bolus_insulin: Json | null
          comments_for_physician: string | null
          correction_insulin: Json | null
          created_at: string | null
          date: string
          glucose_reading: number
          id: string
          other_insulin: Json | null
          patient_id: string
          prompt_frequency: string
          reading_type: string
          recorded_at: string | null
          recorded_by: string | null
          signature: string
          student_name: string | null
          tenant_id: string
          time_cbg_taken: string
          treatments_given: string | null
        }
        Insert: {
          basal_insulin?: Json | null
          bolus_insulin?: Json | null
          comments_for_physician?: string | null
          correction_insulin?: Json | null
          created_at?: string | null
          date: string
          glucose_reading: number
          id?: string
          other_insulin?: Json | null
          patient_id: string
          prompt_frequency?: string
          reading_type: string
          recorded_at?: string | null
          recorded_by?: string | null
          signature: string
          student_name?: string | null
          tenant_id: string
          time_cbg_taken: string
          treatments_given?: string | null
        }
        Update: {
          basal_insulin?: Json | null
          bolus_insulin?: Json | null
          comments_for_physician?: string | null
          correction_insulin?: Json | null
          created_at?: string | null
          date?: string
          glucose_reading?: number
          id?: string
          other_insulin?: Json | null
          patient_id?: string
          prompt_frequency?: string
          reading_type?: string
          recorded_at?: string | null
          recorded_by?: string | null
          signature?: string
          student_name?: string | null
          tenant_id?: string
          time_cbg_taken?: string
          treatments_given?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diabetic_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diabetic_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diabetic_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diabetic_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors_orders: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledged_by_student: string | null
          created_at: string | null
          created_by: string
          doctor_name: string | null
          id: string
          is_acknowledged: boolean | null
          notes: string | null
          order_date: string
          order_text: string
          order_time: string
          order_type: string | null
          ordering_doctor: string
          patient_id: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_by_student?: string | null
          created_at?: string | null
          created_by: string
          doctor_name?: string | null
          id?: string
          is_acknowledged?: boolean | null
          notes?: string | null
          order_date?: string
          order_text: string
          order_time?: string
          order_type?: string | null
          ordering_doctor: string
          patient_id: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_by_student?: string | null
          created_at?: string | null
          created_by?: string
          doctor_name?: string | null
          id?: string
          is_acknowledged?: boolean | null
          notes?: string | null
          order_date?: string
          order_text?: string
          order_time?: string
          order_type?: string | null
          ordering_doctor?: string
          patient_id?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_orders_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_notes: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          assessment: string
          background: string
          created_at: string | null
          created_by: string
          created_by_name: string
          created_by_role: string
          id: string
          patient_id: string
          priority: string
          recommendations: string
          shift: string
          situation: string
          student_name: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assessment: string
          background: string
          created_at?: string | null
          created_by: string
          created_by_name: string
          created_by_role: string
          id?: string
          patient_id: string
          priority: string
          recommendations: string
          shift: string
          situation: string
          student_name?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assessment?: string
          background?: string
          created_at?: string | null
          created_by?: string
          created_by_name?: string
          created_by_role?: string
          id?: string
          patient_id?: string
          priority?: string
          recommendations?: string
          shift?: string
          situation?: string
          student_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handover_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ack_events: {
        Row: {
          abnormal_summary: Json | null
          ack_at: string | null
          ack_by: string
          ack_scope: Database["public"]["Enums"]["ack_scope"]
          created_at: string | null
          id: string
          note: string | null
          panel_id: string
          patient_id: string
          student_name: string | null
          tenant_id: string
        }
        Insert: {
          abnormal_summary?: Json | null
          ack_at?: string | null
          ack_by: string
          ack_scope: Database["public"]["Enums"]["ack_scope"]
          created_at?: string | null
          id?: string
          note?: string | null
          panel_id: string
          patient_id: string
          student_name?: string | null
          tenant_id: string
        }
        Update: {
          abnormal_summary?: Json | null
          ack_at?: string | null
          ack_by?: string
          ack_scope?: Database["public"]["Enums"]["ack_scope"]
          created_at?: string | null
          id?: string
          note?: string | null
          panel_id?: string
          patient_id?: string
          student_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ack_events_ack_by_fkey"
            columns: ["ack_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ack_events_ack_by_fkey"
            columns: ["ack_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ack_events_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "lab_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ack_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ack_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label_printed: boolean | null
          label_printed_at: string | null
          notes: string | null
          order_date: string
          order_time: string
          patient_id: string
          procedure_category: string
          procedure_type: string
          source_category: string
          source_type: string
          status: string | null
          student_name: string
          tenant_id: string
          updated_at: string
          verified_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label_printed?: boolean | null
          label_printed_at?: string | null
          notes?: string | null
          order_date: string
          order_time: string
          patient_id: string
          procedure_category: string
          procedure_type: string
          source_category: string
          source_type: string
          status?: string | null
          student_name: string
          tenant_id: string
          updated_at?: string
          verified_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label_printed?: boolean | null
          label_printed_at?: string | null
          notes?: string | null
          order_date?: string
          order_time?: string
          patient_id?: string
          procedure_category?: string
          procedure_type?: string
          source_category?: string
          source_type?: string
          status?: string | null
          student_name?: string
          tenant_id?: string
          updated_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_panels: {
        Row: {
          ack_required: boolean | null
          created_at: string | null
          entered_by: string | null
          id: string
          notes: string | null
          panel_time: string
          patient_id: string
          source: string | null
          status: Database["public"]["Enums"]["lab_panel_status"] | null
          student_name: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ack_required?: boolean | null
          created_at?: string | null
          entered_by?: string | null
          id?: string
          notes?: string | null
          panel_time: string
          patient_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["lab_panel_status"] | null
          student_name?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ack_required?: boolean | null
          created_at?: string | null
          entered_by?: string | null
          id?: string
          notes?: string | null
          panel_time?: string
          patient_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lab_panel_status"] | null
          student_name?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_panels_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_panels_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_panels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_panels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_refs: {
        Row: {
          category: Database["public"]["Enums"]["lab_category"]
          created_at: string | null
          critical_high: number | null
          critical_low: number | null
          display_order: number | null
          ref_high: number | null
          ref_low: number | null
          ref_operator: Database["public"]["Enums"]["ref_operator"] | null
          sex_ref: Json | null
          test_code: string
          test_name: string
          units: string | null
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["lab_category"]
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          display_order?: number | null
          ref_high?: number | null
          ref_low?: number | null
          ref_operator?: Database["public"]["Enums"]["ref_operator"] | null
          sex_ref?: Json | null
          test_code: string
          test_name: string
          units?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["lab_category"]
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          display_order?: number | null
          ref_high?: number | null
          ref_low?: number | null
          ref_operator?: Database["public"]["Enums"]["ref_operator"] | null
          sex_ref?: Json | null
          test_code?: string
          test_name?: string
          units?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          ack_at: string | null
          ack_by: string | null
          acknowledged_by_student: string | null
          category: Database["public"]["Enums"]["lab_category"]
          comments: string | null
          created_at: string | null
          critical_high: number | null
          critical_low: number | null
          entered_at: string | null
          entered_by: string | null
          flag: Database["public"]["Enums"]["lab_flag"] | null
          id: string
          note: string | null
          panel_id: string
          patient_id: string
          ref_high: number | null
          ref_low: number | null
          ref_operator: Database["public"]["Enums"]["ref_operator"] | null
          sex_ref: Json | null
          tenant_id: string
          test_code: string
          test_name: string
          units: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          ack_at?: string | null
          ack_by?: string | null
          acknowledged_by_student?: string | null
          category: Database["public"]["Enums"]["lab_category"]
          comments?: string | null
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          entered_at?: string | null
          entered_by?: string | null
          flag?: Database["public"]["Enums"]["lab_flag"] | null
          id?: string
          note?: string | null
          panel_id: string
          patient_id: string
          ref_high?: number | null
          ref_low?: number | null
          ref_operator?: Database["public"]["Enums"]["ref_operator"] | null
          sex_ref?: Json | null
          tenant_id: string
          test_code: string
          test_name: string
          units?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          ack_at?: string | null
          ack_by?: string | null
          acknowledged_by_student?: string | null
          category?: Database["public"]["Enums"]["lab_category"]
          comments?: string | null
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          entered_at?: string | null
          entered_by?: string | null
          flag?: Database["public"]["Enums"]["lab_flag"] | null
          id?: string
          note?: string | null
          panel_id?: string
          patient_id?: string
          ref_high?: number | null
          ref_low?: number | null
          ref_operator?: Database["public"]["Enums"]["ref_operator"] | null
          sex_ref?: Json | null
          tenant_id?: string
          test_code?: string
          test_name?: string
          units?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_ack_by_fkey"
            columns: ["ack_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_ack_by_fkey"
            columns: ["ack_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "lab_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_by: string
          administered_by_id: string | null
          barcode_scanned: boolean | null
          created_at: string | null
          dosage: string | null
          id: string
          medication_barcode_scanned: string | null
          medication_id: string | null
          medication_name: string | null
          notes: string | null
          override_reason: string | null
          patient_barcode_scanned: string | null
          patient_id: string
          route: string | null
          status: string | null
          student_name: string | null
          tenant_id: string
          timestamp: string
          updated_at: string | null
          witness_name: string | null
        }
        Insert: {
          administered_by: string
          administered_by_id?: string | null
          barcode_scanned?: boolean | null
          created_at?: string | null
          dosage?: string | null
          id?: string
          medication_barcode_scanned?: string | null
          medication_id?: string | null
          medication_name?: string | null
          notes?: string | null
          override_reason?: string | null
          patient_barcode_scanned?: string | null
          patient_id: string
          route?: string | null
          status?: string | null
          student_name?: string | null
          tenant_id: string
          timestamp?: string
          updated_at?: string | null
          witness_name?: string | null
        }
        Update: {
          administered_by?: string
          administered_by_id?: string | null
          barcode_scanned?: boolean | null
          created_at?: string | null
          dosage?: string | null
          id?: string
          medication_barcode_scanned?: string | null
          medication_id?: string | null
          medication_name?: string | null
          notes?: string | null
          override_reason?: string | null
          patient_barcode_scanned?: string | null
          patient_id?: string
          route?: string | null
          status?: string | null
          student_name?: string | null
          tenant_id?: string
          timestamp?: string
          updated_at?: string | null
          witness_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_tenant_admins: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multi_tenant_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_tenant_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_admission_records: {
        Row: {
          admission_date: string | null
          admission_source: string | null
          admission_type: string | null
          admitting_diagnosis: string | null
          alcohol_use: string | null
          allergies: string | null
          attending_physician: string | null
          bmi: string | null
          chief_complaint: string | null
          created_at: string | null
          current_medications: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          exercise: string | null
          family_history: string | null
          height: string | null
          id: string
          insurance_policy: string | null
          insurance_provider: string | null
          marital_status: string | null
          occupation: string | null
          patient_id: string
          secondary_contact_address: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          secondary_contact_relationship: string | null
          smoking_status: string | null
          tenant_id: string | null
          updated_at: string | null
          weight: string | null
        }
        Insert: {
          admission_date?: string | null
          admission_source?: string | null
          admission_type?: string | null
          admitting_diagnosis?: string | null
          alcohol_use?: string | null
          allergies?: string | null
          attending_physician?: string | null
          bmi?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          exercise?: string | null
          family_history?: string | null
          height?: string | null
          id?: string
          insurance_policy?: string | null
          insurance_provider?: string | null
          marital_status?: string | null
          occupation?: string | null
          patient_id: string
          secondary_contact_address?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_relationship?: string | null
          smoking_status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          weight?: string | null
        }
        Update: {
          admission_date?: string | null
          admission_source?: string | null
          admission_type?: string | null
          admitting_diagnosis?: string | null
          alcohol_use?: string | null
          allergies?: string | null
          attending_physician?: string | null
          bmi?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          exercise?: string | null
          family_history?: string | null
          height?: string | null
          id?: string
          insurance_policy?: string | null
          insurance_provider?: string | null
          marital_status?: string | null
          occupation?: string | null
          patient_id?: string
          secondary_contact_address?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_relationship?: string | null
          smoking_status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          weight?: string | null
        }
        Relationships: []
      }
      patient_advanced_directives: {
        Row: {
          created_at: string | null
          dnr_status: string | null
          healthcare_proxy_name: string | null
          healthcare_proxy_phone: string | null
          healthcare_proxy_relationship: string | null
          id: string
          living_will_date: string | null
          living_will_exists: boolean | null
          living_will_status: string | null
          organ_donation_details: string | null
          organ_donation_status: string | null
          patient_id: string
          religious_preference: string | null
          special_instructions: string | null
          student_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dnr_status?: string | null
          healthcare_proxy_name?: string | null
          healthcare_proxy_phone?: string | null
          healthcare_proxy_relationship?: string | null
          id?: string
          living_will_date?: string | null
          living_will_exists?: boolean | null
          living_will_status?: string | null
          organ_donation_details?: string | null
          organ_donation_status?: string | null
          patient_id: string
          religious_preference?: string | null
          special_instructions?: string | null
          student_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dnr_status?: string | null
          healthcare_proxy_name?: string | null
          healthcare_proxy_phone?: string | null
          healthcare_proxy_relationship?: string | null
          id?: string
          living_will_date?: string | null
          living_will_exists?: boolean | null
          living_will_status?: string | null
          organ_donation_details?: string | null
          organ_donation_status?: string | null
          patient_id?: string
          religious_preference?: string | null
          special_instructions?: string | null
          student_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database["public"]["Enums"]["alert_type_enum"]
          created_at: string
          expires_at: string | null
          id: string
          message: string
          patient_id: string
          patient_name: string
          priority: Database["public"]["Enums"]["alert_priority_enum"]
          tenant_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: Database["public"]["Enums"]["alert_type_enum"]
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          patient_id: string
          patient_name: string
          priority: Database["public"]["Enums"]["alert_priority_enum"]
          tenant_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type_enum"]
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          patient_id?: string
          patient_name?: string
          priority?: Database["public"]["Enums"]["alert_priority_enum"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_images: {
        Row: {
          annotations: Json | null
          created_at: string | null
          description: string | null
          id: string
          image_type: string
          image_url: string
          patient_id: string | null
          tenant_id: string | null
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          annotations?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_type: string
          image_url: string
          patient_id?: string | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          annotations?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_type?: string
          image_url?: string
          patient_id?: string | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_images_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_intake_output_events: {
        Row: {
          amount_ml: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          direction: string
          event_timestamp: string
          id: string
          patient_id: string
          route: string | null
          shift_label: string | null
          student_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_ml: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: string
          event_timestamp?: string
          id?: string
          patient_id: string
          route?: string | null
          shift_label?: string | null
          student_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_ml?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string
          event_timestamp?: string
          id?: string
          patient_id?: string
          route?: string | null
          shift_label?: string | null
          student_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_intake_output_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_intake_output_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_intake_output_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_intake_output_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_intake_output_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medications: {
        Row: {
          admin_time: string | null
          admin_times: Json | null
          category: string | null
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          last_administered: string | null
          name: string
          next_due: string
          patient_id: string | null
          prescribed_by: string
          route: string
          start_date: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          admin_time?: string | null
          admin_times?: Json | null
          category?: string | null
          created_at?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          last_administered?: string | null
          name: string
          next_due: string
          patient_id?: string | null
          prescribed_by: string
          route: string
          start_date: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          admin_time?: string | null
          admin_times?: Json | null
          category?: string | null
          created_at?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          last_administered?: string | null
          name?: string
          next_due?: string
          patient_id?: string | null
          prescribed_by?: string
          route?: string
          start_date?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medications_templates: {
        Row: {
          barcode: string | null
          contraindications: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          dosage: string
          end_date: string | null
          frequency: string
          generic_name: string | null
          id: string
          indication: string | null
          is_active: boolean | null
          is_prn: boolean | null
          max_dose_per_day: string | null
          medication_name: string
          notes: string | null
          patient_template_id: string
          prn_parameters: string | null
          route: string
          side_effects: string[] | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          contraindications?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          dosage: string
          end_date?: string | null
          frequency: string
          generic_name?: string | null
          id?: string
          indication?: string | null
          is_active?: boolean | null
          is_prn?: boolean | null
          max_dose_per_day?: string | null
          medication_name: string
          notes?: string | null
          patient_template_id: string
          prn_parameters?: string | null
          route: string
          side_effects?: string[] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          contraindications?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          generic_name?: string | null
          id?: string
          indication?: string | null
          is_active?: boolean | null
          is_prn?: boolean | null
          max_dose_per_day?: string | null
          medication_name?: string
          notes?: string | null
          patient_template_id?: string
          prn_parameters?: string | null
          route?: string
          side_effects?: string[] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_notes: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          note_type: string | null
          nurse_id: string | null
          nurse_name: string | null
          patient_id: string
          priority: string | null
          student_name: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
          nurse_id?: string | null
          nurse_name?: string | null
          patient_id: string
          priority?: string | null
          student_name?: string | null
          tenant_id: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
          nurse_id?: string | null
          nurse_name?: string | null
          patient_id?: string
          priority?: string | null
          student_name?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_vitals: {
        Row: {
          blood_pressure_diastolic: number
          blood_pressure_systolic: number
          heart_rate: number
          id: string
          oxygen_delivery: string | null
          oxygen_saturation: number
          patient_id: string | null
          recorded_at: string | null
          respiratory_rate: number
          student_name: string | null
          temperature: number
          tenant_id: string | null
        }
        Insert: {
          blood_pressure_diastolic: number
          blood_pressure_systolic: number
          heart_rate: number
          id?: string
          oxygen_delivery?: string | null
          oxygen_saturation: number
          patient_id?: string | null
          recorded_at?: string | null
          respiratory_rate: number
          student_name?: string | null
          temperature: number
          tenant_id?: string | null
        }
        Update: {
          blood_pressure_diastolic?: number
          blood_pressure_systolic?: number
          heart_rate?: number
          id?: string
          oxygen_delivery?: string | null
          oxygen_saturation?: number
          patient_id?: string | null
          recorded_at?: string | null
          respiratory_rate?: number
          student_name?: string | null
          temperature?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_vitals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_vitals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_vitals_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          frequency_minutes: number | null
          id: string
          is_critical: boolean | null
          normal_range_max: number | null
          normal_range_min: number | null
          notes: string | null
          patient_template_id: string
          unit: string
          updated_at: string | null
          value_diastolic: number | null
          value_numeric: number | null
          value_systolic: number | null
          vital_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          frequency_minutes?: number | null
          id?: string
          is_critical?: boolean | null
          normal_range_max?: number | null
          normal_range_min?: number | null
          notes?: string | null
          patient_template_id: string
          unit: string
          updated_at?: string | null
          value_diastolic?: number | null
          value_numeric?: number | null
          value_systolic?: number | null
          vital_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          frequency_minutes?: number | null
          id?: string
          is_critical?: boolean | null
          normal_range_max?: number | null
          normal_range_min?: number | null
          notes?: string | null
          patient_template_id?: string
          unit?: string
          updated_at?: string | null
          value_diastolic?: number | null
          value_numeric?: number | null
          value_systolic?: number | null
          vital_type?: string
        }
        Relationships: []
      }
      patient_wounds: {
        Row: {
          assessed_by: string
          assessment_date: string
          coordinates_x: number
          coordinates_y: number
          created_at: string | null
          description: string | null
          healing_progress: string
          id: string
          location: string
          patient_id: string | null
          size_depth: number | null
          size_length: number
          size_width: number
          stage: string
          treatment: string | null
          type: string
          updated_at: string | null
          view: string
        }
        Insert: {
          assessed_by: string
          assessment_date?: string
          coordinates_x: number
          coordinates_y: number
          created_at?: string | null
          description?: string | null
          healing_progress: string
          id?: string
          location: string
          patient_id?: string | null
          size_depth?: number | null
          size_length: number
          size_width: number
          stage: string
          treatment?: string | null
          type: string
          updated_at?: string | null
          view: string
        }
        Update: {
          assessed_by?: string
          assessment_date?: string
          coordinates_x?: number
          coordinates_y?: number
          created_at?: string | null
          description?: string | null
          healing_progress?: string
          id?: string
          location?: string
          patient_id?: string | null
          size_depth?: number | null
          size_length?: number
          size_width?: number
          stage?: string
          treatment?: string | null
          type?: string
          updated_at?: string | null
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_wounds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admission_date: string
          allergies: string[] | null
          assigned_nurse: string
          avatar_id: string | null
          bed_number: string
          blood_type: string
          condition: string
          created_at: string | null
          date_of_birth: string
          diagnosis: string
          emergency_contact_name: string
          emergency_contact_phone: string
          emergency_contact_relationship: string
          first_name: string
          gender: string
          id: string
          last_name: string
          patient_id: string
          room_number: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          admission_date: string
          allergies?: string[] | null
          assigned_nurse: string
          avatar_id?: string | null
          bed_number: string
          blood_type: string
          condition: string
          created_at?: string | null
          date_of_birth: string
          diagnosis: string
          emergency_contact_name: string
          emergency_contact_phone: string
          emergency_contact_relationship: string
          first_name: string
          gender: string
          id?: string
          last_name: string
          patient_id: string
          room_number: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          admission_date?: string
          allergies?: string[] | null
          assigned_nurse?: string
          avatar_id?: string | null
          bed_number?: string
          blood_type?: string
          condition?: string
          created_at?: string | null
          date_of_birth?: string
          diagnosis?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          emergency_contact_relationship?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          patient_id?: string
          room_number?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          license_number: string | null
          permissions: string[] | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          license_number?: string | null
          permissions?: string[] | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          license_number?: string | null
          permissions?: string[] | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      simulation_active: {
        Row: {
          allow_late_join: boolean | null
          auto_cleanup: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          duration_minutes: number
          ends_at: string | null
          id: string
          name: string
          primary_categories: string[] | null
          starts_at: string | null
          status: Database["public"]["Enums"]["simulation_active_status"] | null
          sub_categories: string[] | null
          template_id: string
          template_snapshot_version: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_late_join?: boolean | null
          auto_cleanup?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          duration_minutes: number
          ends_at?: string | null
          id?: string
          name: string
          primary_categories?: string[] | null
          starts_at?: string | null
          status?:
            | Database["public"]["Enums"]["simulation_active_status"]
            | null
          sub_categories?: string[] | null
          template_id: string
          template_snapshot_version: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_late_join?: boolean | null
          auto_cleanup?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          name?: string
          primary_categories?: string[] | null
          starts_at?: string | null
          status?:
            | Database["public"]["Enums"]["simulation_active_status"]
            | null
          sub_categories?: string[] | null
          template_id?: string
          template_snapshot_version?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_active_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "simulation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_active_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_active_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_activity_log: {
        Row: {
          action_details: Json | null
          action_type: string
          entity_id: string | null
          entity_type: string | null
          id: string
          notes: string | null
          occurred_at: string | null
          simulation_id: string
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          simulation_id: string
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          simulation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_activity_log_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulation_active"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_history: {
        Row: {
          activity_summary: Json | null
          archive_folder: string | null
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          debrief_data: Json | null
          duration_minutes: number
          ended_at: string | null
          id: string
          instructor_name: string | null
          metrics: Json | null
          name: string
          participants: Json | null
          primary_categories: string[] | null
          simulation_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["simulation_active_status"]
          student_activities: Json | null
          sub_categories: string[] | null
          template_id: string
          tenant_id: string | null
        }
        Insert: {
          activity_summary?: Json | null
          archive_folder?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          debrief_data?: Json | null
          duration_minutes: number
          ended_at?: string | null
          id?: string
          instructor_name?: string | null
          metrics?: Json | null
          name: string
          participants?: Json | null
          primary_categories?: string[] | null
          simulation_id?: string | null
          started_at: string
          status: Database["public"]["Enums"]["simulation_active_status"]
          student_activities?: Json | null
          sub_categories?: string[] | null
          template_id: string
          tenant_id?: string | null
        }
        Update: {
          activity_summary?: Json | null
          archive_folder?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          debrief_data?: Json | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          instructor_name?: string | null
          metrics?: Json | null
          name?: string
          participants?: Json | null
          primary_categories?: string[] | null
          simulation_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["simulation_active_status"]
          student_activities?: Json | null
          sub_categories?: string[] | null
          template_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_history_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_history_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "simulation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_participants: {
        Row: {
          granted_at: string | null
          granted_by: string
          id: string
          last_accessed_at: string | null
          role: Database["public"]["Enums"]["simulation_role"]
          simulation_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by: string
          id?: string
          last_accessed_at?: string | null
          role?: Database["public"]["Enums"]["simulation_role"]
          simulation_id: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string
          id?: string
          last_accessed_at?: string | null
          role?: Database["public"]["Enums"]["simulation_role"]
          simulation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_participants_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulation_active"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_table_config: {
        Row: {
          category: string
          created_at: string | null
          delete_order: number
          enabled: boolean | null
          has_patient_id: boolean | null
          has_tenant_id: boolean | null
          id: number
          notes: string | null
          parent_column: string | null
          parent_table: string | null
          requires_id_mapping: boolean | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          delete_order: number
          enabled?: boolean | null
          has_patient_id?: boolean | null
          has_tenant_id?: boolean | null
          id?: number
          notes?: string | null
          parent_column?: string | null
          parent_table?: string | null
          requires_id_mapping?: boolean | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          delete_order?: number
          enabled?: boolean | null
          has_patient_id?: boolean | null
          has_tenant_id?: boolean | null
          id?: number
          notes?: string | null
          parent_column?: string | null
          parent_table?: string | null
          requires_id_mapping?: boolean | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      simulation_templates: {
        Row: {
          auto_cleanup_after_hours: number | null
          created_at: string | null
          created_by: string
          default_duration_minutes: number | null
          description: string | null
          id: string
          name: string
          snapshot_data: Json | null
          snapshot_taken_at: string | null
          snapshot_version: number | null
          status:
            | Database["public"]["Enums"]["simulation_template_status"]
            | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_cleanup_after_hours?: number | null
          created_at?: string | null
          created_by: string
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          name: string
          snapshot_data?: Json | null
          snapshot_taken_at?: string | null
          snapshot_version?: number | null
          status?:
            | Database["public"]["Enums"]["simulation_template_status"]
            | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_cleanup_after_hours?: number | null
          created_at?: string | null
          created_by?: string
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          name?: string
          snapshot_data?: Json | null
          snapshot_taken_at?: string | null
          snapshot_version?: number | null
          status?:
            | Database["public"]["Enums"]["simulation_template_status"]
            | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string | null
          browser_info: Json | null
          component: string | null
          created_at: string | null
          current_url: string | null
          error_message: string | null
          error_stack: string | null
          id: string
          ip_address: unknown
          log_level: string
          log_type: string
          metadata: Json | null
          previous_url: string | null
          request_data: Json | null
          response_data: Json | null
          session_id: string | null
          tenant_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          browser_info?: Json | null
          component?: string | null
          created_at?: string | null
          current_url?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          ip_address?: unknown
          log_level: string
          log_type: string
          metadata?: Json | null
          previous_url?: string | null
          request_data?: Json | null
          response_data?: Json | null
          session_id?: string | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          browser_info?: Json | null
          component?: string | null
          created_at?: string | null
          current_url?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          ip_address?: unknown
          log_level?: string
          log_type?: string
          metadata?: Json | null
          previous_url?: string | null
          request_data?: Json | null
          response_data?: Json | null
          session_id?: string | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: string[] | null
          role: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: string[] | null
          role?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: string[] | null
          role?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          admin_user_id: string | null
          auto_cleanup_at: string | null
          created_at: string | null
          id: string
          is_simulation: boolean | null
          logo_url: string | null
          max_patients: number
          max_users: number
          name: string
          parent_tenant_id: string | null
          primary_color: string | null
          settings: Json
          simulation_config: Json | null
          simulation_id: string | null
          status: string
          subdomain: string
          subscription_plan: string
          tenant_type: string | null
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          auto_cleanup_at?: string | null
          created_at?: string | null
          id?: string
          is_simulation?: boolean | null
          logo_url?: string | null
          max_patients?: number
          max_users?: number
          name: string
          parent_tenant_id?: string | null
          primary_color?: string | null
          settings?: Json
          simulation_config?: Json | null
          simulation_id?: string | null
          status?: string
          subdomain: string
          subscription_plan?: string
          tenant_type?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          auto_cleanup_at?: string | null
          created_at?: string | null
          id?: string
          is_simulation?: boolean | null
          logo_url?: string | null
          max_patients?: number
          max_users?: number
          name?: string
          parent_tenant_id?: string | null
          primary_color?: string | null
          settings?: Json
          simulation_config?: Json | null
          simulation_id?: string | null
          status?: string
          subdomain?: string
          subscription_plan?: string
          tenant_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          license_number: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          simulation_only: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          first_name?: string
          id: string
          is_active?: boolean | null
          last_name?: string
          license_number?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          simulation_only?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          license_number?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          simulation_only?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          last_activity: string | null
          login_time: string | null
          logout_time: string | null
          session_token: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          login_time?: string | null
          logout_time?: string | null
          session_token?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          login_time?: string | null
          logout_time?: string | null
          session_token?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_sessions_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_sessions_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wound_assessments: {
        Row: {
          assessed_at: string | null
          assessment_data: Json | null
          assessment_date: string | null
          assessment_notes: string | null
          assessor_id: string | null
          assessor_name: string | null
          created_at: string | null
          depth_cm: number | null
          device_functioning: boolean | null
          device_id: string | null
          device_type: string | null
          drainage_amount: string | null
          drainage_type: string[] | null
          dressing_type: string | null
          exudate_amount: string | null
          exudate_type: string | null
          id: string
          length_cm: number | null
          notes: string | null
          odor: string | null
          output_amount_ml: number | null
          pain_level: number | null
          patient_id: string
          periwound_condition: string | null
          photos: string[] | null
          signs_of_infection: string | null
          site_condition: string | null
          stage: string | null
          student_name: string | null
          surrounding_skin: string | null
          tenant_id: string
          treatment_applied: string | null
          updated_at: string | null
          width_cm: number | null
          wound_appearance: string | null
          wound_bed: string | null
          wound_depth_cm: number | null
          wound_id: string | null
          wound_length_cm: number | null
          wound_location: string | null
          wound_type: string | null
          wound_width_cm: number | null
        }
        Insert: {
          assessed_at?: string | null
          assessment_data?: Json | null
          assessment_date?: string | null
          assessment_notes?: string | null
          assessor_id?: string | null
          assessor_name?: string | null
          created_at?: string | null
          depth_cm?: number | null
          device_functioning?: boolean | null
          device_id?: string | null
          device_type?: string | null
          drainage_amount?: string | null
          drainage_type?: string[] | null
          dressing_type?: string | null
          exudate_amount?: string | null
          exudate_type?: string | null
          id?: string
          length_cm?: number | null
          notes?: string | null
          odor?: string | null
          output_amount_ml?: number | null
          pain_level?: number | null
          patient_id: string
          periwound_condition?: string | null
          photos?: string[] | null
          signs_of_infection?: string | null
          site_condition?: string | null
          stage?: string | null
          student_name?: string | null
          surrounding_skin?: string | null
          tenant_id: string
          treatment_applied?: string | null
          updated_at?: string | null
          width_cm?: number | null
          wound_appearance?: string | null
          wound_bed?: string | null
          wound_depth_cm?: number | null
          wound_id?: string | null
          wound_length_cm?: number | null
          wound_location?: string | null
          wound_type?: string | null
          wound_width_cm?: number | null
        }
        Update: {
          assessed_at?: string | null
          assessment_data?: Json | null
          assessment_date?: string | null
          assessment_notes?: string | null
          assessor_id?: string | null
          assessor_name?: string | null
          created_at?: string | null
          depth_cm?: number | null
          device_functioning?: boolean | null
          device_id?: string | null
          device_type?: string | null
          drainage_amount?: string | null
          drainage_type?: string[] | null
          dressing_type?: string | null
          exudate_amount?: string | null
          exudate_type?: string | null
          id?: string
          length_cm?: number | null
          notes?: string | null
          odor?: string | null
          output_amount_ml?: number | null
          pain_level?: number | null
          patient_id?: string
          periwound_condition?: string | null
          photos?: string[] | null
          signs_of_infection?: string | null
          site_condition?: string | null
          stage?: string | null
          student_name?: string | null
          surrounding_skin?: string | null
          tenant_id?: string
          treatment_applied?: string | null
          updated_at?: string | null
          width_cm?: number | null
          wound_appearance?: string | null
          wound_bed?: string | null
          wound_depth_cm?: number | null
          wound_id?: string | null
          wound_length_cm?: number | null
          wound_location?: string | null
          wound_type?: string | null
          wound_width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wound_assessments_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_assessments_wound_id_fkey"
            columns: ["wound_id"]
            isOneToOne: false
            referencedRelation: "wounds"
            referencedColumns: ["id"]
          },
        ]
      }
      wound_treatments: {
        Row: {
          administered_at: string
          administered_by: string
          administered_by_id: string
          created_at: string | null
          id: string
          next_treatment_due: string | null
          patient_id: string
          photos_after: string[] | null
          procedure_notes: string
          products_used: string
          tenant_id: string
          treatment_date: string
          treatment_type: string
          updated_at: string | null
          wound_assessment_id: string | null
        }
        Insert: {
          administered_at?: string
          administered_by: string
          administered_by_id: string
          created_at?: string | null
          id?: string
          next_treatment_due?: string | null
          patient_id: string
          photos_after?: string[] | null
          procedure_notes: string
          products_used: string
          tenant_id: string
          treatment_date?: string
          treatment_type: string
          updated_at?: string | null
          wound_assessment_id?: string | null
        }
        Update: {
          administered_at?: string
          administered_by?: string
          administered_by_id?: string
          created_at?: string | null
          id?: string
          next_treatment_due?: string | null
          patient_id?: string
          photos_after?: string[] | null
          procedure_notes?: string
          products_used?: string
          tenant_id?: string
          treatment_date?: string
          treatment_type?: string
          updated_at?: string | null
          wound_assessment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wound_treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_treatments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wound_treatments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wounds: {
        Row: {
          closure: string | null
          created_at: string
          created_by: string
          drainage_amount: string | null
          drainage_consistency: string[] | null
          drainage_description: string[] | null
          entered_by: string | null
          id: string
          location_id: string
          notes: string | null
          patient_id: string
          peri_wound_temperature: string | null
          suture_staple_line: string | null
          sutures_intact: string | null
          tenant_id: string
          updated_at: string
          wound_depth_cm: number | null
          wound_description: string | null
          wound_edges: string | null
          wound_length_cm: number | null
          wound_odor: string[] | null
          wound_type: Database["public"]["Enums"]["wound_type_enum"]
          wound_width_cm: number | null
        }
        Insert: {
          closure?: string | null
          created_at?: string
          created_by: string
          drainage_amount?: string | null
          drainage_consistency?: string[] | null
          drainage_description?: string[] | null
          entered_by?: string | null
          id?: string
          location_id: string
          notes?: string | null
          patient_id: string
          peri_wound_temperature?: string | null
          suture_staple_line?: string | null
          sutures_intact?: string | null
          tenant_id: string
          updated_at?: string
          wound_depth_cm?: number | null
          wound_description?: string | null
          wound_edges?: string | null
          wound_length_cm?: number | null
          wound_odor?: string[] | null
          wound_type: Database["public"]["Enums"]["wound_type_enum"]
          wound_width_cm?: number | null
        }
        Update: {
          closure?: string | null
          created_at?: string
          created_by?: string
          drainage_amount?: string | null
          drainage_consistency?: string[] | null
          drainage_description?: string[] | null
          entered_by?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          patient_id?: string
          peri_wound_temperature?: string | null
          suture_staple_line?: string | null
          sutures_intact?: string | null
          tenant_id?: string
          updated_at?: string
          wound_depth_cm?: number | null
          wound_description?: string | null
          wound_edges?: string | null
          wound_length_cm?: number | null
          wound_odor?: string[] | null
          wound_type?: Database["public"]["Enums"]["wound_type_enum"]
          wound_width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wounds_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "avatar_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wounds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wounds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wounds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patient_alerts_view: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database["public"]["Enums"]["alert_type_enum"] | null
          created_at: string | null
          id: string | null
          message: string | null
          patient_id: string | null
          patient_name: string | null
          priority: Database["public"]["Enums"]["alert_priority_enum"] | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_subdomain: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_login_history: {
        Row: {
          email: string | null
          first_name: string | null
          id: string | null
          ip_address: unknown
          last_name: string | null
          login_rank: number | null
          login_time: string | null
          logout_time: string | null
          status: string | null
          tenant_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Relationships: []
      }
      tenant_statistics: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          patient_count: number | null
          user_count: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      user_tenant_access: {
        Row: {
          is_active: boolean | null
          tenant_id: string | null
          user_id: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenant_cache: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          role: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acknowledge_alert_for_tenant: {
        Args: { p_alert_id: string; p_tenant_id: string }
        Returns: Json
      }
      add_simulation_user: {
        Args: {
          p_email: string
          p_password?: string
          p_role: string
          p_simulation_tenant_id: string
          p_username: string
        }
        Returns: string
      }
      assign_current_user_to_tenant: {
        Args: { target_tenant_id: string }
        Returns: string
      }
      assign_user_to_tenant: {
        Args: { tenant_id_param: string; user_id_param: string }
        Returns: undefined
      }
      assign_users_to_simulation: {
        Args: { p_role?: string; p_run_id: string; p_user_ids: string[] }
        Returns: number
      }
      authenticate_simulation_user: {
        Args: {
          p_password: string
          p_simulation_tenant_id?: string
          p_username: string
        }
        Returns: {
          email: string
          is_simulation_user: boolean
          role: string
          simulation_id: string
          tenant_id: string
          tenant_name: string
          user_id: string
          username: string
        }[]
      }
      calculate_simulation_metrics: {
        Args: { p_simulation_id: string }
        Returns: Json
      }
      cleanup_all_problem_simulations: { Args: never; Returns: Json }
      cleanup_backup_audit_logs: { Args: never; Returns: number }
      cleanup_expired_simulations: { Args: never; Returns: number }
      cleanup_old_sessions: { Args: never; Returns: number }
      cleanup_old_user_sessions: { Args: never; Returns: undefined }
      cleanup_orphaned_users: { Args: never; Returns: number }
      complete_simulation: {
        Args: {
          p_activities?: Json
          p_instructor_name?: string
          p_simulation_id: string
        }
        Returns: Json
      }
      confirm_user_email: { Args: { target_user_id: string }; Returns: boolean }
      create_alert_for_tenant: {
        Args: {
          p_alert_type: string
          p_expires_at?: string
          p_message: string
          p_patient_id: string
          p_patient_name: string
          p_priority?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_alert_for_tenant_v2: {
        Args: {
          p_alert_type: string
          p_expires_at?: string
          p_message: string
          p_patient_id: string
          p_patient_name?: string
          p_priority?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_confirmed_user: {
        Args: {
          first_name?: string
          last_name?: string
          user_email: string
          user_password: string
          user_role?: string
        }
        Returns: {
          email: string
          message: string
          user_id: string
        }[]
      }
      create_medication_super_admin: {
        Args: {
          p_admin_time?: string
          p_category?: string
          p_dosage: string
          p_end_date?: string
          p_frequency: string
          p_name: string
          p_patient_id: string
          p_prescribed_by?: string
          p_route: string
          p_start_date: string
          p_status?: string
        }
        Returns: {
          admin_time: string
          category: string
          created_at: string
          dosage: string
          end_date: string
          frequency: string
          last_administered: string
          medication_id: string
          name: string
          next_due: string
          patient_id: string
          prescribed_by: string
          route: string
          start_date: string
          status: string
          tenant_id: string
        }[]
      }
      create_patient_alert_v2: {
        Args: {
          p_alert_type: string
          p_expires_at?: string
          p_message?: string
          p_patient_id: string
          p_patient_name?: string
          p_priority?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_patient_alert_v3: {
        Args: {
          p_alert_type: string
          p_expires_at?: string
          p_message?: string
          p_patient_id: string
          p_patient_name?: string
          p_priority?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_patient_medication: {
        Args: {
          p_admin_time?: string
          p_admin_times?: string[]
          p_category?: string
          p_dosage: string
          p_end_date?: string
          p_frequency: string
          p_name: string
          p_patient_id: string
          p_prescribed_by?: string
          p_route?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: string
      }
      create_patient_note: {
        Args: {
          p_content: string
          p_created_by?: string
          p_note_type: string
          p_patient_id: string
          p_priority?: string
        }
        Returns: string
      }
      create_patient_vitals: {
        Args: {
          p_blood_pressure_diastolic?: number
          p_blood_pressure_systolic?: number
          p_heart_rate?: number
          p_oxygen_delivery?: string
          p_oxygen_saturation?: number
          p_patient_id: string
          p_recorded_at?: string
          p_respiratory_rate?: number
          p_temperature?: number
        }
        Returns: string
      }
      create_simulation_snapshot: {
        Args: {
          p_description?: string
          p_name: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_simulation_subtenant: {
        Args: {
          p_parent_tenant_id: string
          p_simulation_id: string
          p_simulation_name: string
        }
        Returns: string
      }
      create_simulation_template: {
        Args: {
          p_default_duration_minutes?: number
          p_description?: string
          p_name: string
        }
        Returns: Json
      }
      create_snapshot: {
        Args: { p_description?: string; p_name: string; p_template_id: string }
        Returns: string
      }
      create_user_profile: {
        Args: {
          first_name?: string
          last_name?: string
          user_email?: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          created_at: string | null
          department: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          license_number: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          simulation_only: boolean | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_user_session: {
        Args: {
          p_ip_address: unknown
          p_tenant_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      current_user_is_super_admin: { Args: never; Returns: boolean }
      deactivate_user: { Args: { target_user_id: string }; Returns: string }
      delete_medication_super_admin: {
        Args: { p_medication_id: string }
        Returns: boolean
      }
      delete_patient_template: {
        Args: { p_patient_template_id: string }
        Returns: boolean
      }
      delete_scenario_template: {
        Args: { p_scenario_template_id: string }
        Returns: boolean
      }
      delete_simulation: {
        Args: { p_archive_to_history?: boolean; p_simulation_id: string }
        Returns: Json
      }
      delete_tenant_secure: {
        Args: { target_tenant_id: string }
        Returns: string
      }
      delete_user_permanently: {
        Args: { target_user_id: string }
        Returns: string
      }
      duplicate_patient_to_tenant: {
        Args: {
          p_include_alerts?: boolean
          p_include_assessments?: boolean
          p_include_bowel_records?: boolean
          p_include_diabetic_records?: boolean
          p_include_doctors_orders?: boolean
          p_include_hacmap?: boolean
          p_include_handover_notes?: boolean
          p_include_intake_output?: boolean
          p_include_labs?: boolean
          p_include_medications?: boolean
          p_include_vitals?: boolean
          p_include_wound_care?: boolean
          p_new_patient_id?: string
          p_source_patient_id: string
          p_target_tenant_id: string
        }
        Returns: {
          message: string
          new_patient_id: string
          new_patient_identifier: string
          records_created: Json
          success: boolean
        }[]
      }
      end_user_session: { Args: never; Returns: boolean }
      ensure_user_profile: {
        Args: { user_email: string; user_id: string }
        Returns: {
          created_at: string | null
          department: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          license_number: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          simulation_only: boolean | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fetch_medications_for_tenant: {
        Args: { target_tenant_id: string }
        Returns: {
          dosage: string
          frequency: string
          medication_id: string
          name: string
          patient_first_name: string
          patient_id: string
          patient_last_name: string
          prescribed_by: string
          route: string
          start_date: string
          tenant_id: string
        }[]
      }
      find_user_by_email: {
        Args: { email_param: string }
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      fix_user_role_mismatches: { Args: never; Returns: number }
      generate_simulation_id_sets: {
        Args: {
          p_session_count: number
          p_session_names?: string[]
          p_template_id: string
        }
        Returns: Json
      }
      get_available_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      get_available_tenants_for_transfer: {
        Args: { p_source_patient_id: string }
        Returns: {
          subdomain: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_backup_statistics: { Args: never; Returns: Json }
      get_current_user_tenant_id: { Args: never; Returns: string }
      get_secure_alerts: {
        Args: never
        Returns: {
          acknowledged: boolean
          acknowledged_at: string
          acknowledged_by: string
          alert_id: string
          alert_type: string
          created_at: string
          message: string
          patient_id: string
          patient_name: string
          priority: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_simulation_label_data: {
        Args: { p_session_number: number; p_template_id: string }
        Returns: Json
      }
      get_super_admin_tenant_context: { Args: never; Returns: string }
      get_tenant_users: {
        Args: { target_tenant_id: string }
        Returns: {
          email: string
          first_name: string
          is_active: boolean
          last_name: string
          permissions: string[]
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      get_user_active_tenants: {
        Args: { user_uuid?: string }
        Returns: {
          tenant_id: string
          tenant_name: string
          user_role: string
        }[]
      }
      get_user_current_tenant: {
        Args: { target_user_id: string }
        Returns: {
          is_active: boolean
          role: string
          tenant_id: string
        }[]
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      get_user_simulation_assignments: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_simulation_tenant_access: { Args: never; Returns: string }
      get_user_tenant:
        | { Args: never; Returns: string }
        | { Args: { user_uuid: string }; Returns: string }
      get_user_tenant_assignments: {
        Args: { target_user_id: string }
        Returns: {
          is_active: boolean
          role: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_user_tenant_direct: { Args: { user_uuid?: string }; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenant_ids: { Args: { user_uuid?: string }; Returns: string[] }
      instantiate_simulation_patients: {
        Args: { p_scenario_template_id: string; p_simulation_id: string }
        Returns: number
      }
      is_admin_user: { Args: { user_id: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_super_admin_direct: { Args: { user_uuid?: string }; Returns: boolean }
      is_super_admin_user: { Args: { user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { tenant_uuid: string; user_uuid?: string }
        Returns: boolean
      }
      launch_run: {
        Args: { p_run_name: string; p_snapshot_id: string }
        Returns: string
      }
      launch_simulation: {
        Args: {
          p_duration_minutes: number
          p_name: string
          p_participant_roles?: string[]
          p_participant_user_ids: string[]
          p_primary_categories?: string[]
          p_sub_categories?: string[]
          p_template_id: string
        }
        Returns: {
          message: string
          simulation_id: string
          tenant_id: string
        }[]
      }
      launch_simulation_instance: {
        Args: {
          p_name: string
          p_snapshot_id: string
          p_template_id: string
          p_user_id: string
        }
        Returns: string
      }
      mark_expired_backups: { Args: never; Returns: number }
      move_patient_to_tenant:
        | {
            Args: { p_patient_id: string; p_target_tenant_id: string }
            Returns: boolean
          }
        | {
            Args: { p_source_patient_id: string; p_target_tenant_id: string }
            Returns: {
              patient_id: string
              patient_identifier: string
              records_updated: Json
            }[]
          }
      reactivate_user: { Args: { target_user_id: string }; Returns: string }
      record_simulation_activity: {
        Args: {
          p_action_data: Json
          p_action_type: string
          p_simulation_id: string
          p_student_id: string
        }
        Returns: string
      }
      refresh_user_tenant_cache: { Args: never; Returns: undefined }
      remove_user_from_tenant: {
        Args: { tenant_uuid: string; user_uuid: string }
        Returns: boolean
      }
      reset_run: { Args: { p_run_id: string }; Returns: Json }
      reset_simulation_for_next_session: {
        Args: { p_simulation_id: string }
        Returns: Json
      }
      reset_simulation_for_next_session_v2: {
        Args: { p_simulation_id: string }
        Returns: Json
      }
      reset_simulation_instance: {
        Args: { p_instance_id: string; p_user_id: string }
        Returns: boolean
      }
      restore_snapshot_to_tenant: {
        Args: {
          p_barcode_mappings?: Json
          p_id_mappings?: Json
          p_preserve_barcodes?: boolean
          p_skip_patients?: boolean
          p_snapshot: Json
          p_tenant_id: string
        }
        Returns: Json
      }
      restore_snapshot_to_tenant_v2: {
        Args: { p_snapshot: Json; p_tenant_id: string }
        Returns: Json
      }
      save_template_snapshot_v2: {
        Args: { p_template_id: string }
        Returns: Json
      }
      set_super_admin_tenant_context: {
        Args: { target_tenant_id: string }
        Returns: undefined
      }
      update_medication_super_admin: {
        Args: { p_medication_id: string; p_updates: Json }
        Returns: {
          admin_time: string | null
          admin_times: Json | null
          category: string | null
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          last_administered: string | null
          name: string
          next_due: string
          patient_id: string | null
          prescribed_by: string
          route: string
          start_date: string
          status: string
          tenant_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "patient_medications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_simulation_categories: {
        Args: {
          p_primary_categories?: string[]
          p_simulation_id: string
          p_sub_categories?: string[]
        }
        Returns: boolean
      }
      update_simulation_history_categories: {
        Args: {
          p_primary_categories?: string[]
          p_simulation_id: string
          p_sub_categories?: string[]
        }
        Returns: boolean
      }
      update_user_profile_admin: {
        Args: {
          p_department?: string
          p_first_name: string
          p_is_active?: boolean
          p_last_name: string
          p_license_number?: string
          p_phone?: string
          p_role: string
          p_simulation_only?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      user_has_patient_access: {
        Args: { patient_tenant_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          permission_name: string
          tenant_uuid?: string
          user_uuid: string
        }
        Returns: boolean
      }
      user_has_tenant_access:
        | { Args: never; Returns: boolean }
        | { Args: { tenant_uuid: string; user_uuid: string }; Returns: boolean }
      user_is_super_admin: { Args: { user_uuid: string }; Returns: boolean }
      validate_subdomain: {
        Args: { subdomain_input: string }
        Returns: boolean
      }
    }
    Enums: {
      ack_scope: "panel" | "result"
      alert_priority_enum: "low" | "medium" | "high" | "critical"
      alert_type_enum:
        | "medication_due"
        | "vital_signs"
        | "emergency"
        | "lab_results"
        | "discharge_ready"
      device_type_enum:
        | "closed-suction-drain"
        | "chest-tube"
        | "foley"
        | "iv-peripheral"
        | "iv-picc"
        | "iv-port"
        | "other"
        | "feeding-tube"
      lab_category: "chemistry" | "abg" | "hematology"
      lab_flag:
        | "normal"
        | "abnormal_high"
        | "abnormal_low"
        | "critical_high"
        | "critical_low"
      lab_panel_status: "new" | "partial_ack" | "acknowledged"
      orientation_enum:
        | "superior"
        | "inferior"
        | "medial"
        | "lateral"
        | "anterior"
        | "posterior"
      ref_operator: "between" | ">=" | "<=" | "sex-specific"
      reservoir_type_enum:
        | "jackson-pratt"
        | "hemovac"
        | "penrose"
        | "other"
        | "urinary-drainage-bag"
      simulation_active_status:
        | "pending"
        | "running"
        | "paused"
        | "completed"
        | "expired"
        | "cancelled"
      simulation_role: "instructor" | "student"
      simulation_template_status: "draft" | "ready" | "archived"
      tenant_type: "production" | "institution" | "hospital" | "clinic" | "simulation_template" | "simulation_active" | "program"
      user_role: "nurse" | "admin" | "super_admin" | "instructor"
      wound_type_enum:
        | "incision"
        | "laceration"
        | "surgical-site"
        | "pressure-injury"
        | "skin-tear"
        | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ack_scope: ["panel", "result"],
      alert_priority_enum: ["low", "medium", "high", "critical"],
      alert_type_enum: [
        "medication_due",
        "vital_signs",
        "emergency",
        "lab_results",
        "discharge_ready",
      ],
      device_type_enum: [
        "closed-suction-drain",
        "chest-tube",
        "foley",
        "iv-peripheral",
        "iv-picc",
        "iv-port",
        "other",
        "feeding-tube",
      ],
      lab_category: ["chemistry", "abg", "hematology"],
      lab_flag: [
        "normal",
        "abnormal_high",
        "abnormal_low",
        "critical_high",
        "critical_low",
      ],
      lab_panel_status: ["new", "partial_ack", "acknowledged"],
      orientation_enum: [
        "superior",
        "inferior",
        "medial",
        "lateral",
        "anterior",
        "posterior",
      ],
      ref_operator: ["between", ">=", "<=", "sex-specific"],
      reservoir_type_enum: [
        "jackson-pratt",
        "hemovac",
        "penrose",
        "other",
        "urinary-drainage-bag",
      ],
      simulation_active_status: [
        "pending",
        "running",
        "paused",
        "completed",
        "expired",
        "cancelled",
      ],
      simulation_role: ["instructor", "student"],
      simulation_template_status: ["draft", "ready", "archived"],
      tenant_type: ["production", "institution", "hospital", "clinic", "simulation_template", "simulation_active", "program"],
      user_role: ["nurse", "admin", "super_admin", "instructor"],
      wound_type_enum: [
        "incision",
        "laceration",
        "surgical-site",
        "pressure-injury",
        "skin-tear",
        "other",
      ],
    },
  },
} as const
