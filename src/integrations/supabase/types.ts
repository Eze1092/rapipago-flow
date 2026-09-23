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
      acreditaciones: {
        Row: {
          comprobante: string
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_acreditacion"]
          fecha_acreditacion: string
          id: string
          importe: number
          observaciones: string
          retiro_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comprobante?: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_acreditacion"]
          fecha_acreditacion?: string
          id?: string
          importe: number
          observaciones?: string
          retiro_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comprobante?: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_acreditacion"]
          fecha_acreditacion?: string
          id?: string
          importe?: number
          observaciones?: string
          retiro_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acreditaciones_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      ajustes: {
        Row: {
          boca_id: string | null
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          importe: number
          motivo: string
          tipo: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Insert: {
          boca_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          importe: number
          motivo?: string
          tipo: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Update: {
          boca_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          importe?: number
          motivo?: string
          tipo?: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_boca_id_fkey"
            columns: ["boca_id"]
            isOneToOne: false
            referencedRelation: "bocas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          created_at: string
          id: string
          registro_id: string | null
          tabla: string
          usuario_id: string | null
          valores_anteriores: Json | null
          valores_nuevos: Json | null
        }
        Insert: {
          accion: string
          created_at?: string
          id?: string
          registro_id?: string | null
          tabla: string
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Update: {
          accion?: string
          created_at?: string
          id?: string
          registro_id?: string | null
          tabla?: string
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Relationships: []
      }
      bocas: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      cierres: {
        Row: {
          cantidad_operaciones: number
          created_at: string
          created_by: string | null
          detalle: Json
          estado: Database["public"]["Enums"]["estado_cierre"]
          fecha: string
          id: string
          observaciones: string
          total: number
        }
        Insert: {
          cantidad_operaciones?: number
          created_at?: string
          created_by?: string | null
          detalle?: Json
          estado?: Database["public"]["Enums"]["estado_cierre"]
          fecha: string
          id?: string
          observaciones?: string
          total?: number
        }
        Update: {
          cantidad_operaciones?: number
          created_at?: string
          created_by?: string | null
          detalle?: Json
          estado?: Database["public"]["Enums"]["estado_cierre"]
          fecha?: string
          id?: string
          observaciones?: string
          total?: number
        }
        Relationships: []
      }
      movimientos_atm: {
        Row: {
          boca_id: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_atm"]
          fecha: string
          hora: string
          id: string
          importe: number
          observaciones: string
          tipo: Database["public"]["Enums"]["tipo_atm"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          boca_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_atm"]
          fecha?: string
          hora?: string
          id?: string
          importe: number
          observaciones?: string
          tipo?: Database["public"]["Enums"]["tipo_atm"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          boca_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_atm"]
          fecha?: string
          hora?: string
          id?: string
          importe?: number
          observaciones?: string
          tipo?: Database["public"]["Enums"]["tipo_atm"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_atm_boca_id_fkey"
            columns: ["boca_id"]
            isOneToOne: false
            referencedRelation: "bocas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string
          id: string
          nombre?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      recaudaciones: {
        Row: {
          boca_id: string
          cajero_id: string | null
          cajero_nombre: string
          cierre_id: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_recaudacion"]
          fecha: string
          hora: string
          id: string
          importe: number
          observaciones: string
          retiro_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          boca_id: string
          cajero_id?: string | null
          cajero_nombre?: string
          cierre_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_recaudacion"]
          fecha?: string
          hora?: string
          id?: string
          importe: number
          observaciones?: string
          retiro_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          boca_id?: string
          cajero_id?: string | null
          cajero_nombre?: string
          cierre_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_recaudacion"]
          fecha?: string
          hora?: string
          id?: string
          importe?: number
          observaciones?: string
          retiro_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recaudaciones_boca_id_fkey"
            columns: ["boca_id"]
            isOneToOne: false
            referencedRelation: "bocas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recaudaciones_cajero_id_fkey"
            columns: ["cajero_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recaudaciones_cierre_fk"
            columns: ["cierre_id"]
            isOneToOne: false
            referencedRelation: "cierres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recaudaciones_retiro_fk"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      retiro_bocas: {
        Row: {
          boca_id: string
          retiro_id: string
        }
        Insert: {
          boca_id: string
          retiro_id: string
        }
        Update: {
          boca_id?: string
          retiro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiro_bocas_boca_id_fkey"
            columns: ["boca_id"]
            isOneToOne: false
            referencedRelation: "bocas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_bocas_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      retiros: {
        Row: {
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_retiro"]
          fecha: string
          hora: string
          id: string
          importe_declarado: number
          importe_retirado: number
          observaciones: string
          remito: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_retiro"]
          fecha?: string
          hora?: string
          id?: string
          importe_declarado: number
          importe_retirado: number
          observaciones?: string
          remito?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_retiro"]
          fecha?: string
          hora?: string
          id?: string
          importe_declarado?: number
          importe_retirado?: number
          observaciones?: string
          remito?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      cerrar_jornada: {
        Args: { _fecha: string; _observaciones?: string }
        Returns: string
      }
      es_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      historial: {
        Args: { _desde?: string; _hasta?: string }
        Returns: {
          boca: string
          cajero: string
          creado: string
          descripcion: string
          estado: string
          fecha: string
          hora: string
          id: string
          importe: number
          tipo: string
          usuario: string
        }[]
      }
      resumen_general: { Args: never; Returns: Json }
      resumen_por_boca: {
        Args: { _desde?: string; _hasta?: string }
        Returns: {
          boca_id: string
          codigo: string
          operaciones: number
          total: number
        }[]
      }
      resumen_por_cajero: {
        Args: { _desde?: string; _hasta?: string }
        Returns: {
          cajero: string
          operaciones: number
          total: number
        }[]
      }
      serie_diaria: {
        Args: { _dias?: number }
        Returns: {
          fecha: string
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "ADMIN" | "CAJERO"
      estado_acreditacion: "ACREDITADO" | "ANULADO"
      estado_atm: "REGISTRADO" | "ANULADO"
      estado_cierre: "CERRADO" | "ANULADO"
      estado_recaudacion: "RECAUDADO" | "RETIRADO" | "ANULADO"
      estado_retiro: "PENDIENTE_ACREDITACION" | "ACREDITADO" | "ANULADO"
      tipo_ajuste: "POSITIVO" | "NEGATIVO"
      tipo_atm: "CARGA" | "REINTEGRO"
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
      app_role: ["ADMIN", "CAJERO"],
      estado_acreditacion: ["ACREDITADO", "ANULADO"],
      estado_atm: ["REGISTRADO", "ANULADO"],
      estado_cierre: ["CERRADO", "ANULADO"],
      estado_recaudacion: ["RECAUDADO", "RETIRADO", "ANULADO"],
      estado_retiro: ["PENDIENTE_ACREDITACION", "ACREDITADO", "ANULADO"],
      tipo_ajuste: ["POSITIVO", "NEGATIVO"],
      tipo_atm: ["CARGA", "REINTEGRO"],
    },
  },
} as const
