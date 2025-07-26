
export interface BehaviorProfileConfig {
  version: string;
  agreeabilityThreshold: number;
  defaultTone: string;
  conflictTolerance: string;
  humorAllowance: boolean;
  wisdomStyle: string;
  adaptiveExpertise: boolean;
  personaTagline: string;
  decisionRules: {
    mustConfirmMajorDecisions: boolean;
    defaultMode: string;
    interveneIf: string[];
  };
}

export interface ExecutionPolicyConfig {
  version: string;
  requireErrorHandling: boolean;
  requireScalability: boolean;
  requireSecurity: boolean;
  requireModularStructure: boolean;
  requireInlineComments: boolean;
  testCoverageRequired: boolean;
  techStackStrategy: string;
  authenticationPolicy: {
    adminOnlyAccess: boolean;
    permissionGate: boolean;
    userDataVisibility: string;
  };
  minFixPrefixes: boolean;
}

export interface RedFlagConfig {
  version: string;
  critical: RedFlagRule[];
  medium: RedFlagRule[];
  low: RedFlagRule[];
}

export interface RedFlagRule {
  pattern: string;
  reason: string;
}

export interface BuildRulesConfig {
  version: string;
  targetEnvironments: string[];
  performanceBudgets: {
    bundleSizeLimit: string;
    loadTimeTarget: string;
  };
  optimizations: {
    minify: boolean;
    treeShaking: boolean;
    imageCompression: boolean;
  };
  buildTasks: {
    preBuild: string[];
    postBuild: string[];
  };
  transpilation: {
    target: string;
    progressiveEnhancement: boolean;
  };
}

export interface UiUxConfig {
  version: string;
  formValidation: {
    strategy: string;
    showErrorsOnFocus: boolean;
    validateOnBlur: boolean;
    highlightInvalidFields: boolean;
  };
  modalBehavior: {
    allowOverlayClose: boolean;
    escapeKeyEnabled: boolean;
    focusTrap: boolean;
    animationDuration: number;
  };
  popupManagement: {
    autoPosition: boolean;
    responsive: boolean;
    maxConcurrent: number;
    zIndexBase: number;
  };
  tooltips: {
    showDelay: number;
    hideDelay: number;
    maxWidth: number;
    placement: string;
  };
  responsive: {
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
    touchTargetMinSize: number;
  };
}

export interface ApiGovernanceConfig {
  version: string;
  rateLimiting: {
    requestsPerMinute: number;
    burstCapacity: number;
    windowSizeMs: number;
    skipSuccessfulGET: boolean;
  };
  requiredHeaders: string[];
  restfulConventions: {
    enforceResourcePlurals: boolean;
    urlVersioning: string;
    standardHttpMethods: string[];
    consistentErrorFormat: boolean;
  };
  securityHeaders: {
    hsts: string;
    csp: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string;
  };
  auditLogging: {
    enabled: boolean;
    logLevel: string;
    includeRequestBody: boolean;
    includeResponseBody: boolean;
    retentionDays: number;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    allowCredentials: boolean;
  };
}

export interface WorkflowRoutesConfig {
  version: string;
  defaultFlow: string[];
  bugFixFlow: string[];
  designRequestFlow: string[];
  shortCircuitCommand: string;
  shortCircuitFlow: string[];
}

export interface SecurityPoliciesConfig {
  version: string;
  rbac: {
    roles: Record<string, {
      permissions: string[];
      description: string;
    }>;
    resourceOwnership: {
      enforceOwnership: boolean;
      ownershipField: string;
      adminBypass: boolean;
    };
  };
  authentication: {
    jwt: {
      expiryMinutes: number;
      refreshTokenEnabled: boolean;
      refreshExpiryDays: number;
    };
    sessionManagement: {
      maxConcurrentSessions: number;
      sessionTimeoutMinutes: number;
    };
  };
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSymbols: boolean;
    requireUppercase: boolean;
    requireLowercase: boolean;
    preventReuse: number;
  };
  auditLogging: {
    enabled: boolean;
    events: string[];
    retentionDays: number;
    encryptLogs: boolean;
  };
  dataProtection: {
    encryptSensitiveFields: boolean;
    maskPII: boolean;
    gdprCompliant: boolean;
  };
}

export interface CiCdHooksConfig {
  version: string;
  gitHooks: {
    preCommit: string[];
    prePush: string[];
    postMerge: string[];
  };
  ciPipeline: {
    pullRequest: {
      stages: string[];
      requireAllChecks: boolean;
    };
    mainBranch: {
      stages: string[];
      manualApprovalRequired: boolean;
    };
    production: {
      stages: string[];
      manualApprovalRequired: boolean;
    };
  };
  taskRouting: Record<string, {
    maxCpu: string;
    maxMemory: string;
    timeout: string;
  }>;
  notifications: {
    channels: string[];
    events: string[];
  };
}

export interface DbMigrationConfig {
  version: string;
  migrationPolicy: {
    autoMigrationEnabled: Record<string, boolean>;
    requireBackup: Record<string, boolean>;
    transactionalMigrations: boolean;
    rollbackScriptRequired: boolean;
  };
  safetyChecks: {
    maxTableSizeForAlter: string;
    requireApprovalForDestructive: boolean;
    validateForeignKeys: boolean;
    checkIndexPerformance: boolean;
  };
  environmentOverrides: Record<string, any>;
  rollback: {
    autoRollbackOnFailure: boolean;
    maxRollbackTimeMinutes: number;
    preserveDataOnRollback: boolean;
  };
}

export interface AppConfig {
  behaviorProfile: BehaviorProfileConfig;
  executionPolicy: ExecutionPolicyConfig;
  redFlagDetection: RedFlagConfig;
  buildRules: BuildRulesConfig;
  uiUx: UiUxConfig;
  apiGovernance: ApiGovernanceConfig;
  workflowRoutes: WorkflowRoutesConfig;
  securityPolicies: SecurityPoliciesConfig;
  ciCdHooks: CiCdHooksConfig;
  dbMigration: DbMigrationConfig;
}
