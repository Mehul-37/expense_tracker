// Simplified database types for Supabase
// Using loose typing to avoid complex generic issues

export interface Database {
  public: {
    Tables: {
      users: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      groups: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      group_members: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      expenses: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      expense_splits: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      payments: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
      budgets: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
