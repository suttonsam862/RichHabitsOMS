
# System Configuration Directory

This directory contains the foundational parameter files that govern the behavior, logic, and tone of both the agent and assistant across all tasks. These JSON configuration files serve as the brain behind how the assistant and agent function.

## Configuration Files

### 1. behavior-profile.json
**Purpose**: Defines personality, tone, conversational aggressiveness, and how agreeable or blunt the assistant and agent should be.

**Key Parameters**:
- `agreeabilityThreshold` (0-10): How likely to agree vs challenge user requests
- `defaultTone`: Base communication style for all interactions
- `conflictTolerance`: How directly to address problematic requests
- `humorAllowance`: When and how to inject appropriate humor

### 2. execution-policy.json
**Purpose**: Defines what standards every implementation must meet.

**Key Parameters**:
- `requireErrorHandling`: Enforces comprehensive error management
- `enforceScalability`: Ensures solutions can grow with demand
- `testCoverageRequired`: Mandates testing implementation
- `noHardcodedKeys`: Prevents security vulnerabilities
- `modularStructureRequired`: Promotes maintainable architecture

### 3. common-build-rules.json
**Purpose**: Library of default logic and UI rules that apply to commonly requested builds.

**Key Features**:
- Auto-resizing popups and modals
- Form validation requirements
- Navigation standards
- Performance optimization rules
- Accessibility compliance

### 4. red-flag-detection.json
**Purpose**: Library of string patterns or design smells that must be challenged before execution.

**Detection Categories**:
- Security vulnerabilities (insecure storage, auth bypass)
- Architecture issues (tight coupling, performance problems)
- Code quality concerns (maintainability, error handling)
- User experience problems (accessibility, usability)

### 5. workflow-routes.json
**Purpose**: High-level map of default workflows for common development tasks.

**Workflow Types**:
- Design workflow (idea → planning → implementation → testing → optimization)
- Feature development workflow (requirements → design → development → testing → deployment)
- Bug fix workflow (reproduction → analysis → solution → implementation → testing)
- Database changes workflow (analysis → migration → backup → implementation → testing)

## Usage

The configuration system is initialized through the `config-loader.ts` script, which:

1. Loads and parses all configuration files on startup
2. Stores them in memory for runtime access
3. Provides a centralized `evaluatePrompt()` function
4. References these configs to guide behavior in real-time

## Versioning

Each configuration file includes:
- Version number for tracking changes
- Last updated timestamp
- Internal documentation explaining purpose and usage
- Parameter explanations for easy maintenance

## Scalability

This system allows for:
- Easy addition of new rules and parameters
- Dynamic behavior adjustment without code changes
- Future visual editor implementation
- Consistent behavior across all interactions

## Initialization

To use the system configuration:

```typescript
import SystemConfigurationManager from './system_config/config-loader';

// Initialize the configuration manager
const configManager = SystemConfigurationManager.getInstance();
await configManager.initialize();

// Evaluate user prompts
const evaluation = evaluatePrompt(userPrompt);
```

The system will automatically reference these configurations to maintain consistent, high-quality responses and implementations across all tasks.
