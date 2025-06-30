
import { Request, Response, Router } from 'express';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../auth/auth';

const router = Router();

// Enhanced comprehensive permission sets with inheritance and dynamic evaluation
export const comprehensivePermissionSets = {
  admin: {
    inherits: [],
    corePermissions: {
      // User Management
      manage_users: true,
      create_users: true,
      edit_users: true,
      delete_users: true,
      view_user_details: true,
      reset_passwords: true,
      manage_user_sessions: true,
      impersonate_users: true,
      audit_user_activity: true,
      
      // Role and Permission Management
      manage_roles: true,
      create_roles: true,
      edit_roles: true,
      delete_roles: true,
      assign_roles: true,
      revoke_roles: true,
      view_permission_matrix: true,
      manage_custom_permissions: true,
      
      // Order Management
      manage_orders: true,
      create_orders: true,
      edit_orders: true,
      delete_orders: true,
      view_all_orders: true,
      approve_orders: true,
      cancel_orders: true,
      refund_orders: true,
      export_order_data: true,
      
      // Catalog Management
      manage_catalog: true,
      create_catalog_items: true,
      edit_catalog_items: true,
      delete_catalog_items: true,
      manage_categories: true,
      manage_pricing: true,
      manage_inventory: true,
      import_catalog_data: true,
      
      // Financial Management
      view_financials: true,
      manage_payments: true,
      process_refunds: true,
      view_revenue: true,
      export_financial_data: true,
      manage_tax_settings: true,
      view_profit_margins: true,
      
      // System Administration
      manage_settings: true,
      view_system_logs: true,
      manage_integrations: true,
      backup_restore: true,
      system_maintenance: true,
      manage_api_keys: true,
      configure_webhooks: true,
      
      // Analytics and Reporting
      view_analytics: true,
      create_reports: true,
      schedule_reports: true,
      export_analytics: true,
      view_user_analytics: true,
      view_business_metrics: true,
      
      // Security and Compliance
      manage_security_settings: true,
      view_audit_logs: true,
      manage_data_retention: true,
      configure_2fa: true,
      manage_ip_restrictions: true,
      
      // Advanced Features
      manage_workflows: true,
      configure_automations: true,
      manage_notifications: true,
      custom_field_management: true
    },
    conditionalPermissions: [
      {
        condition: "user.isSuperAdmin === true",
        permissions: {
          delete_system_data: true,
          manage_super_admin_settings: true,
          emergency_system_access: true
        }
      }
    ],
    restrictions: {
      requiresApproval: [],
      timeBasedRestrictions: {},
      ipRestrictions: {}
    },
    metadata: {
      description: "Full system administrator with comprehensive access",
      riskLevel: "high",
      requiresBackground: true,
      maxConcurrentSessions: 3,
      sessionTimeout: 480
    }
  },
  salesperson: {
    inherits: ['base_user'],
    corePermissions: {
      // Customer Management
      manage_customers: true,
      create_customers: true,
      edit_customers: true,
      view_customer_data: true,
      communicate_customers: true,
      manage_customer_notes: true,
      view_customer_history: true,
      export_customer_lists: true,
      
      // Order Management
      create_orders: true,
      view_orders: true,
      edit_own_orders: true,
      cancel_own_orders: true,
      duplicate_orders: true,
      view_order_status: true,
      manage_order_notes: true,
      
      // Sales Tools
      manage_quotes: true,
      create_estimates: true,
      send_proposals: true,
      track_follow_ups: true,
      manage_sales_pipeline: true,
      schedule_appointments: true,
      
      // Product and Catalog
      view_catalog: true,
      view_pricing: true,
      apply_discounts: true,
      create_custom_quotes: true,
      view_product_availability: true,
      
      // Analytics and Reporting
      view_sales_analytics: true,
      view_own_performance: true,
      view_commission_data: true,
      generate_sales_reports: true,
      view_territory_metrics: true,
      
      // Lead Management
      manage_leads: true,
      convert_leads: true,
      assign_leads: true,
      track_lead_sources: true,
      manage_lead_scoring: true,
      
      // Communication
      send_marketing_emails: true,
      manage_customer_communications: true,
      access_crm_features: true
    },
    conditionalPermissions: [
      {
        condition: "user.performanceTier === 'senior'",
        permissions: {
          approve_large_discounts: true,
          access_premium_features: true,
          mentor_junior_sales: true
        }
      },
      {
        condition: "user.territory && order.territory === user.territory",
        permissions: {
          edit_orders: true,
          approve_orders: true
        }
      },
      {
        condition: "order.value < user.approvalLimit",
        permissions: {
          approve_order_discounts: true,
          finalize_orders: true
        }
      }
    ],
    restrictions: {
      requiresApproval: ['delete_customers', 'large_discounts_over_1000'],
      dataAccess: {
        orders: {
          filter: "salesperson_id = user.id OR territory = user.territory"
        },
        customers: {
          filter: "assigned_salesperson = user.id OR territory = user.territory"
        }
      },
      timeBasedRestrictions: {
        weekdaysOnly: true,
        businessHours: "09:00-18:00"
      }
    },
    metadata: {
      description: "Sales professional with customer and order management capabilities",
      riskLevel: "medium",
      maxOrderValue: 50000,
      commissionEligible: true,
      territoryBased: true
    }
  },
  designer: {
    inherits: ['base_user', 'creative_tools'],
    corePermissions: {
      // Design Task Management
      view_design_tasks: true,
      accept_design_tasks: true,
      complete_design_tasks: true,
      request_task_changes: true,
      manage_task_timeline: true,
      update_task_status: true,
      
      // File and Asset Management
      manage_design_files: true,
      upload_designs: true,
      version_control_designs: true,
      organize_design_assets: true,
      share_design_files: true,
      export_design_files: true,
      access_design_library: true,
      
      // Design Approval Workflow
      submit_designs_for_approval: true,
      revise_designs: true,
      approve_junior_designs: true,
      provide_design_feedback: true,
      request_client_feedback: true,
      
      // Template and Resource Management
      manage_design_templates: true,
      create_design_templates: true,
      share_templates: true,
      access_brand_guidelines: true,
      manage_color_palettes: true,
      manage_font_libraries: true,
      
      // Collaboration and Communication
      comment_on_orders: true,
      communicate_with_clients: true,
      participate_in_design_reviews: true,
      request_order_changes: true,
      collaborate_with_team: true,
      
      // Project and Order Access
      view_assigned_orders: true,
      view_order_specifications: true,
      access_customer_requirements: true,
      view_project_briefs: true,
      track_project_milestones: true,
      
      // Analytics and Performance
      view_design_analytics: true,
      track_design_performance: true,
      view_client_satisfaction: true,
      monitor_revision_rates: true,
      
      // Creative Tools Integration
      access_design_software: true,
      use_ai_design_tools: true,
      integrate_external_tools: true
    },
    conditionalPermissions: [
      {
        condition: "user.seniorityLevel >= 'senior'",
        permissions: {
          approve_final_designs: true,
          assign_design_tasks: true,
          mentor_junior_designers: true,
          access_advanced_tools: true
        }
      },
      {
        condition: "project.complexity === 'high' && user.skillLevel >= 'expert'",
        permissions: {
          lead_complex_projects: true,
          approve_technical_specifications: true
        }
      },
      {
        condition: "user.specializations.includes(project.category)",
        permissions: {
          edit_specialized_designs: true,
          provide_expert_guidance: true
        }
      }
    ],
    restrictions: {
      dataAccess: {
        orders: {
          filter: "assigned_designer = user.id OR design_team_members CONTAINS user.id"
        },
        designs: {
          filter: "created_by = user.id OR assigned_designers CONTAINS user.id"
        }
      },
      fileAccess: {
        maxFileSize: "500MB",
        allowedFormats: ["PSD", "AI", "SKETCH", "FIGMA", "PNG", "JPG", "SVG", "PDF"]
      },
      workflowRestrictions: {
        requiresApprovalForFinalSubmission: true,
        mustFollowBrandGuidelines: true
      }
    },
    metadata: {
      description: "Creative professional with design and project collaboration capabilities",
      riskLevel: "low",
      creativeFocused: true,
      collaborationRequired: true,
      qualityControlLevel: "high"
    }
  },
  manufacturer: {
    inherits: ['base_user', 'production_tools'],
    corePermissions: {
      // Production Queue Management
      view_production_queue: true,
      accept_production_orders: true,
      prioritize_production_queue: true,
      update_production_status: true,
      schedule_production_runs: true,
      manage_production_capacity: true,
      allocate_production_resources: true,
      
      // Inventory and Materials
      manage_inventory: true,
      track_material_usage: true,
      request_material_orders: true,
      manage_supplier_relationships: true,
      update_inventory_levels: true,
      forecast_material_needs: true,
      
      // Design and Specification Access
      view_design_files: true,
      download_production_files: true,
      access_technical_specifications: true,
      request_design_modifications: true,
      provide_manufacturability_feedback: true,
      suggest_design_improvements: true,
      
      // Quality Control and Assurance
      manage_quality_control: true,
      perform_quality_inspections: true,
      document_quality_issues: true,
      approve_quality_standards: true,
      manage_defect_tracking: true,
      implement_corrective_actions: true,
      
      // Production Communication
      comment_on_designs: true,
      communicate_with_designers: true,
      provide_production_updates: true,
      escalate_production_issues: true,
      coordinate_with_suppliers: true,
      
      // Shipping and Fulfillment
      update_shipping_status: true,
      manage_shipping_schedules: true,
      coordinate_logistics: true,
      track_shipments: true,
      handle_shipping_issues: true,
      manage_delivery_confirmations: true,
      
      // Reporting and Analytics
      view_production_analytics: true,
      generate_production_reports: true,
      track_efficiency_metrics: true,
      monitor_cost_analysis: true,
      report_production_issues: true,
      analyze_defect_rates: true,
      
      // Equipment and Maintenance
      manage_equipment_schedules: true,
      report_equipment_issues: true,
      schedule_maintenance: true,
      track_equipment_performance: true,
      
      // Compliance and Safety
      ensure_safety_compliance: true,
      manage_regulatory_requirements: true,
      document_safety_procedures: true,
      report_safety_incidents: true
    },
    conditionalPermissions: [
      {
        condition: "user.certificationLevel >= 'certified'",
        permissions: {
          approve_production_methods: true,
          train_production_staff: true,
          validate_quality_processes: true
        }
      },
      {
        condition: "user.specializations.includes(order.productType)",
        permissions: {
          lead_specialized_production: true,
          optimize_production_process: true
        }
      },
      {
        condition: "order.priority === 'urgent' && user.seniorityLevel >= 'senior'",
        permissions: {
          expedite_production: true,
          reallocate_resources: true
        }
      }
    ],
    restrictions: {
      dataAccess: {
        orders: {
          filter: "production_status IN ['assigned', 'in_production', 'quality_check'] AND assigned_manufacturer = user.id"
        },
        inventory: {
          filter: "facility_id = user.facility_id"
        }
      },
      operationalRestrictions: {
        requiresQualityCheckBeforeShipping: true,
        mustFollowSafetyProtocols: true,
        requiresProductionApprovalForChanges: true
      }
    },
    metadata: {
      description: "Production specialist with manufacturing and quality control capabilities",
      riskLevel: "medium",
      facilityBased: true,
      qualityFocused: true,
      safetyRequired: true,
      certificationRequired: true
    }
  },
  customer: {
    inherits: ['base_user'],
    corePermissions: {
      // Order Management
      view_own_orders: true,
      create_order_requests: true,
      edit_draft_orders: true,
      cancel_pending_orders: true,
      reorder_previous_orders: true,
      track_order_status: true,
      view_order_history: true,
      download_order_confirmations: true,
      
      // File and Asset Management
      upload_custom_files: true,
      manage_uploaded_files: true,
      view_design_proofs: true,
      download_final_designs: true,
      provide_file_feedback: true,
      
      // Catalog and Product Access
      view_catalog: true,
      browse_products: true,
      view_product_details: true,
      check_product_availability: true,
      compare_products: true,
      save_favorite_products: true,
      view_pricing: true,
      
      // Payment and Billing
      make_payments: true,
      view_invoices: true,
      download_receipts: true,
      view_payment_history: true,
      update_payment_methods: true,
      view_account_balance: true,
      set_up_auto_payments: true,
      
      // Communication and Support
      communicate_with_team: true,
      submit_support_tickets: true,
      chat_with_support: true,
      provide_order_feedback: true,
      request_design_changes: true,
      schedule_consultations: true,
      
      // Profile and Account Management
      manage_profile: true,
      update_contact_information: true,
      manage_shipping_addresses: true,
      set_communication_preferences: true,
      manage_account_settings: true,
      view_account_activity: true,
      
      // Self-Service Features
      track_shipments: true,
      request_order_updates: true,
      access_order_documents: true,
      view_measurement_guides: true,
      use_size_calculators: true,
      access_care_instructions: true,
      
      // Personalization
      save_design_preferences: true,
      create_custom_profiles: true,
      manage_style_preferences: true,
      save_measurement_profiles: true
    },
    conditionalPermissions: [
      {
        condition: "user.loyaltyTier >= 'gold'",
        permissions: {
          access_premium_products: true,
          get_priority_support: true,
          early_access_new_products: true
        }
      },
      {
        condition: "user.totalOrderValue >= 10000",
        permissions: {
          access_wholesale_pricing: true,
          get_dedicated_rep: true,
          bulk_order_management: true
        }
      },
      {
        condition: "order.status === 'draft' && order.created_by === user.id",
        permissions: {
          edit_order_details: true,
          modify_specifications: true
        }
      }
    ],
    restrictions: {
      dataAccess: {
        orders: {
          filter: "customer_id = user.id OR created_by = user.id"
        },
        invoices: {
          filter: "customer_id = user.id"
        },
        designs: {
          filter: "customer_id = user.id AND status = 'approved'"
        }
      },
      operationalRestrictions: {
        maxFileUploadSize: "100MB",
        allowedFileTypes: ["PDF", "PNG", "JPG", "DOC", "DOCX"],
        maxDraftOrders: 10,
        paymentRequired: true
      }
    },
    metadata: {
      description: "Customer with self-service order management and communication capabilities",
      riskLevel: "low",
      selfService: true,
      paymentRequired: true,
      orderFocused: true,
      supportAccess: true
    }
  },
  
  // Base permission sets for inheritance
  base_user: {
    corePermissions: {
      login: true,
      view_own_profile: true,
      update_own_profile: true,
      change_password: true,
      logout: true,
      receive_notifications: true,
      access_help_documentation: true
    }
  },
  
  creative_tools: {
    corePermissions: {
      access_design_software_integrations: true,
      use_collaboration_tools: true,
      manage_creative_assets: true,
      participate_in_creative_reviews: true
    }
  },
  
  production_tools: {
    corePermissions: {
      access_production_systems: true,
      use_inventory_management: true,
      track_production_metrics: true,
      manage_production_workflows: true
    }
  }
}
};

