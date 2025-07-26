
import SystemConfigurationManager from '../../system_config/config-loader.js';
import { evaluatePrompt } from '../../system_config/config-loader.js';
import type { RedFlagConfig } from '../../system_config/types.js';

export interface ValidationResult {
  passed: boolean;
  score: number;
  flags: ValidationFlag[];
  suggestions: string[];
  metadata: Record<string, any>;
}

export interface ValidationFlag {
  severity: 'critical' | 'medium' | 'low';
  type: string;
  message: string;
  suggestion?: string;
}

class ResponseValidator {
  private static instance: ResponseValidator;
  private configManager: SystemConfigurationManager;

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
  }

  public static getInstance(): ResponseValidator {
    if (!ResponseValidator.instance) {
      ResponseValidator.instance = new ResponseValidator();
    }
    return ResponseValidator.instance;
  }

  /**
   * Validate AI response against all quality gates
   */
  public validateResponse(
    response: string,
    context: {
      persona?: string;
      userRole?: string;
      requestType?: string;
    }
  ): ValidationResult {
    const flags: ValidationFlag[] = [];
    let score = 100;

    // Red flag detection
    const redFlagResult = this.checkRedFlags(response);
    flags.push(...redFlagResult.flags);
    score -= redFlagResult.penalty;

    // Length validation
    const lengthResult = this.validateLength(response);
    flags.push(...lengthResult.flags);
    score -= lengthResult.penalty;

    // Format validation
    const formatResult = this.validateFormat(response);
    flags.push(...formatResult.flags);
    score -= formatResult.penalty;

    // Brand voice consistency
    const brandResult = this.validateBrandVoice(response, context.persona);
    flags.push(...brandResult.flags);
    score -= brandResult.penalty;

    // Content appropriateness
    const contentResult = this.validateContentAppropriateness(response);
    flags.push(...contentResult.flags);
    score -= contentResult.penalty;

    const passed = score >= 70 && !flags.some(f => f.severity === 'critical');

    return {
      passed,
      score: Math.max(0, score),
      flags,
      suggestions: this.generateSuggestions(flags),
      metadata: {
        persona: context.persona,
        userRole: context.userRole,
        requestType: context.requestType,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Check response against red flag patterns
   */
  private checkRedFlags(response: string): { flags: ValidationFlag[]; penalty: number } {
    const redFlagResult = evaluatePrompt(response);
    const flags: ValidationFlag[] = [];
    let penalty = 0;

    if (!redFlagResult.viable) {
      redFlagResult.issues.forEach(issue => {
        const [severity, message] = issue.split('] ');
        const severityLevel = severity.replace('[', '').toLowerCase() as 'critical' | 'medium' | 'low';
        
        flags.push({
          severity: severityLevel,
          type: 'red_flag',
          message: message,
          suggestion: 'Review and revise content to remove inappropriate elements'
        });

        // Apply penalties based on severity
        switch (severityLevel) {
          case 'critical':
            penalty += 50;
            break;
          case 'medium':
            penalty += 20;
            break;
          case 'low':
            penalty += 5;
            break;
        }
      });
    }

    return { flags, penalty };
  }

  /**
   * Validate response length
   */
  private validateLength(response: string): { flags: ValidationFlag[]; penalty: number } {
    const flags: ValidationFlag[] = [];
    let penalty = 0;

    const config = this.configManager.getBehaviorProfile();
    const maxTokens = config.llmConfig?.maxTokens || 1024;
    const estimatedTokens = response.length / 4; // Rough token estimation

    if (estimatedTokens > maxTokens) {
      flags.push({
        severity: 'medium',
        type: 'length',
        message: `Response exceeds maximum length (${estimatedTokens} > ${maxTokens} tokens)`,
        suggestion: 'Shorten response while maintaining key information'
      });
      penalty += 15;
    }

    if (response.length < 10) {
      flags.push({
        severity: 'medium',
        type: 'length',
        message: 'Response is too short to be helpful',
        suggestion: 'Provide more detailed and helpful information'
      });
      penalty += 10;
    }

    return { flags, penalty };
  }

  /**
   * Validate response format
   */
  private validateFormat(response: string): { flags: ValidationFlag[]; penalty: number } {
    const flags: ValidationFlag[] = [];
    let penalty = 0;

    // Check for proper sentence structure
    if (!response.match(/[.!?]$/)) {
      flags.push({
        severity: 'low',
        type: 'format',
        message: 'Response should end with proper punctuation',
        suggestion: 'Add appropriate ending punctuation'
      });
      penalty += 2;
    }

    // Check for excessive capitalization
    const capsCount = (response.match(/[A-Z]/g) || []).length;
    const totalLetters = (response.match(/[a-zA-Z]/g) || []).length;
    if (totalLetters > 0 && (capsCount / totalLetters) > 0.3) {
      flags.push({
        severity: 'medium',
        type: 'format',
        message: 'Excessive use of capital letters detected',
        suggestion: 'Use normal capitalization for better readability'
      });
      penalty += 10;
    }

    return { flags, penalty };
  }

  /**
   * Validate brand voice consistency
   */
  private validateBrandVoice(response: string, persona?: string): { flags: ValidationFlag[]; penalty: number } {
    const flags: ValidationFlag[] = [];
    let penalty = 0;

    if (!persona) {
      return { flags, penalty };
    }

    const config = this.configManager.getBehaviorProfile();
    const personaConfig = config.personas[persona];

    if (!personaConfig) {
      return { flags, penalty };
    }

    // Check tone consistency
    if (personaConfig.tone === 'friendly and professional') {
      if (this.detectUnprofessionalLanguage(response)) {
        flags.push({
          severity: 'medium',
          type: 'brand_voice',
          message: 'Response contains unprofessional language',
          suggestion: 'Use more professional and courteous language'
        });
        penalty += 15;
      }
    }

    if (personaConfig.tone === 'technical and direct') {
      if (this.detectOverlyFormalLanguage(response)) {
        flags.push({
          severity: 'low',
          type: 'brand_voice',
          message: 'Response is too formal for technical context',
          suggestion: 'Use more direct, technical language'
        });
        penalty += 5;
      }
    }

    return { flags, penalty };
  }

  /**
   * Validate content appropriateness
   */
  private validateContentAppropriateness(response: string): { flags: ValidationFlag[]; penalty: number } {
    const flags: ValidationFlag[] = [];
    let penalty = 0;

    // Check for inappropriate content patterns
    const inappropriatePatterns = [
      /\b(hate|stupid|idiot|moron)\b/i,
      /\b(damn|hell|crap)\b/i,
      /\b(spam|scam|fake)\b/i
    ];

    inappropriatePatterns.forEach(pattern => {
      if (pattern.test(response)) {
        flags.push({
          severity: 'critical',
          type: 'content',
          message: 'Response contains inappropriate language',
          suggestion: 'Remove inappropriate language and use professional alternatives'
        });
        penalty += 30;
      }
    });

    return { flags, penalty };
  }

  /**
   * Generate improvement suggestions based on flags
   */
  private generateSuggestions(flags: ValidationFlag[]): string[] {
    const suggestions: string[] = [];
    const suggestionSet = new Set<string>();

    flags.forEach(flag => {
      if (flag.suggestion && !suggestionSet.has(flag.suggestion)) {
        suggestions.push(flag.suggestion);
        suggestionSet.add(flag.suggestion);
      }
    });

    // Add general suggestions based on flag types
    const flagTypes = flags.map(f => f.type);
    
    if (flagTypes.includes('red_flag')) {
      suggestions.push('Review content for compliance and appropriateness');
    }
    
    if (flagTypes.includes('brand_voice')) {
      suggestions.push('Ensure response matches the intended persona and tone');
    }

    if (flagTypes.includes('length')) {
      suggestions.push('Optimize response length for better user experience');
    }

    return suggestions;
  }

  // Helper methods for content detection

  private detectUnprofessionalLanguage(response: string): boolean {
    const unprofessionalIndicators = ['yeah', 'nope', 'gonna', 'wanna', 'dunno'];
    return unprofessionalIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
  }

  private detectOverlyFormalLanguage(response: string): boolean {
    const formalIndicators = ['furthermore', 'henceforth', 'whereby', 'heretofore'];
    return formalIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
  }
}

export default ResponseValidator;
