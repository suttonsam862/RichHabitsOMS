
import fs from "fs";
import path from "path";
import type { 
  AppConfig, 
  BehaviorProfileConfig, 
  ExecutionPolicyConfig,
  RedFlagConfig,
  BuildRulesConfig,
  UiUxConfig,
  ApiGovernanceConfig,
  WorkflowRoutesConfig,
  SecurityPoliciesConfig,
  CiCdHooksConfig,
  DbMigrationConfig
} from "./types.js";

const configPaths = [
  "./system_config/behavior-profile.json",
  "./system_config/execution-policy.json",
  "./system_config/common-build-rules.json",
  "./system_config/red-flag-detection.json",
  "./system_config/ui-ux.json",
  "./system_config/api-governance.json",
  "./system_config/workflow-routes.json",
  "./system_config/security-policies.json",
  "./system_config/ci-cd-hooks.json",
  "./system_config/db-migration.json"
];

// Strip JSON comments (lines starting with //)
function stripJsonComments(jsonString: string): string {
  return jsonString
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
}

// Deep merge objects
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] as any, source[key] as any);
    } else if (source[key] !== undefined) {
      result[key] = source[key] as any;
    }
  }
  
  return result;
}

// Environment variable override capability
function applyEnvironmentOverrides<T>(config: T, prefix: string): T {
  const result = { ...config };
  
  Object.keys(process.env).forEach(key => {
    if (key.startsWith(prefix)) {
      const configPath = key.substring(prefix.length).toLowerCase().replace(/_/g, '.');
      const value = process.env[key];
      
      if (value) {
        // Simple dot notation support for nested configs
        const parts = configPath.split('.');
        let current: any = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        
        // Try to parse as JSON, fallback to string
        try {
          current[parts[parts.length - 1]] = JSON.parse(value);
        } catch {
          current[parts[parts.length - 1]] = value;
        }
      }
    }
  });
  
  return result;
}

export const loadedConfigs = configPaths.reduce((acc, configPath) => {
  const fileName = configPath.split("/").pop() as string;
  try {
    const fullPath = path.resolve(configPath);
    const fileContent = fs.readFileSync(fullPath, "utf8");
    const strippedContent = stripJsonComments(fileContent);
    acc[fileName] = JSON.parse(strippedContent);
  } catch (error) {
    console.error(`Failed to load config file ${fileName}:`, error);
    acc[fileName] = {};
  }
  return acc;
}, {} as Record<string, any>);

export function evaluatePrompt(prompt: string) {
  const redFlags = loadedConfigs["red-flag-detection.json"];
  const matches: string[] = [];

  if (!redFlags) {
    return { viable: true, issues: [] };
  }

  for (const severity in redFlags) {
    if (Array.isArray(redFlags[severity])) {
      redFlags[severity].forEach((rule: any) => {
        if (prompt.toLowerCase().includes(rule.pattern.toLowerCase())) {
          matches.push(`[${severity.toUpperCase()}] ${rule.reason}`);
        }
      });
    }
  }

  return matches.length
    ? { viable: false, issues: matches }
    : { viable: true, issues: [] };
}

// Initialize system configuration manager
class SystemConfigurationManager {
  private static instance: SystemConfigurationManager;
  private isInitialized: boolean = false;
  private config: AppConfig | null = null;

  private constructor() {}

  public static getInstance(): SystemConfigurationManager {
    if (!SystemConfigurationManager.instance) {
      SystemConfigurationManager.instance = new SystemConfigurationManager();
    }
    return SystemConfigurationManager.instance;
  }

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 Initializing System Configuration Manager...');

    // Load and merge configurations with environment overrides
    this.config = {
      behaviorProfile: applyEnvironmentOverrides(
        loadedConfigs["behavior-profile.json"] as BehaviorProfileConfig,
        "BEHAVIOR_"
      ),
      executionPolicy: applyEnvironmentOverrides(
        loadedConfigs["execution-policy.json"] as ExecutionPolicyConfig,
        "EXECUTION_"
      ),
      redFlagDetection: applyEnvironmentOverrides(
        loadedConfigs["red-flag-detection.json"] as RedFlagConfig,
        "REDFLAG_"
      ),
      buildRules: applyEnvironmentOverrides(
        loadedConfigs["common-build-rules.json"] as BuildRulesConfig,
        "BUILD_"
      ),
      uiUx: applyEnvironmentOverrides(
        loadedConfigs["ui-ux.json"] as UiUxConfig,
        "UI_"
      ),
      apiGovernance: applyEnvironmentOverrides(
        loadedConfigs["api-governance.json"] as ApiGovernanceConfig,
        "API_"
      ),
      workflowRoutes: applyEnvironmentOverrides(
        loadedConfigs["workflow-routes.json"] as WorkflowRoutesConfig,
        "WORKFLOW_"
      ),
      securityPolicies: applyEnvironmentOverrides(
        loadedConfigs["security-policies.json"] as SecurityPoliciesConfig,
        "SECURITY_"
      ),
      ciCdHooks: applyEnvironmentOverrides(
        loadedConfigs["ci-cd-hooks.json"] as CiCdHooksConfig,
        "CICD_"
      ),
      dbMigration: applyEnvironmentOverrides(
        loadedConfigs["db-migration.json"] as DbMigrationConfig,
        "DB_"
      )
    };

    this.isInitialized = true;
    console.log('✅ System Configuration loaded successfully');
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  public getBehaviorProfile(): BehaviorProfileConfig {
    return this.getConfig().behaviorProfile;
  }

  public getExecutionPolicy(): ExecutionPolicyConfig {
    return this.getConfig().executionPolicy;
  }

  public getCommonBuildRules(): BuildRulesConfig {
    return this.getConfig().buildRules;
  }

  public getRedFlagDetection(): RedFlagConfig {
    return this.getConfig().redFlagDetection;
  }

  public getUiUx(): UiUxConfig {
    return this.getConfig().uiUx;
  }

  public getApiGovernance(): ApiGovernanceConfig {
    return this.getConfig().apiGovernance;
  }

  public getWorkflowRoutes(): WorkflowRoutesConfig {
    return this.getConfig().workflowRoutes;
  }

  public getSecurityPolicies(): SecurityPoliciesConfig {
    return this.getConfig().securityPolicies;
  }

  public getCiCdHooks(): CiCdHooksConfig {
    return this.getConfig().ciCdHooks;
  }

  public getDbMigration(): DbMigrationConfig {
    return this.getConfig().dbMigration;
  }

  public validateConfiguration(): boolean {
    const requiredFiles = [
      "behavior-profile.json",
      "execution-policy.json", 
      "common-build-rules.json",
      "red-flag-detection.json",
      "ui-ux.json",
      "api-governance.json",
      "workflow-routes.json",
      "security-policies.json",
      "ci-cd-hooks.json",
      "db-migration.json"
    ];

    for (const file of requiredFiles) {
      if (!loadedConfigs[file] || Object.keys(loadedConfigs[file]).length === 0) {
        console.error(`❌ Missing or empty configuration file: ${file}`);
        return false;
      }
    }

    console.log('✅ System configuration validation passed');
    return true;
  }

  // Environment detection
  public getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  // Configuration deep merge for environment-specific overrides
  public getEnvironmentConfig<T>(baseConfig: T, environmentOverrides: Record<string, Partial<T>>): T {
    const env = this.getEnvironment();
    const override = environmentOverrides[env];
    
    if (override) {
      return deepMerge(baseConfig, override);
    }
    
    return baseConfig;
  }
}

export default SystemConfigurationManager;
