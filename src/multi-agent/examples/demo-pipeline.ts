/**
 * Multi-Agent Demo Pipeline
 *
 * A simple example showing how to use the multi-agent patterns.
 * This demonstrates the framework without being tied to any specific domain.
 *
 * BEGINNER NOTE: This is a template you can copy and customize for your own
 * multi-agent projects. It shows:
 * 1. How to define agent roles (with and without tools)
 * 2. How to wire up a Parallel + Chain pipeline
 * 3. How to use callbacks for progress tracking
 *
 * To run: npx tsx src/multi-agent/examples/demo-pipeline.ts
 *
 * Phase 15: Multi-Agent Patterns
 */

import { ParallelAgents } from '../patterns/ParallelAgents.js';
import { AgentChain } from '../patterns/AgentChain.js';
import type { AgentRole, PipelineCallbacks } from '../types.js';
import { createWebSearchTool } from '../../tools/definitions/WebSearchTool.js';
import { createGoogleTrendsTool } from '../../tools/definitions/GoogleTrendsTool.js';
import chalk from 'chalk';

// ============================================
// Agent Role Definitions
// ============================================

/**
 * Example: A research agent WITH tools
 *
 * BEGINNER NOTE: This agent can actively search the web and query
 * Google Trends. The WorkerAgent detects the tools and automatically
 * runs its mini agentic loop.
 */
const webResearcher: AgentRole = {
  id: 'web_researcher',
  name: 'Web Researcher',
  systemPrompt: `You are a research specialist with access to web search and Google Trends tools.

USE YOUR TOOLS to find current, real data about the topic you're given.
- Use web_search to find current information
- Use google_trends to check search interest and related queries

Provide well-organized findings with sources noted.`,
  temperature: 0.7,
  maxTokens: 4096,
  tools: [createWebSearchTool(), createGoogleTrendsTool()],
};

/**
 * Example: An analysis agent WITHOUT tools
 *
 * BEGINNER NOTE: This agent uses Claude's reasoning ability to analyze
 * data from other agents. No tools needed - it works with what it's given.
 */
const analyst: AgentRole = {
  id: 'analyst',
  name: 'Analyst',
  systemPrompt: `You are an analytical specialist who synthesizes research into clear insights.

When given research data, you:
- Identify the most important findings
- Find patterns and connections
- Highlight key opportunities and risks
- Provide prioritized, actionable recommendations

Be concise and data-driven.`,
  temperature: 0.5,
  maxTokens: 4096,
  // No tools - analysis agent works with collected data
};

/**
 * Example: A writer agent WITHOUT tools
 */
const writer: AgentRole = {
  id: 'writer',
  name: 'Report Writer',
  systemPrompt: `You are a professional writer who creates clear, well-structured reports.

When given analyzed research, create a polished document with:
- A brief executive summary (2-3 sentences)
- Key findings organized by theme
- Actionable next steps
- Keep it concise but comprehensive`,
  temperature: 0.3,
  maxTokens: 4096,
  // No tools - writer formats the analyzed data
};

// ============================================
// Demo Pipeline
// ============================================

/**
 * Run a demo multi-agent pipeline
 *
 * Pattern: Parallel research → Analysis (combiner) → Report (chain)
 *
 * This is the same pattern used in production research pipelines,
 * just with fewer agents and a simpler setup.
 */
async function runDemo() {
  console.log(chalk.bold.cyan('\n=== Multi-Agent Demo Pipeline ===\n'));

  // Get topic from command line args or use default
  const topic = process.argv[2] || 'the current state of AI coding assistants';
  console.log(chalk.white(`Topic: ${topic}\n`));

  // Set up progress callbacks
  const callbacks: PipelineCallbacks = {
    onAgentStart: (_id, name) => {
      console.log(chalk.yellow(`  Starting: ${name}`));
    },
    onAgentComplete: (result) => {
      const sec = (result.duration / 1000).toFixed(1);
      if (result.success) {
        console.log(chalk.green(`  Done: ${result.agentId} (${sec}s, ${result.tokensUsed} tokens)`));
      } else {
        console.log(chalk.red(`  Failed: ${result.agentId} - ${result.error}`));
      }
    },
    onPipelineComplete: () => {
      console.log(chalk.cyan('\n  Pipeline complete!'));
    },
  };

  // Phase 1: Parallel research with analysis combiner
  // BEGINNER NOTE: webResearcher runs with tools (agentic loop),
  // analyst runs without tools (single API call) as the combiner
  console.log(chalk.bold('\nPhase 1: Research + Analysis'));
  const parallel = new ParallelAgents([webResearcher], analyst);

  const researchResult = await parallel.run(
    `Research the following topic and provide detailed findings: ${topic}`,
    callbacks
  );

  // Phase 2: Report compilation
  console.log(chalk.bold('\nPhase 2: Report Compilation'));
  const chain = new AgentChain([writer]);

  const reportResult = await chain.run(
    `Create a concise research report from this analysis:\n\n${researchResult.output}`,
    callbacks
  );

  // Display results
  const allResults = [...researchResult.agentResults, ...reportResult.agentResults];
  const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);

  console.log(chalk.bold.cyan('\n=== Results ==='));
  console.log(chalk.white(`Status: ${reportResult.success ? 'SUCCESS' : 'FAILED'}`));
  console.log(chalk.white(`Agents: ${allResults.length}`));
  console.log(chalk.white(`Total tokens: ${totalTokens.toLocaleString()}`));
  console.log(chalk.white(`Duration: ${((researchResult.totalDuration + reportResult.totalDuration) / 1000).toFixed(1)}s`));
  console.log(chalk.bold.cyan('\n=== Report ===\n'));
  console.log(reportResult.output);
}

// Run if executed directly
runDemo().catch(console.error);
