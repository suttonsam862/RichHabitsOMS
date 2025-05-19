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
      users: {
        Row: {
          id: number
          email: string
          username: string
          password: string
          firstName: string | null
          lastName: string | null
          role: string
          createdAt: string
          stripeCustomerId: string | null
        }
        Insert: {
          id?: number
          email: string
          username: string
          password: string
          firstName?: string | null
          lastName?: string | null
          role: string
          createdAt?: string
          stripeCustomerId?: string | null
        }
        Update: {
          id?: number
          email?: string
          username?: string
          password?: string
          firstName?: string | null
          lastName?: string | null
          role?: string
          createdAt?: string
          stripeCustomerId?: string | null
        }
      }
      customers: {
        Row: {
          id: number
          userId: number
          firstName: string
          lastName: string
          email: string
          phone: string | null
          company: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          country: string | null
          createdAt: string
          metadata: Json | null
        }
        Insert: {
          id?: number
          userId: number
          firstName: string
          lastName: string
          email: string
          phone?: string | null
          company?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          createdAt?: string
          metadata?: Json | null
        }
        Update: {
          id?: number
          userId?: number
          firstName?: string
          lastName?: string
          email?: string
          phone?: string | null
          company?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          createdAt?: string
          metadata?: Json | null
        }
      }
      orders: {
        Row: {
          id: number
          orderNumber: string
          customerId: number
          salespersonId: number | null
          status: string
          totalAmount: number
          paymentStatus: string
          notes: string | null
          createdAt: string
          updatedAt: string
          manufacturerId: number | null
          stripeSessionId: string | null
          metadata: Json | null
        }
        Insert: {
          id?: number
          orderNumber: string
          customerId: number
          salespersonId?: number | null
          status: string
          totalAmount: number
          paymentStatus: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          manufacturerId?: number | null
          stripeSessionId?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: number
          orderNumber?: string
          customerId?: number
          salespersonId?: number | null
          status?: string
          totalAmount?: number
          paymentStatus?: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          manufacturerId?: number | null
          stripeSessionId?: string | null
          metadata?: Json | null
        }
      }
      order_items: {
        Row: {
          id: number
          orderId: number
          name: string
          description: string | null
          quantity: number
          unitPrice: number
          color: string | null
          size: string | null
          material: string | null
          metadata: Json | null
        }
        Insert: {
          id?: number
          orderId: number
          name: string
          description?: string | null
          quantity: number
          unitPrice: number
          color?: string | null
          size?: string | null
          material?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: number
          orderId?: number
          name?: string
          description?: string | null
          quantity?: number
          unitPrice?: number
          color?: string | null
          size?: string | null
          material?: string | null
          metadata?: Json | null
        }
      }
      design_tasks: {
        Row: {
          id: number
          orderId: number
          designerId: number | null
          status: string
          requirements: string | null
          dueDate: string | null
          createdAt: string
          updatedAt: string
          completedAt: string | null
          metadata: Json | null
        }
        Insert: {
          id?: number
          orderId: number
          designerId?: number | null
          status: string
          requirements?: string | null
          dueDate?: string | null
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: number
          orderId?: number
          designerId?: number | null
          status?: string
          requirements?: string | null
          dueDate?: string | null
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          metadata?: Json | null
        }
      }
      design_files: {
        Row: {
          id: number
          designTaskId: number
          userId: number
          filename: string
          fileType: string
          filePath: string
          notes: string | null
          createdAt: string
          metadata: Json | null
        }
        Insert: {
          id?: number
          designTaskId: number
          userId: number
          filename: string
          fileType: string
          filePath: string
          notes?: string | null
          createdAt?: string
          metadata?: Json | null
        }
        Update: {
          id?: number
          designTaskId?: number
          userId?: number
          filename?: string
          fileType?: string
          filePath?: string
          notes?: string | null
          createdAt?: string
          metadata?: Json | null
        }
      }
      production_tasks: {
        Row: {
          id: number
          orderId: number
          manufacturerId: number | null
          status: string
          startDate: string | null
          endDate: string | null
          notes: string | null
          createdAt: string
          updatedAt: string
          completedAt: string | null
          metadata: Json | null
        }
        Insert: {
          id?: number
          orderId: number
          manufacturerId?: number | null
          status: string
          startDate?: string | null
          endDate?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: number
          orderId?: number
          manufacturerId?: number | null
          status?: string
          startDate?: string | null
          endDate?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
          completedAt?: string | null
          metadata?: Json | null
        }
      }
      messages: {
        Row: {
          id: number
          senderId: number
          receiverId: number
          orderId: number | null
          content: string
          readAt: string | null
          createdAt: string
          emailSent: boolean
          metadata: Json | null
        }
        Insert: {
          id?: number
          senderId: number
          receiverId: number
          orderId?: number | null
          content: string
          readAt?: string | null
          createdAt?: string
          emailSent?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: number
          senderId?: number
          receiverId?: number
          orderId?: number | null
          content?: string
          readAt?: string | null
          createdAt?: string
          emailSent?: boolean
          metadata?: Json | null
        }
      }
      payments: {
        Row: {
          id: number
          orderId: number
          amount: number
          status: string
          paymentMethod: string
          transactionId: string | null
          createdAt: string
          updatedAt: string
          metadata: Json | null
        }
        Insert: {
          id?: number
          orderId: number
          amount: number
          status: string
          paymentMethod: string
          transactionId?: string | null
          createdAt?: string
          updatedAt?: string
          metadata?: Json | null
        }
        Update: {
          id?: number
          orderId?: number
          amount?: number
          status?: string
          paymentMethod?: string
          transactionId?: string | null
          createdAt?: string
          updatedAt?: string
          metadata?: Json | null
        }
      }
      inventory: {
        Row: {
          id: number
          name: string
          description: string | null
          quantity: number
          unitPrice: number
          category: string | null
          supplier: string | null
          reorderLevel: number | null
          createdAt: string
          updatedAt: string
          metadata: Json | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          quantity: number
          unitPrice: number
          category?: string | null
          supplier?: string | null
          reorderLevel?: number | null
          createdAt?: string
          updatedAt?: string
          metadata?: Json | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          quantity?: number
          unitPrice?: number
          category?: string | null
          supplier?: string | null
          reorderLevel?: number | null
          createdAt?: string
          updatedAt?: string
          metadata?: Json | null
        }
      }
      activity_logs: {
        Row: {
          id: number
          userId: number
          action: string
          entityType: string
          entityId: number
          details: Json | null
          createdAt: string
          ip: string | null
          userAgent: string | null
        }
        Insert: {
          id?: number
          userId: number
          action: string
          entityType: string
          entityId: number
          details?: Json | null
          createdAt?: string
          ip?: string | null
          userAgent?: string | null
        }
        Update: {
          id?: number
          userId?: number
          action?: string
          entityType?: string
          entityId?: number
          details?: Json | null
          createdAt?: string
          ip?: string | null
          userAgent?: string | null
        }
      }
      user_settings: {
        Row: {
          id: number
          userId: number
          key: string
          value: Json
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          userId: number
          key: string
          value: Json
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          userId?: number
          key?: string
          value?: Json
          createdAt?: string
          updatedAt?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}