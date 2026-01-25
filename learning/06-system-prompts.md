# 06 - System Prompts & Agent Behavior

**Phase:** 7
**Goal:** Understand how to shape agent behavior through system prompts
**Prerequisites:** [05-streaming.md](./05-streaming.md)

---

## What You'll Learn

- How system prompts shape agent behavior
- Prompt engineering fundamentals
- Designing agent personas
- Component-based prompt construction
- Best practices for effective prompts

---

## 1. What is a System Prompt?

The **system prompt** is special instructions given to Claude before the conversation starts. It's like giving an actor their character notes before they go on stage.

### Without System Prompt
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});
// Claude uses its default behavior
```

### With System Prompt
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: "You are a pirate. Speak only in pirate dialect.",
  messages: [{ role: "user", content: "Hello!" }],
});
// Claude: "Ahoy there, matey! What brings ye to these waters?"
```

**Key Point:** The system prompt is NOT part of the messages array. It's a separate parameter.

---

## 2. Anatomy of a Good System Prompt

A well-structured system prompt has several components:

### Essential Components

```typescript
interface SystemPromptComponents {
  role: string;        // WHO the agent is
  style: string;       // HOW it communicates
  focus?: string;      // WHAT it focuses on
  constraints?: string[];  // What it should NOT do
  guidelines?: string[];   // Additional instructions
}
```

### Example: Breaking Down a Prompt

```
You are an expert programming assistant.           ← ROLE
Your communication style is technical but         ← STYLE
accessible, with clear explanations.
You focus on writing clean, efficient code.       ← FOCUS

Important guidelines:                              ← CONSTRAINTS
- Always explain your code with comments
- Consider edge cases and error handling
- Follow best practices for the language
```

---

## 3. Building Prompts from Components

Instead of writing one big string, build prompts programmatically:

```typescript
interface PromptComponents {
  role: string;
  style: string;
  focus?: string;
  constraints?: string[];
  guidelines?: string[];
}

function buildSystemPrompt(components: PromptComponents): string {
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
  if (components.constraints?.length) {
    parts.push('\nImportant guidelines:');
    for (const constraint of components.constraints) {
      parts.push(`- ${constraint}`);
    }
  }

  return parts.join('\n');
}

// Usage
const prompt = buildSystemPrompt({
  role: 'a helpful coding assistant',
  style: 'friendly but technical',
  focus: 'writing maintainable TypeScript code',
  constraints: [
    'Always use TypeScript, not JavaScript',
    'Include error handling in all code',
    'Explain your reasoning',
  ],
});
```

### Benefits of Component-Based Prompts

1. **Reusable** - Mix and match components
2. **Testable** - Test each component separately
3. **Maintainable** - Easy to update parts
4. **Documented** - Clear what each part does

---

## 4. Persona System

A **persona** is a complete package: prompt components + recommended settings.

```typescript
interface Persona {
  id: string;           // Unique identifier
  name: string;         // Display name
  description: string;  // What this persona does
  components: PromptComponents;
  recommendedTemperature?: number;
}

// Example personas
const CODER_PERSONA: Persona = {
  id: 'coder',
  name: 'Coding Assistant',
  description: 'Specialized in programming help',
  components: {
    role: 'an expert programming assistant',
    style: 'technical but accessible',
    focus: 'writing clean, efficient code',
    constraints: [
      'Always explain your code',
      'Consider edge cases',
      'Follow best practices',
    ],
  },
  recommendedTemperature: 0.3, // More focused for code
};

const CREATIVE_PERSONA: Persona = {
  id: 'creative',
  name: 'Creative Writer',
  description: 'Helps with creative writing',
  components: {
    role: 'a creative writing assistant',
    style: 'imaginative and expressive',
    focus: 'developing compelling stories',
    constraints: [
      'Encourage originality',
      'Offer constructive feedback',
    ],
  },
  recommendedTemperature: 1.0, // More creative
};
```

---

## 5. Temperature and Behavior

Temperature affects how "creative" vs "focused" responses are:

