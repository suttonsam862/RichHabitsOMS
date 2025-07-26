import fs from "fs";
import path from "path";

const configPaths = [
  "./system_config/behavior-profile.json",
  "./system_config/execution-policy.json",
  "./system_config/common-build-rules.json",
  "./system_config/red-flag-detection.json",
  "./system_config/workflow-routes.json"
];

export const loadedConfigs = configPaths.reduce((acc, configPath) => {
  const fileName = configPath.split("/").pop() as string;
  try {
    const fullPath = path.resolve(configPath);
    const fileContent = fs.readFileSync(fullPath, "utf8");
    acc[fileName] = JSON.parse(fileContent);
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

    // Configs are already loaded via loadedConfigs
    this.isInitialized = true;
    console.log('✅ System Configuration loaded successfully');
  }

  public getBehaviorProfile() {
    return loadedConfigs["behavior-profile.json"];
  }

  public getExecutionPolicy() {
    return loadedConfigs["execution-policy.json"];
  }

  public getCommonBuildRules() {
    return loadedConfigs["common-build-rules.json"];
  }

  public getRedFlagDetection() {
    return loadedConfigs["red-flag-detection.json"];
  }

  public getWorkflowRoutes() {
    return loadedConfigs["workflow-routes.json"];
  }

  public validateConfiguration(): boolean {
    const requiredFiles = [
      "behavior-profile.json",
      "execution-policy.json", 
      "common-build-rules.json",
      "red-flag-detection.json",
      "workflow-routes.json"
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
}

export default SystemConfigurationManager;