// Enhanced data access control with granular permissions
export interface CustomPermissions {
  userId: string;
  permissions: Record<string, boolean>;
  dataAccess: {
    viewableOrders?: string[]; // Order IDs user can view
    editableOrders?: string[]; // Order IDs user can edit
    viewableCustomers?: string[]; // Customer IDs user can view
    restrictedData?: string[]; // Data types user cannot access
    fieldLevelAccess?: {
      orders?: {
        viewableFields?: string[];
        editableFields?: string[];
        restrictedFields?: string[];
      };
      customers?: {
        viewableFields?: string[];
        editableFields?: string[];
        restrictedFields?: string[];
      };
      financial?: {
        viewableFields?: string[];
        editableFields?: string[];
        restrictedFields?: string[];
      };
    };
    geographicRestrictions?: {
      allowedCountries?: string[];
      allowedStates?: string[];
      restrictedRegions?: string[];
    };
    ipRestrictions?: {
      allowedIPs?: string[];
      blockedIPs?: string[];
      requireVPN?: boolean;
    };
  };
  customLimitations?: {
    maxOrderValue?: number;
    allowedCategories?: string[];
    allowedStatuses?: string[];
    dailyTransactionLimit?: number;
    monthlyTransactionLimit?: number;
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      allowedDays?: number[];
      timezone?: string;
    };
    sessionLimitations?: {
      maxConcurrentSessions?: number;
      sessionTimeout?: number;
      idleTimeout?: number;
    };
    dataExportLimitations?: {
      allowedFormats?: string[];
      maxRecords?: number;
      requireApproval?: boolean;
    };
  };
  auditRequirements?: {
    logAllActions?: boolean;
    requireReason?: boolean;
    approvalRequired?: string[];
    notificationRequired?: string[];
  };
}

