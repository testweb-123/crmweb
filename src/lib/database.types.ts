// Escrito a mano a partir de supabase/migrations para poder compilar sin proyecto vinculado.
// Una vez vinculado, regenerar con: npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: Database['public']['Enums']['user_role']
          avatar_url: string | null
          active: boolean
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name: string
          role?: Database['public']['Enums']['user_role']
          avatar_url?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: Database['public']['Enums']['user_role']
          avatar_url?: string | null
          active?: boolean
          email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          ruc: string | null
          industry: string | null
          website: string | null
          phone: string | null
          address: string | null
          city: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          ruc?: string | null
          industry?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          ruc?: string | null
          industry?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'companies_owner_id_fkey'; columns: ['owner_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      contacts: {
        Row: {
          id: string
          company_id: string | null
          first_name: string
          last_name: string | null
          email: string | null
          phone: string | null
          position: string | null
          status: Database['public']['Enums']['contact_status']
          source: string | null
          notes: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          first_name: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          position?: string | null
          status?: Database['public']['Enums']['contact_status']
          source?: string | null
          notes?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          first_name?: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          position?: string | null
          status?: Database['public']['Enums']['contact_status']
          source?: string | null
          notes?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'contacts_company_id_fkey'; columns: ['company_id']; isOneToOne: false; referencedRelation: 'companies'; referencedColumns: ['id'] },
          { foreignKeyName: 'contacts_owner_id_fkey'; columns: ['owner_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      pipeline_stages: {
        Row: {
          id: number
          name: string
          position: number
          probability: number
          is_won: boolean
          is_lost: boolean
        }
        Insert: {
          id?: number
          name: string
          position: number
          probability?: number
          is_won?: boolean
          is_lost?: boolean
        }
        Update: {
          id?: number
          name?: string
          position?: number
          probability?: number
          is_won?: boolean
          is_lost?: boolean
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          title: string
          company_id: string | null
          contact_id: string | null
          stage_id: number
          value: number
          currency: string
          expected_close: string | null
          closed_at: string | null
          lost_reason: string | null
          position: number
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          company_id?: string | null
          contact_id?: string | null
          stage_id?: number
          value?: number
          currency?: string
          expected_close?: string | null
          closed_at?: string | null
          lost_reason?: string | null
          position?: number
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          company_id?: string | null
          contact_id?: string | null
          stage_id?: number
          value?: number
          currency?: string
          expected_close?: string | null
          closed_at?: string | null
          lost_reason?: string | null
          position?: number
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'deals_company_id_fkey'; columns: ['company_id']; isOneToOne: false; referencedRelation: 'companies'; referencedColumns: ['id'] },
          { foreignKeyName: 'deals_contact_id_fkey'; columns: ['contact_id']; isOneToOne: false; referencedRelation: 'contacts'; referencedColumns: ['id'] },
          { foreignKeyName: 'deals_stage_id_fkey'; columns: ['stage_id']; isOneToOne: false; referencedRelation: 'pipeline_stages'; referencedColumns: ['id'] },
          { foreignKeyName: 'deals_owner_id_fkey'; columns: ['owner_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      activities: {
        Row: {
          id: string
          type: Database['public']['Enums']['activity_type']
          subject: string
          body: string | null
          due_at: string | null
          done_at: string | null
          company_id: string | null
          contact_id: string | null
          deal_id: string | null
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          type: Database['public']['Enums']['activity_type']
          subject: string
          body?: string | null
          due_at?: string | null
          done_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          deal_id?: string | null
          owner_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: Database['public']['Enums']['activity_type']
          subject?: string
          body?: string | null
          due_at?: string | null
          done_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          deal_id?: string | null
          owner_id?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'activities_company_id_fkey'; columns: ['company_id']; isOneToOne: false; referencedRelation: 'companies'; referencedColumns: ['id'] },
          { foreignKeyName: 'activities_contact_id_fkey'; columns: ['contact_id']; isOneToOne: false; referencedRelation: 'contacts'; referencedColumns: ['id'] },
          { foreignKeyName: 'activities_deal_id_fkey'; columns: ['deal_id']; isOneToOne: false; referencedRelation: 'deals'; referencedColumns: ['id'] },
          { foreignKeyName: 'activities_owner_id_fkey'; columns: ['owner_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      attachments: {
        Row: {
          id: string
          path: string
          file_name: string
          size_bytes: number | null
          company_id: string | null
          contact_id: string | null
          deal_id: string | null
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          path: string
          file_name: string
          size_bytes?: number | null
          company_id?: string | null
          contact_id?: string | null
          deal_id?: string | null
          owner_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          path?: string
          file_name?: string
          size_bytes?: number | null
          company_id?: string | null
          contact_id?: string | null
          deal_id?: string | null
          owner_id?: string
          created_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: { id: number; name: string; color: string }
        Insert: { id?: number; name: string; color?: string }
        Update: { id?: number; name?: string; color?: string }
        Relationships: []
      }
      contact_tags: {
        Row: { contact_id: string; tag_id: number }
        Insert: { contact_id: string; tag_id: number }
        Update: { contact_id?: string; tag_id?: number }
        Relationships: [
          { foreignKeyName: 'contact_tags_contact_id_fkey'; columns: ['contact_id']; isOneToOne: false; referencedRelation: 'contacts'; referencedColumns: ['id'] },
          { foreignKeyName: 'contact_tags_tag_id_fkey'; columns: ['tag_id']; isOneToOne: false; referencedRelation: 'tags'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: {
      v_pipeline_summary: {
        Row: {
          id: number | null
          name: string | null
          position: number | null
          probability: number | null
          is_won: boolean | null
          is_lost: boolean | null
          deals: number | null
          total_value: number | null
          weighted_value: number | null
        }
        Relationships: []
      }
      v_won_by_month: {
        Row: {
          month: string | null
          owner_id: string | null
          seller: string | null
          deals: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_role_is: { Args: { r: Database['public']['Enums']['user_role'] }; Returns: boolean }
      is_manager_or_admin: { Args: never; Returns: boolean }
      ping: { Args: never; Returns: boolean }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'sales'
      contact_status: 'lead' | 'prospect' | 'customer' | 'inactive'
      activity_type: 'call' | 'meeting' | 'email' | 'task' | 'note' | 'whatsapp'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
