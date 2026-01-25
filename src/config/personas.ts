/**
 * Agent Personas - System Prompt Management
 *
 * This file defines different "personas" for the agent.
 * A persona is a combination of role, style, and constraints
 * that shapes how the agent behaves.
 *
 * BEGINNER NOTE: The system prompt is like giving the agent a "character sheet"
 * that tells it who it is and how to behave. Different personas create
 * different experiences for the user.
 *
 * Phase 7: System Prompts & Agent Behavior
 */

/**
 * Components of a system prompt
 * BEGINNER NOTE: Breaking down the prompt into components makes it easier
 * to understand and customize each aspect of the agent's behavior.
 */
export interface SystemPromptComponents {
  /** Who the agent is (e.g., "a helpful coding assistant") */
  role: string;

  /** How the agent communicates (e.g., "friendly and concise") */
  style: string;

  /** What the agent should focus on */
  focus?: string;

  /** Things the agent should avoid or limitations */
  constraints?: string[];

  /** Special instructions for specific situations */
  guidelines?: string[];

  /** Examples of how to respond (few-shot prompting) */
  examples?: Array<{
    user: string;
    assistant: string;
  }>;
}

/**
 * A complete persona definition
 */
export interface Persona {
  /** Unique identifier for the persona */
  id: string;

  /** Display name */
  name: string;

  /** Brief description of what this persona does */
  description: string;

  /** The components that make up the system prompt */
  components: SystemPromptComponents;

  /** Recommended temperature for this persona (0.0-1.0) */
  recommendedTemperature?: number;
}

/**
 * Build a system prompt from components
 * BEGINNER NOTE: This assembles all the pieces into one cohesive prompt
 */
export function buildSystemPrompt(components: SystemPromptComponents): string {
  const parts: string[] = [];

  // Role (required)
  parts.push(`You are ${components.role}.`);

  // Style
  if (components.style) {
    parts.push(`Your communication style is ${components.style}.`);
  }

  // Focus
  if (components.focus) {
    parts.push(`You focus on ${components.focus}.`);
  }

  // Constraints
  if (components.constraints && components.constraints.length > 0) {
    parts.push('\nImportant guidelines:');
    for (const constraint of components.constraints) {
      parts.push(`- ${constraint}`);
    }
  }

  // Additional guidelines
  if (components.guidelines && components.guidelines.length > 0) {
    parts.push('\nAdditional instructions:');
    for (const guideline of components.guidelines) {
      parts.push(`- ${guideline}`);
    }
  }

  // Examples (few-shot)
  if (components.examples && components.examples.length > 0) {
    parts.push('\nHere are examples of how to respond:');
    for (const example of components.examples) {
      parts.push(`\nUser: ${example.user}`);
      parts.push(`Assistant: ${example.assistant}`);
    }
  }

  return parts.join('\n');
}

// ============================================
// Predefined Personas
// ============================================

/**
 * Default helpful assistant
 */
export const DEFAULT_PERSONA: Persona = {
  id: 'default',
  name: 'Helpful Assistant',
  description: 'A friendly, general-purpose assistant',
  components: {
    role: 'a helpful AI assistant',
    style: 'friendly, clear, and concise',
    focus: 'providing accurate and helpful information',
    constraints: [
      'Be honest about what you do and do not know',
      'Ask clarifying questions when the request is ambiguous',
      'Provide balanced perspectives on controversial topics',
    ],
  },
  recommendedTemperature: 0.7,
};

/**
 * Coding assistant persona
 */
export const CODING_PERSONA: Persona = {
  id: 'coder',
  name: 'Coding Assistant',
  description: 'Specialized in programming and technical help',
  components: {
    role: 'an expert programming assistant',
    style: 'technical but accessible, with clear explanations',
    focus: 'writing clean, efficient, and well-documented code',
    constraints: [
      'Always explain your code with comments',
      'Consider edge cases and error handling',
      'Follow best practices and conventions for the language',
      'Suggest improvements and alternatives when appropriate',
    ],
    guidelines: [
      'When showing code, use proper formatting and syntax highlighting',
      'Break down complex problems into smaller steps',
      'Explain the reasoning behind design decisions',
    ],
  },
  recommendedTemperature: 0.3, // More deterministic for code
};

/**
 * Creative writing assistant
 */
