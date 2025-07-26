
import fs from 'fs';
import path from 'path';

interface SystemConfig {
  behaviorProfile: any;
  executionPolicy: any;
  commonBuildRules: any;
  redFlagDetection: any;
  workflowRoutes: any;
}

class SystemConfigurationManager {
  private static instance: SystemConfigurationManager;
  private config: SystemConfig | null = null;
  private configPath: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'system_config');
  }

  public static getInstance(): SystemConfigurationManager {
    if (!SystemConfigurationManager.instance) {
      SystemConfigurationManager.instance = new SystemConfigurationManager();
    }
    return SystemConfigurationManager.instance;
  }

  public async initialize(): Promise<SystemConfig> {
    if (this.isInitialized && this.config) {
      return this.config;
    }

    try {
      console.log('🔧 Initializing System Configuration Manager...');
      
      const behaviorProfile = await this.loadConfigFile('behavior-profile.json');
      const executionPolicy = await this.loadConfigFile('execution-policy.json');
      const commonBuildRules = await this.loadConfigFile('common-build-rules.json');
      const redFlagDetection = await this.loadConfigFile('red-flag-detection.json');
      const workflowRoutes = await this.loadConfigFile('workflow-routes.json');

      this.config = {
        behaviorProfile,
        executionPolicy,
        commonBuildRules,
        redFlagDetection,
        workflowRoutes
      };

      this.isInitialized = true;
      console.log('✅ System Configuration loaded successfully');
      
      return this.config;
    } catch (error) {
      console.error('❌ Failed to initialize system configuration:', error);
      throw new Error(`System configuration initialization failed: ${error}`);
    }
  }

  private async loadConfigFile(filename: string): Promise<any> {
    const filePath = path.join(this.configPath, filename);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(fileContent);
      
      console.log(`📄 Loaded ${filename} (version: ${config.version || 'unknown'})`);
      return config;
    } catch (error) {
      throw new Error(`Failed to load ${filename}: ${error}`);
    }
  }

  public getConfig(): SystemConfig {
    if (!this.isInitialized || !this.config) {
      throw new Error('System configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  public getBehaviorProfile() {
    return this.getConfig().behaviorProfile;
  }

  public getExecutionPolicy() {
    return this.getConfig().executionPolicy;
  }

  public getCommonBuildRules() {
    return this.getConfig().commonBuildRules;
  }

  public getRedFlagDetection() {
    return this.getConfig().redFlagDetection;
  }

  public getWorkflowRoutes() {
    return this.getConfig().workflowRoutes;
  }

  public async reloadConfiguration(): Promise<SystemConfig> {
    this.isInitialized = false;
    this.config = null;
    return await this.initialize();
  }

  public validateConfiguration(): boolean {
    try {
      const config = this.getConfig();
      
      // Basic validation checks
      const requiredSections = ['behaviorProfile', 'executionPolicy', 'commonBuildRules', 'redFlagDetection', 'workflowRoutes'];
      
      for (const section of requiredSections) {
        if (!config[section as keyof SystemConfig]) {
          console.error(`❌ Missing required configuration section: ${section}`);
          return false;
        }
      }

      console.log('✅ System configuration validation passed');
      return true;
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      return false;
    }
  }
}

// Central prompt evaluation function
export function evaluatePrompt(userPrompt: string): {
  redFlags: string[];
  suggestedWorkflow: string | null;
  behaviorAdjustments: any;
  enforcementRules: any;
} {
  const configManager = SystemConfigurationManager.getInstance();
  
  if (!configManager.getConfig()) {
    throw new Error('System configuration not loaded. Initialize first.');
  }

  const redFlagDetection = configManager.getRedFlagDetection();
  const workflowRoutes = configManager.getWorkflowRoutes();
  const behaviorProfile = configManager.getBehaviorProfile();
  const executionPolicy = configManager.getExecutionPolicy();

  // Detect red flags
  const redFlags: string[] = [];
  
  Object.keys(redFlagDetection).forEach(category => {
    const categoryFlags = redFlagDetection[category];
    Object.keys(categoryFlags).forEach(flagType => {
      const flag = categoryFlags[flagType];
      if (flag.patterns) {
        flag.patterns.forEach((pattern: string) => {
          if (userPrompt.toLowerCase().includes(pattern.toLowerCase())) {
            redFlags.push(`${flagType}: ${flag.challenge_message}`);
          }
        });
      }
    });
  });

  // Suggest workflow based on prompt content
  let suggestedWorkflow: string | null = null;
  
  if (userPrompt.toLowerCase().includes('design') || userPrompt.toLowerCase().includes('ui')) {
    suggestedWorkflow = 'design_workflow';
  } else if (userPrompt.toLowerCase().includes('feature') || userPrompt.toLowerCase().includes('implement')) {
    suggestedWorkflow = 'feature_development_workflow';
  } else if (userPrompt.toLowerCase().includes('bug') || userPrompt.toLowerCase().includes('fix')) {
    suggestedWorkflow = 'bug_fix_workflow';
  } else if (userPrompt.toLowerCase().includes('database') || userPrompt.toLowerCase().includes('migration')) {
    suggestedWorkflow = 'database_changes_workflow';
  }

  return {
    redFlags,
    suggestedWorkflow,
    behaviorAdjustments: behaviorProfile,
    enforcementRules: executionPolicy
  };
}

export default SystemConfigurationManager;
