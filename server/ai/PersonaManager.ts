
import SystemConfigurationManager from '../../system_config/config-loader.js';
import type { BehaviorProfileConfig } from '../../system_config/types.js';

export interface PersonaContext {
  userId?: string;
  userRole?: string;
  requestType?: string;
  entityContext?: Record<string, any>;
  isInternal?: boolean;
}

export interface AIResponse {
  content: string;
  tone: string;
  confidence: number;
  persona: string;
  metadata?: Record<string, any>;
}

class PersonaManager {
  private static instance: PersonaManager;
  private configManager: SystemConfigurationManager;
  private activePersonas: Map<string, string> = new Map();

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
  }

  public static getInstance(): PersonaManager {
    if (!PersonaManager.instance) {
      PersonaManager.instance = new PersonaManager();
    }
    return PersonaManager.instance;
  }

  /**
   * Determine the appropriate persona based on context
   */
  public determinePersona(context: PersonaContext): string {
    const config = this.configManager.getBehaviorProfile();
    
    // Check for existing active persona for this user
    if (context.userId && this.activePersonas.has(context.userId)) {
      return this.activePersonas.get(context.userId)!;
    }

    // Determine persona based on user role and context
    if (context.isInternal || this.isInternalRole(context.userRole)) {
      return 'internalDevAssistant';
    }

    // Default to customer support for external users
    return config.defaultPersona;
  }

  /**
   * Set active persona for a user session
   */
  public setActivePersona(userId: string, persona: string): void {
    const config = this.configManager.getBehaviorProfile();
    
    if (!config.personas[persona]) {
      throw new Error(`Persona '${persona}' not found in configuration`);
    }

    this.activePersonas.set(userId, persona);
  }

  /**
   * Generate AI response using configured persona
   */
  public async generateResponse(
    prompt: string,
    context: PersonaContext
  ): Promise<AIResponse> {
    const persona = this.determinePersona(context);
    const config = this.configManager.getBehaviorProfile();
    const personaConfig = config.personas[persona];

    if (!personaConfig) {
      throw new Error(`Persona configuration not found: ${persona}`);
    }

    // Build system prompt with persona guidelines
    const systemPrompt = this.buildSystemPrompt(personaConfig, context);
    
    // Generate response (this would integrate with actual LLM)
    const response = await this.callLLM(systemPrompt, prompt, config.llmConfig);

    return {
      content: response.content,
      tone: personaConfig.tone,
      confidence: response.confidence || 0.8,
      persona,
      metadata: {
        assertiveness: personaConfig.assertiveness,
        guidelines: personaConfig.guidelines
      }
    };
  }

  /**
   * Validate response against persona guidelines
   */
  public validateResponse(response: string, persona: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const config = this.configManager.getBehaviorProfile();
    const personaConfig = config.personas[persona];
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!personaConfig) {
      return { valid: false, issues: ['Invalid persona'], suggestions: [] };
    }

    // Check tone consistency
    if (personaConfig.tone === 'friendly and professional' && this.detectRudeTone(response)) {
      issues.push('Response tone is too aggressive for customer support persona');
      suggestions.push('Use more polite and helpful language');
    }

    if (personaConfig.tone === 'technical and direct' && this.detectOverlyFriendly(response)) {
      issues.push('Response is too casual for internal dev assistant persona');
      suggestions.push('Use more direct, technical language');
    }

    // Check assertiveness level
    if (personaConfig.assertiveness === 'high' && this.detectPassiveLanguage(response)) {
      issues.push('Response lacks assertiveness expected for this persona');
      suggestions.push('Be more proactive and decisive in recommendations');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Get persona configuration
   */
  public getPersonaConfig(persona: string) {
    const config = this.configManager.getBehaviorProfile();
    return config.personas[persona];
  }

  /**
   * List available personas
   */
  public getAvailablePersonas(): string[] {
    const config = this.configManager.getBehaviorProfile();
    return Object.keys(config.personas);
  }

  // Private helper methods

  private isInternalRole(role?: string): boolean {
    const internalRoles = ['admin', 'designer', 'manufacturer', 'salesperson'];
    return role ? internalRoles.includes(role.toLowerCase()) : false;
  }

  private buildSystemPrompt(personaConfig: any, context: PersonaContext): string {
    let prompt = `You are a ${personaConfig.description}\n`;
    prompt += `Your tone should be ${personaConfig.tone}.\n`;
    prompt += `Your assertiveness level is ${personaConfig.assertiveness}.\n\n`;
    prompt += `Guidelines:\n`;
    
    personaConfig.guidelines.forEach((guideline: string, index: number) => {
      prompt += `${index + 1}. ${guideline}\n`;
    });

    if (context.userRole) {
      prompt += `\nUser role: ${context.userRole}\n`;
    }

    if (context.requestType) {
      prompt += `Request type: ${context.requestType}\n`;
    }

    return prompt;
  }

  private async callLLM(systemPrompt: string, userPrompt: string, llmConfig: any): Promise<{
    content: string;
    confidence?: number;
  }> {
    // This would integrate with actual LLM API (OpenAI, etc.)
    // For now, return a mock response
    return {
      content: `[AI Response would be generated here using ${llmConfig.model} with temperature ${llmConfig.temperature}]`,
      confidence: 0.8
    };
  }

  private detectRudeTone(response: string): boolean {
    const rudeIndicators = ['wrong', 'stupid', 'obviously', 'clearly you', 'just'];
    return rudeIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private detectOverlyFriendly(response: string): boolean {
    const friendlyIndicators = ['awesome', 'amazing', 'super', '!', 'love'];
    return friendlyIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private detectPassiveLanguage(response: string): boolean {
    const passiveIndicators = ['maybe', 'perhaps', 'might want to', 'could try'];
    return passiveIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }
}

export default PersonaManager;