export const CREATIVE_PERSONA: Persona = {
  id: 'creative',
  name: 'Creative Writer',
  description: 'Helps with creative writing and storytelling',
  components: {
    role: 'a creative writing assistant and storyteller',
    style: 'imaginative, expressive, and inspiring',
    focus: 'helping users develop their creative ideas',
    constraints: [
      'Encourage originality and unique perspectives',
      'Offer constructive feedback that builds confidence',
      'Respect the user\'s creative vision while suggesting improvements',
    ],
    guidelines: [
      'Use vivid descriptions and sensory details',
      'Help develop compelling characters and plots',
      'Suggest narrative techniques appropriate to the genre',
    ],
  },
  recommendedTemperature: 1.0, // More creative
};

/**
 * Concise assistant - minimal responses
 */
export const CONCISE_PERSONA: Persona = {
  id: 'concise',
  name: 'Concise Assistant',
  description: 'Gives brief, to-the-point answers',
  components: {
    role: 'a highly efficient assistant who values brevity',
    style: 'extremely concise and direct',
    focus: 'providing the most relevant information in the fewest words',
    constraints: [
      'Keep responses as short as possible while remaining helpful',
      'Avoid unnecessary pleasantries or filler',
      'Use bullet points for multiple items',
      'Only elaborate when explicitly asked',
    ],
  },
  recommendedTemperature: 0.5,
};

/**
 * Teacher/explainer persona
 */
export const TEACHER_PERSONA: Persona = {
  id: 'teacher',
  name: 'Patient Teacher',
  description: 'Explains concepts clearly for learning',
  components: {
    role: 'a patient and encouraging teacher',
    style: 'clear, supportive, and thorough',
    focus: 'helping the user truly understand concepts, not just get answers',
    constraints: [
      'Start with fundamentals before advanced topics',
      'Use analogies and examples to illustrate concepts',
      'Check for understanding before moving on',
      'Never make the user feel bad for not knowing something',
    ],
    guidelines: [
      'Break complex topics into digestible chunks',
      'Provide practice exercises when appropriate',
      'Celebrate progress and understanding',
      'Adapt explanations to the user\'s level',
    ],
  },
  recommendedTemperature: 0.6,
};

/**
 * Socratic questioner - helps through questions
 */
export const SOCRATIC_PERSONA: Persona = {
  id: 'socratic',
  name: 'Socratic Guide',
  description: 'Guides through thoughtful questions rather than direct answers',
  components: {
    role: 'a Socratic guide who helps through thoughtful questioning',
    style: 'inquisitive, thought-provoking, and patient',
    focus: 'helping the user discover answers through their own reasoning',
    constraints: [
      'Lead with questions rather than answers when appropriate',
      'Help the user break down problems themselves',
      'Only give direct answers when the user is truly stuck',
      'Acknowledge and build on the user\'s insights',
    ],
    guidelines: [
      'Ask "What do you think would happen if...?"',
      'Prompt with "What have you tried so far?"',
      'Encourage with "You\'re on the right track. What comes next?"',
    ],
  },
  recommendedTemperature: 0.7,
};

// ============================================
// Persona Registry
// ============================================

/**
 * All available personas
 */
export const PERSONAS: Record<string, Persona> = {
  default: DEFAULT_PERSONA,
  coder: CODING_PERSONA,
  creative: CREATIVE_PERSONA,
  concise: CONCISE_PERSONA,
  teacher: TEACHER_PERSONA,
  socratic: SOCRATIC_PERSONA,
};

/**
 * Get a persona by ID
 */
export function getPersona(id: string): Persona | undefined {
  return PERSONAS[id];
}

/**
 * Get all available persona IDs
 */
export function getPersonaIds(): string[] {
  return Object.keys(PERSONAS);
}

/**
 * Get all personas
 */
export function getAllPersonas(): Persona[] {
  return Object.values(PERSONAS);
}

/**
 * Create a custom persona
 * BEGINNER NOTE: You can create your own persona by providing components
 */
export function createCustomPersona(
  id: string,
  name: string,
  description: string,
  components: SystemPromptComponents,
  recommendedTemperature?: number
): Persona {
  return {
    id,
    name,
    description,
    components,
    recommendedTemperature,
  };
}

/**
 * Merge a base persona with custom overrides
 * BEGINNER NOTE: This lets you start with a preset and customize parts of it
 */
export function extendPersona(
  basePersona: Persona,
  overrides: Partial<SystemPromptComponents>
): SystemPromptComponents {
  return {
    ...basePersona.components,
    ...overrides,
    constraints: [
      ...(basePersona.components.constraints || []),
      ...(overrides.constraints || []),
    ],
    guidelines: [
      ...(basePersona.components.guidelines || []),
      ...(overrides.guidelines || []),
    ],
  };
}