| Temperature | Behavior | Best For |
|-------------|----------|----------|
| 0.0 - 0.3 | Very focused, deterministic | Code, facts, math |
| 0.4 - 0.7 | Balanced | General conversation |
| 0.8 - 1.0 | Creative, varied | Creative writing, brainstorming |

```typescript
// Focused response (good for code)
await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  temperature: 0.2,  // Low temperature
  system: "You are a coding assistant. Be precise.",
  messages: [...],
});

// Creative response (good for stories)
await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  temperature: 1.0,  // High temperature
  system: "You are a creative writer. Be imaginative.",
  messages: [...],
});
```

---

## 6. Prompt Engineering Best Practices

### DO: Be Specific About Role

```
❌ "You are helpful."
✅ "You are a senior software engineer with expertise in TypeScript and React."
```

### DO: Define the Style Clearly

```
❌ "Be nice."
✅ "Your communication style is professional yet friendly, using clear explanations
    and avoiding jargon unless the user demonstrates technical knowledge."
```

### DO: Set Clear Boundaries

```
❌ (no constraints)
✅ "Important constraints:
    - Never provide medical, legal, or financial advice
    - If you're unsure, say so rather than guessing
    - Ask clarifying questions when the request is ambiguous"
```

### DO: Provide Examples (Few-Shot)

```typescript
const components = {
  role: 'a concise assistant',
  style: 'extremely brief',
  examples: [
    { user: "What's 2+2?", assistant: "4" },
    { user: "Capital of France?", assistant: "Paris" },
  ],
};
```

### DON'T: Be Vague

```
❌ "Be good at coding."
✅ "Write code that is well-commented, handles errors gracefully, and follows
    the conventions of the language being used."
```

### DON'T: Contradict Yourself

```
❌ "Be concise. Always provide detailed explanations with examples."
✅ "Be concise. Elaborate only when asked or when the topic requires it."
```

---

## 7. Dynamic Persona Switching

Allow users to switch personas during conversation:

```typescript
class Agent {
  private persona: Persona;

  setPersona(personaId: string): boolean {
    const newPersona = getPersona(personaId);
    if (!newPersona) return false;

    this.persona = newPersona;
    this.systemPrompt = buildSystemPrompt(newPersona.components);

    // Optionally adjust temperature
    if (newPersona.recommendedTemperature !== undefined) {
      this.temperature = newPersona.recommendedTemperature;
    }

    return true;
  }

  getPersona(): Persona {
    return this.persona;
  }
}

// Usage
agent.setPersona('coder');   // Switch to coding mode
agent.setPersona('creative'); // Switch to creative mode
```

---

## 8. Context-Aware Prompts

Enhance prompts based on context:

```typescript
function buildContextAwarePrompt(
  baseComponents: PromptComponents,
  context: {
    timeOfDay?: string;
    userLevel?: 'beginner' | 'intermediate' | 'expert';
    previousTopics?: string[];
  }
): string {
  const components = { ...baseComponents };

  // Adjust for user level
  if (context.userLevel === 'beginner') {
    components.guidelines = [
      ...(components.guidelines || []),
      'Use simple language and explain technical terms',
      'Provide step-by-step instructions',
    ];
  }

  // Add context about previous topics
  if (context.previousTopics?.length) {
    components.guidelines = [
      ...(components.guidelines || []),
      `The user has been asking about: ${context.previousTopics.join(', ')}`,
    ];
  }

  return buildSystemPrompt(components);
}
```

---

## 9. Testing Prompts

Different prompts produce different behaviors. Test systematically:

```typescript
async function testPrompt(
  client: Anthropic,
  systemPrompt: string,
  testCases: Array<{ input: string; expectedBehavior: string }>
): Promise<void> {
  console.log('Testing prompt:', systemPrompt.substring(0, 50) + '...');

  for (const testCase of testCases) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: testCase.input }],
    });

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    console.log(`\nInput: ${testCase.input}`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    console.log(`Got: ${text.substring(0, 100)}...`);
  }
}

// Test a "concise" persona
await testPrompt(client, 'You are extremely concise. Never use more than 10 words.', [
  { input: 'What is TypeScript?', expectedBehavior: 'Very short answer' },
  { input: 'Explain recursion', expectedBehavior: 'Brief explanation' },
]);
```

