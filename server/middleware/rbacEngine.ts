
import type { SecurityPoliciesConfig } from '../../system_config/types.js';
import SystemConfigurationManager from '../../system_config/config-loader.js';

export interface PermissionCheck {
  resource: string;
  action: string;
  resourceId?: string;
  userId?: string;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  requiredRole?: string;
}

class RBACEngine {
  private static instance: RBACEngine;
  private configManager: SystemConfigurationManager;
  private permissionCache: Map<string, PermissionResult> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
  }

  public static getInstance(): RBACEngine {
    if (!RBACEngine.instance) {
      RBACEngine.instance = new RBACEngine();
    }
    return RBACEngine.instance;
  }

  /**
   * Check if user has permission for a specific action on a resource
   */
  public async checkPermission(
    userId: string,
    userRole: string,
    check: PermissionCheck
  ): Promise<PermissionResult> {
    const cacheKey = `${userId}:${userRole}:${check.resource}:${check.action}:${check.resourceId || 'none'}`;
    
    // Check cache first
    const cached = this.getCachedPermission(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.evaluatePermission(userId, userRole, check);
    
    // Cache the result
    this.setCachedPermission(cacheKey, result);
    
    return result;
  }

  /**
   * Check wildcard permission matching
   */
  public matchesWildcard(permission: string, required: string): boolean {
    // Handle exact match
    if (permission === required) {
      return true;
    }

    // Handle wildcard permissions
    if (permission === '*') {
      return true;
    }

    // Handle resource wildcard (e.g., "orders:*" matches "orders:read")
    if (permission.endsWith(':*')) {
      const prefix = permission.slice(0, -2);
      return required.startsWith(prefix + ':');
    }

    // Handle action wildcard (e.g., "*:read" matches "orders:read")
    if (permission.startsWith('*:')) {
      const suffix = permission.slice(2);
      return required.endsWith(':' + suffix);
    }

    return false;
  }

  /**
   * Check resource ownership
   */
  public async checkResourceOwnership(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const securityConfig = this.configManager.getSecurityPolicies();
    
    if (!securityConfig.rbac.resourceOwnership.enforceOwnership) {
      return true; // Ownership not enforced
    }

    // This would typically query the database to check ownership
    // For now, we'll implement a basic check
    try {
      const resource = await this.getResource(resourceType, resourceId);
      const ownershipField = securityConfig.rbac.resourceOwnership.ownershipField;
      
      return resource && resource[ownershipField] === userId;
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      return false;
    }
  }

  /**
   * Get user permissions with inheritance
   */
  public getUserPermissions(userRole: string): string[] {
    const securityConfig = this.configManager.getSecurityPolicies();
    const role = securityConfig.rbac.roles[userRole];
    
    if (!role) {
      return [];
    }

    // Start with direct permissions
    let permissions = [...role.permissions];

    // Add inherited permissions (if role hierarchy is implemented)
    // This could be extended to support role inheritance
    
    return permissions;
  }

  /**
   * Evaluate permission without caching
   */
  private async evaluatePermission(
    userId: string,
    userRole: string,
    check: PermissionCheck
  ): Promise<PermissionResult> {
    const securityConfig = this.configManager.getSecurityPolicies();
    
    // Check if user role exists
    const role = securityConfig.rbac.roles[userRole];
    if (!role) {
      return {
        granted: false,
        reason: `Role '${userRole}' not found`,
        requiredRole: 'valid_role'
      };
    }

    // Admin bypass check
    if (securityConfig.rbac.resourceOwnership.adminBypass && userRole === 'admin') {
      return { granted: true, reason: 'Admin bypass' };
    }

    // Get user permissions
    const userPermissions = this.getUserPermissions(userRole);
    const requiredPermission = `${check.resource}:${check.action}`;

    // Check if user has the required permission (with wildcard matching)
    const hasPermission = userPermissions.some(permission => 
      this.matchesWildcard(permission, requiredPermission)
    );

    if (!hasPermission) {
      return {
        granted: false,
        reason: `Missing permission: ${requiredPermission}`,
        requiredRole: this.findRoleWithPermission(requiredPermission)
      };
    }

    // Check resource ownership if required
    if (check.resourceId && check.action.endsWith(':own')) {
      const ownsResource = await this.checkResourceOwnership(
        userId,
        check.resource,
        check.resourceId
      );
      
      if (!ownsResource) {
        return {
          granted: false,
          reason: 'Resource ownership required',
          requiredRole: userRole
        };
      }
    }

    return { granted: true };
  }

  /**
   * Find role that has a specific permission
   */
  private findRoleWithPermission(permission: string): string {
    const securityConfig = this.configManager.getSecurityPolicies();
    
    for (const [roleName, role] of Object.entries(securityConfig.rbac.roles)) {
      if (role.permissions.some(p => this.matchesWildcard(p, permission))) {
        return roleName;
      }
    }
    
    return 'admin'; // Fallback to admin role
  }

  /**
   * Get cached permission
   */
  private getCachedPermission(key: string): PermissionResult | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() < expiry) {
      return this.permissionCache.get(key) || null;
    }
    
    // Clean up expired cache entry
    this.permissionCache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  /**
   * Set cached permission
   */
  private setCachedPermission(key: string, result: PermissionResult): void {
    this.permissionCache.set(key, result);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear permission cache
   */
  public clearCache(): void {
    this.permissionCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get resource by type and ID (mock implementation)
   */
  private async getResource(resourceType: string, resourceId: string): Promise<any> {
    // This would typically query the database
    // For now, return a mock resource
    return {
      id: resourceId,
      userId: 'mock-user-id', // This would be the actual owner ID
      type: resourceType
    };
  }
}

export default RBACEngine;
