export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      pages: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          creator: string | null
          config: Json
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          creator?: string | null
          config: Json
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          creator?: string | null
          config?: Json
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          source: string
          raw_payload: Json | null
          email: string | null
          phone: string | null
          name: string | null
          message: string | null
          status: string
          assigned_to: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          source: string
          raw_payload?: Json | null
          email?: string | null
          phone?: string | null
          name?: string | null
          message?: string | null
          status?: string
          assigned_to?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          source?: string
          raw_payload?: Json | null
          email?: string | null
          phone?: string | null
          name?: string | null
          message?: string | null
          status?: string
          assigned_to?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      amocrm_contacts: {
        Row: {
          id: string
          data: Json
          synced_at: string
        }
        Insert: {
          id: string
          data: Json
          synced_at?: string
        }
        Update: {
          id?: string
          data?: Json
          synced_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          lead_id: string | null
          caller: string | null
          callee: string | null
          duration: number | null
          status: string | null
          raw: Json | null
          created_at: string
        }
        Insert: {
          id: string
          lead_id?: string | null
          caller?: string | null
          callee?: string | null
          duration?: number | null
          status?: string | null
          raw?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          caller?: string | null
          callee?: string | null
          duration?: number | null
          status?: string | null
          raw?: Json | null
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          name: string
          type: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

