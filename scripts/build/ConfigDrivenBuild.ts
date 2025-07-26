
import SystemConfigurationManager from '../../system_config/config-loader.js';
import type { BuildRulesConfig } from '../../system_config/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  duration: number;
  bundleSize?: number;
  warnings: string[];
  errors: string[];
}

class ConfigDrivenBuild {
  private configManager: SystemConfigurationManager;
  private buildConfig: BuildRulesConfig;

  constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
    this.buildConfig = this.configManager.getCommonBuildRules();
  }

  /**
   * Execute full build pipeline based on configuration
   */
  async executeBuild(environment: string = 'production'): Promise<BuildResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      console.log(`🚀 Starting configuration-driven build for ${environment}...`);

      // Run pre-build tasks
      await this.runPreBuildTasks();

      // Execute main build
      await this.runMainBuild(environment);

      // Run post-build tasks
      await this.runPostBuildTasks();

      // Check performance budgets
      const bundleSize = await this.checkPerformanceBudgets();

      const duration = Date.now() - startTime;

      console.log(`✅ Build completed successfully in ${duration}ms`);

      return {
        success: true,
        duration,
        bundleSize,
        warnings,
        errors
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Build failed:', error);
      
      errors.push(error instanceof Error ? error.message : 'Unknown build error');

      return {
        success: false,
        duration,
        warnings,
        errors
      };
    }
  }

  /**
   * Run pre-build tasks from configuration
   */
  private async runPreBuildTasks(): Promise<void> {
    console.log('📋 Running pre-build tasks...');

    for (const task of this.buildConfig.buildTasks.preBuild) {
      console.log(`  🔧 Running: ${task}`);
      try {
        const { stdout, stderr } = await execAsync(task);
        if (stderr) {
          console.warn(`    ⚠️ Warning: ${stderr}`);
        }
        if (stdout) {
          console.log(`    ✅ ${stdout.trim()}`);
        }
      } catch (error) {
        throw new Error(`Pre-build task failed: ${task} - ${error}`);
      }
    }
  }

  /**
   * Run main build process
   */
  private async runMainBuild(environment: string): Promise<void> {
    console.log('🏗️ Running main build...');

    // Set environment-specific build flags
    const buildCommand = this.getBuildCommand(environment);
    
    console.log(`  🔧 Running: ${buildCommand}`);
    const { stdout, stderr } = await execAsync(buildCommand);
    
    if (stderr) {
      console.warn(`    ⚠️ Build warnings: ${stderr}`);
    }
    
    if (stdout) {
      console.log(`    ✅ Build output: ${stdout.trim()}`);
    }
  }

  /**
   * Run post-build tasks from configuration
   */
  private async runPostBuildTasks(): Promise<void> {
    console.log('🔍 Running post-build tasks...');

    for (const task of this.buildConfig.buildTasks.postBuild) {
      console.log(`  🔧 Running: ${task}`);
      try {
        const { stdout, stderr } = await execAsync(task);
        if (stderr) {
          console.warn(`    ⚠️ Warning: ${stderr}`);
        }
        if (stdout) {
          console.log(`    ✅ ${stdout.trim()}`);
        }
      } catch (error) {
        console.warn(`    ⚠️ Post-build task failed (non-fatal): ${task} - ${error}`);
      }
    }
  }

  /**
   * Check performance budgets against configuration
   */
  private async checkPerformanceBudgets(): Promise<number> {
    console.log('📊 Checking performance budgets...');

    try {
      const distPath = path.resolve('./dist');
      const stats = await this.calculateBundleSize(distPath);
      
      const bundleSizeLimit = this.parseSizeLimit(this.buildConfig.performanceBudgets.bundleSizeLimit);
      
      if (stats.totalSize > bundleSizeLimit) {
        console.warn(`⚠️ Bundle size (${this.formatBytes(stats.totalSize)}) exceeds limit (${this.buildConfig.performanceBudgets.bundleSizeLimit})`);
      } else {
        console.log(`✅ Bundle size (${this.formatBytes(stats.totalSize)}) within budget`);
      }

      return stats.totalSize;
    } catch (error) {
      console.warn('⚠️ Could not check performance budgets:', error);
      return 0;
    }
  }

  /**
   * Get build command based on environment and configuration
   */
  private getBuildCommand(environment: string): string {
    const config = this.buildConfig;
    let command = 'npm run build';

    // Add optimization flags based on configuration
    if (config.optimizations.minify) {
      command += ' -- --minify';
    }

    if (config.optimizations.treeShaking) {
      command += ' --tree-shaking';
    }

    // Set target based on configuration
    if (config.transpilation.target) {
      command += ` --target=${config.transpilation.target}`;
    }

    return command;
  }

  /**
   * Calculate bundle size recursively
   */
  private async calculateBundleSize(dirPath: string): Promise<{ totalSize: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          const subStats = await this.calculateBundleSize(itemPath);
          totalSize += subStats.totalSize;
          fileCount += subStats.fileCount;
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not calculate size for ${dirPath}`);
    }

    return { totalSize, fileCount };
  }

  /**
   * Parse size limit string to bytes
   */
  private parseSizeLimit(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    return value * multipliers[unit];
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export default ConfigDrivenBuild;