// Enhanced field-level security configuration
export interface FieldLevelSecurity {
  tableName: string;
  fieldName: string;
  accessLevel: 'none' | 'read' | 'write' | 'admin';
  encryptionRequired?: boolean;
  maskingRules?: {
    showFirst?: number;
    showLast?: number;
    maskChar?: string;
  };
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// Data classification and sensitivity levels
export interface DataClassification {
  fieldId: string;
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceRequirements?: string[];
  retentionPeriod?: number;
  autoDeleteAfter?: number;
  encryptionAtRest?: boolean;
  encryptionInTransit?: boolean;
}

/**
 * Get manufacturers only
 */
export async function getManufacturers(req: Request, res: Response) {
  try {
    console.log('Fetching manufacturers only...');

    // Get all users with manufacturer role from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturers',
        error: authError.message
      });
    }

    // Filter for manufacturer role users
    const manufacturers = authUsers.users
      .filter(user => user.user_metadata?.role === 'manufacturer')
      .map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || 'manufacturer',
        specialties: user.user_metadata?.specialties || '',
        created_at: user.created_at,
        isActive: user.email_confirmed_at !== null
      }));

    console.log(`Found ${manufacturers.length} manufacturers`);

    return res.json({
      success: true,
      users: manufacturers,
      total: manufacturers.length
    });
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get users by role with permission filtering
 */