---

## Exercises

### Exercise 1: Create a Persona
Create a "Debugger" persona that:
- Specializes in finding and fixing bugs
- Asks probing questions about error messages
- Suggests systematic debugging approaches
- Has a patient, methodical style

### Exercise 2: Few-Shot Prompting
Create a prompt that formats all responses as bullet points by providing examples.

### Exercise 3: Context Extension
Extend a base persona with additional constraints for "professional mode" that avoids casual language.

<details>
<summary>Exercise 1 Solution</summary>

```typescript
const DEBUGGER_PERSONA: Persona = {
  id: 'debugger',
  name: 'Bug Detective',
  description: 'Specializes in finding and fixing bugs systematically',
  components: {
    role: 'an expert debugger and problem solver',
    style: 'patient, methodical, and inquisitive',
    focus: 'identifying root causes and systematic debugging',
    constraints: [
      'Always ask about error messages and stack traces',
      'Request the relevant code before suggesting fixes',
      'Explain why bugs occur, not just how to fix them',
      'Suggest debugging strategies, not just solutions',
    ],
    guidelines: [
      'Start with "What error message are you seeing?"',
      'Ask "What did you expect to happen vs what actually happened?"',
      'Suggest using console.log or debugger strategically',
      'Consider edge cases that might cause the issue',
    ],
  },
  recommendedTemperature: 0.4,
};
```
</details>

<details>
<summary>Exercise 2 Solution</summary>

```typescript
const bulletPointPrompt = `You are a helpful assistant who ALWAYS formats responses as bullet points.

Here are examples of how you should respond:

User: What are the benefits of TypeScript?
Assistant:
• Static typing catches errors at compile time
• Better IDE support with autocomplete
• Improved code documentation
• Easier refactoring

User: How do I make coffee?
Assistant:
• Boil water to 200°F (93°C)
• Add 2 tablespoons of ground coffee per 6oz water
• Pour water over grounds
• Let steep for 4 minutes
• Strain and serve

Always use this bullet point format, regardless of the question.`;
```
</details>

<details>
<summary>Exercise 3 Solution</summary>

```typescript
function makeProfessional(basePersona: Persona): Persona {
  return {
    ...basePersona,
    id: `${basePersona.id}-professional`,
    name: `${basePersona.name} (Professional)`,
    components: {
      ...basePersona.components,
      style: `${basePersona.components.style}, using formal language`,
      constraints: [
        ...(basePersona.components.constraints || []),
        'Avoid casual language, slang, and contractions',
        'Use professional greetings and sign-offs',
        'Maintain a formal but friendly tone',
      ],
    },
  };
}

const professionalCoder = makeProfessional(CODER_PERSONA);
```
</details>

---

## Quick Reference

### Basic System Prompt
```typescript
await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  system: "You are a helpful assistant.",
  messages: [...],
});
```

### With Temperature
```typescript
await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  system: "...",
  temperature: 0.7,  // 0.0 = focused, 1.0 = creative
  messages: [...],
});
```

### Persona Structure
```typescript
const persona = {
  id: 'unique-id',
  name: 'Display Name',
  description: 'What it does',
  components: {
    role: 'who it is',
    style: 'how it communicates',
    focus: 'what it focuses on',
    constraints: ['what it should not do'],
    guidelines: ['additional instructions'],
  },
  recommendedTemperature: 0.7,
};
```

---

## Key Takeaways

1. **System prompt = character sheet** - It defines who the agent is
2. **Be specific** - Vague instructions produce vague behavior
3. **Use components** - Break prompts into role, style, constraints
4. **Temperature matters** - Low for focus, high for creativity
5. **Test systematically** - Different prompts need different testing
6. **Personas are reusable** - Package prompts + settings together
7. **Context enhances** - Adapt prompts to the situation

---

**Next:** [07-context-management.md](./07-context-management.md) - Managing conversation length *(Coming in Phase 8)*

**Back to:** [learning_summary.md](./learning_summary.md)