export async function getUsersByRole(req: Request, res: Response) {
  try {
    const { role } = req.params;
    const { includeInactive = false } = req.query;

    console.log(`Fetching users with role: ${role}`);

    // Validate role
    if (!['admin', 'salesperson', 'designer', 'manufacturer', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: authError.message
      });
    }

    // Filter by role and activity status
    const filteredUsers = authUsers.users
      .filter(user => {
        const userRole = user.user_metadata?.role;
        const isActive = user.email_confirmed_at !== null;
        
        return userRole === role && (includeInactive || isActive);
      })
      .map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || role,
        specialties: user.user_metadata?.specialties || '',
        created_at: user.created_at,
        isActive: user.email_confirmed_at !== null,
        permissions: rolePermissions[role as keyof typeof rolePermissions] || {}
      }));

    console.log(`Found ${filteredUsers.length} users with role ${role}`);

    return res.json({
      success: true,
      users: filteredUsers,
      total: filteredUsers.length,
      role: role
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get user permissions
 */
export async function getUserPermissions(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    console.log(`Fetching permissions for user: ${userId}`);

    // Get user data from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = userData.user.user_metadata?.role;
    const basePermissions = rolePermissions[userRole as keyof typeof rolePermissions] || {};

    // TODO: Fetch custom permissions from database if implemented
    // For now, return base role permissions
    return res.json({
      success: true,
      userId: userId,
      role: userRole,
      permissions: basePermissions,
      customPermissions: null // Placeholder for future custom permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Create a new user with specific role and permissions
 */
export async function createUserWithRole(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      company,
      phone,
      specialties,
      customPermissions
    } = req.body;

    console.log(`Creating new user with role: ${role}`);

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, firstName, lastName, and role are required'
      });
    }

    // Validate role
    if (!['admin', 'salesperson', 'designer', 'manufacturer', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role,
        company: company || '',
        phone: phone || '',
        specialties: specialties || '',
        username: email.split('@')[0],
        permissions: rolePermissions[role as keyof typeof rolePermissions] || {}
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }

    if (!data?.user) {
      return res.status(500).json({
        success: false,
        message: 'Unknown error creating user'
      });
    }

    console.log('User created successfully:', data.user.id);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        role,
        company: company || '',
        phone: phone || '',
        specialties: specialties || '',
        permissions: rolePermissions[role as keyof typeof rolePermissions] || {},
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Error creating user with role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/manufacturers', requireAuth, requireRole(['admin']), getManufacturers);
router.get('/role/:role', requireAuth, requireRole(['admin']), getUsersByRole);
router.get('/:userId/permissions', requireAuth, requireRole(['admin']), getUserPermissions);
router.post('/create', requireAuth, requireRole(['admin']), createUserWithRole);

export default router;
