/**
 * Daily Briefing - Flexible Multi-Topic News Briefing with Fact-Checking
 *
 * A production-ready app that exercises the agent foundation end-to-end:
 * - Multi-agent patterns (Parallel + Chain)
 * - WorkerAgent with tool support (agentic loop)
 * - WebSearchTool (Perplexity) for real-time news
 * - Cost-optimized fact-checker for hallucination detection
 * - Per-agent model selection (Haiku for cost optimization)
 * - Flexible topic selection via command-line args
 * - Report generation with source citations
 *
 * The output is a markdown briefing + text + auto-generated MP3 audio.
 * Audio is automatically generated using ElevenLabs API (Carmelo La Rosa voice).
 *
 * BEGINNER NOTE: This is a "test app" that validates the agent foundation
 * works correctly before building larger projects on top of it. It demonstrates
 * how to build flexible, reusable multi-agent applications.
 *
 * COST OPTIMIZATION: The fact-checker uses Haiku (cheaper) and ONLY checks
 * stories without source URLs (0-3 stories instead of 12-13). Perplexity
 * citations are trusted. This saves ~90% of fact-checking tokens while still
 * catching hallucinations.
 *
 * Usage:
 *   npm run briefing                           # Defaults: AI + Longevity
 *   npm run briefing -- --topics="AI,Longevity"
 *   npm run briefing -- --topics="Climate Tech,Web3"
 *   npm run briefing -- --topics="Biohacking,AI Agents"
 *   npm run briefing -- --topics="Quantum Computing,Space Tech"
 *
 * Topic Presets: AI, Longevity, Climate Tech, Web3
 * Custom Topics: Any topic string (generates generic config automatically)
 *
 * Output:
 *   data/briefings/briefing-YYYY-MM-DD.md    (full report with source URLs)
 *   data/briefings/briefing-YYYY-MM-DD.txt   (TTS-ready script)
 *   data/briefings/briefing-YYYY-MM-DD.mp3   (auto-generated audio)
 *
 * Note: Automatic audio requires ELEVENLABS_API_KEY in .env
 */

import { ParallelAgents } from '../multi-agent/patterns/ParallelAgents.js';
import { AgentChain } from '../multi-agent/patterns/AgentChain.js';
import type { AgentRole, PipelineCallbacks } from '../multi-agent/types.js';
import { createWebSearchTool } from '../tools/definitions/WebSearchTool.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env (needed for PERPLEXITY_API_KEY and ANTHROPIC_API_KEY)
import dotenv from 'dotenv';
dotenv.config();

// ============================================
// Configuration
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'briefings');
const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const DATE_STAMP = new Date().toISOString().split('T')[0];

// ============================================
// Topic Configuration
// ============================================

/**
 * Topic configuration for generating research agents
 *
 * BEGINNER NOTE: This makes the briefing flexible - you can research
 * any two topics, not just AI and Longevity. Topics are configured with
 * search queries and focus areas that guide the research agent.
 */
interface TopicConfig {
  id: string;
  name: string;
  searchQueries: string[];
  focusAreas: string[];
  specificGuidance?: string;
}

/**
 * Predefined topic configurations
 * BEGINNER NOTE: These are the "presets" - common topics ready to use.
 * Users can also provide custom topics via command-line args.
 */
const TOPIC_PRESETS: Record<string, TopicConfig> = {
  AI: {
    id: 'ai_news',
    name: 'AI & Technology',
    searchQueries: [
      `"AI news today ${DATE_STAMP}" or "latest AI news this week"`,
      'a specific trending AI topic you find interesting',
      'AI industry or business developments',
    ],
    focusAreas: [
      'Major AI product launches or updates',
      'Notable research breakthroughs',
      'AI industry news (funding, partnerships, policy)',
      'Interesting AI applications or use cases',
    ],
    specificGuidance: 'Be specific - include names, companies, dates.',
  },
  Longevity: {
    id: 'longevity_news',
    name: 'Longevity & Healthspan',
    searchQueries: [
      '"longevity news today" or "anti-aging research news this week"',
      '"longevity supplements research" or "healthspan clinical trials"',
      '"biohacking news" or "longevity biotech funding"',
    ],
    focusAreas: [
      'New research findings on aging, healthspan, or lifespan',
      'Clinical trial results or updates',
      'Longevity biotech company news',
      'Practical healthspan advice backed by new data',
      'Notable conferences, publications, or expert opinions',
    ],
    specificGuidance: 'Be specific - include researchers, institutions, journals.',
  },
  'Climate Tech': {
    id: 'climate_tech',
    name: 'Climate Technology',
    searchQueries: [
      '"climate tech news today" or "clean energy news this week"',
      '"carbon capture" or "renewable energy breakthroughs"',
      '"climate tech funding" or "sustainability innovations"',
    ],
    focusAreas: [
      'Clean energy and renewable technology breakthroughs',
      'Carbon capture and climate solutions',
      'Climate tech startups and funding',
      'Policy and regulation updates',
      'Sustainability innovations',
    ],
    specificGuidance: 'Be specific - include companies, technologies, impact metrics.',
  },
  Web3: {
    id: 'web3_crypto',
    name: 'Web3 & Crypto',
    searchQueries: [
      '"web3 news today" or "crypto news this week"',
      '"DeFi" or "NFT" developments',
      '"blockchain" or "crypto regulation"',
    ],
    focusAreas: [
      'Major protocol launches or updates',
      'DeFi and NFT developments',
      'Regulatory news and policy changes',
      'Institutional adoption',
      'Notable hacks, exploits, or security updates',
    ],
    specificGuidance: 'Be specific - include protocols, chains, dollar amounts.',
  },
};

/**
 * Create a generic topic config for arbitrary custom topics
 *
 * BEGINNER NOTE: If the user provides a topic that's not in the presets
 * (e.g., "Biohacking", "Quantum Computing"), this generates a reasonable
 * default configuration on the fly.
 */
function createGenericTopicConfig(topicName: string): TopicConfig {
  const id = topicName.toLowerCase().replace(/\s+/g, '_');
  return {
    id,
    name: topicName,
    searchQueries: [
      `"${topicName} news today ${DATE_STAMP}" or "latest ${topicName} news this week"`,
      `"${topicName} developments" or "${topicName} breakthroughs"`,
      `"${topicName} industry" or "${topicName} research"`,
    ],
    focusAreas: [
      `Major developments in ${topicName}`,
      'Breaking news and announcements',
      'Industry trends and analysis',
      'Research breakthroughs and innovations',
      'Notable companies, projects, or people',
    ],
    specificGuidance: 'Be specific - include names, companies, metrics, and dates.',
  };
}

/**
 * Get topic config - use preset if available, otherwise generate generic config
 *
 * BEGINNER NOTE: This makes the briefing truly flexible. You can use presets
 * (AI, Longevity, etc.) OR any custom topic (Biohacking, Quantum Computing, etc.)
 */
function getTopicConfig(topicKey: string): TopicConfig {
  // Check if it's a preset (case-insensitive)
  const presetKey = Object.keys(TOPIC_PRESETS).find(
    (key) => key.toLowerCase() === topicKey.toLowerCase()
  );

  if (presetKey) {
    return TOPIC_PRESETS[presetKey];
  }

  // Not a preset - generate generic config
  console.log(chalk.gray(`  ℹ  "${topicKey}" not in presets, using generic topic config`));
  return createGenericTopicConfig(topicKey);
}

/**
 * Factory function to create a topic research agent
 *
 * BEGINNER NOTE: This is the "agent generator" - given a topic config,
 * it creates a properly configured research agent with web search tools.
 */
function createTopicAgent(config: TopicConfig): AgentRole {
  return {
    id: config.id,
    name: `${config.name} Researcher`,
    systemPrompt: `You are a ${config.name} news researcher. Today is ${TODAY}.

YOUR TASK: Find the most important ${config.name} news and developments from today or the past few days.

YOU HAVE A TOOL - USE IT:
Use web_search to search for current ${config.name} news. Make 2-3 searches:
${config.searchQueries.map((q, i) => `${i + 1}. Search ${q}`).join('\n')}

CRITICAL: When the web_search tool returns results, it includes URLs. PRESERVE THESE URLs.

WHAT TO COVER:
${config.focusAreas.map((area) => `- ${area}`).join('\n')}

OUTPUT FORMAT:
For each story, provide:
- Headline (one line)
- 2-3 sentence summary
- Why it matters (one sentence)
- Source URL (if available from your searches)

Format like this:
**Headline Here**
Summary text here...
*Why it matters:* Explanation here.
*Source:* https://example.com/article

Aim for 4-6 top stories. ${config.specificGuidance || ''}
ALWAYS include the source URL when you have it from the search results.`,
    temperature: 0.7,
    maxTokens: 4096,
    tools: [createWebSearchTool()],
  };
}

/**
 * Factory function to create a combiner agent for any two topics
 *
 * BEGINNER NOTE: The combiner organizes research from two topic agents.
 * It's generic - works for any topic pair (AI+Longevity, Climate+Web3, etc.)
 */
function createCombinerAgent(topic1Name: string, topic2Name: string): AgentRole {
  return {
    id: 'combiner',
    name: 'Research Combiner',
    systemPrompt: `You are a news editor who organizes research from multiple reporters.

When given research from a ${topic1Name} reporter and a ${topic2Name} reporter:
- Keep ALL stories from both reporters (don't drop anything)
- PRESERVE all source URLs exactly as provided
- Organize them cleanly under two sections: "## ${topic1Name}" and "## ${topic2Name}"
- Within each section, order stories by importance
- Keep the headline + summary + why-it-matters + source URL format
- If a story appeared in multiple reporters' research, note "CORROBORATED" next to it
- If a story has NO source URL, note "NEEDS_VERIFICATION" next to it (triggers fact-checking)
- Add a brief "Crossover" note at the end if any stories connect both topics

IMPORTANT: Stories with source URLs are already verified by Perplexity and won't need fact-checking.
Pass through the research clearly with ALL source URLs intact. Do NOT add stories the reporters didn't find.`,
    temperature: 0.3,
    maxTokens: 4096,
    // No tools - organizes existing data
  };
}

/**
 * Fact-Checker Agent
 *
 * BEGINNER NOTE: This is the hallucination guard, but OPTIMIZED for cost.
 * - Only checks stories marked "NEEDS_VERIFICATION" (no source URL)
 * - Uses Haiku model (much cheaper than Sonnet)
 * - Does ONE quick search per story
 *
 * Most stories from Perplexity already have citations, so this typically
 * only runs on 0-3 stories instead of all 12-13. Saves 90%+ of tokens.
 */
const factCheckerAgent: AgentRole = {
  id: 'fact_checker',
  name: 'Fact Checker',
  systemPrompt: `You are a fact-checking journalist. Today is ${TODAY}.

YOUR TASK: Verify ONLY stories marked "NEEDS_VERIFICATION" (no source URL).

IMPORTANT OPTIMIZATION:
- Stories WITH source URLs are already verified by Perplexity - SKIP THEM
- Only check stories flagged as "NEEDS_VERIFICATION"
- If you receive a story with a source URL, mark it [VERIFIED] immediately without searching

YOU HAVE A TOOL - USE IT:
For stories that need verification:
1. Extract the headline and key claim
2. Use web_search ONCE to search for that specific headline or fact
3. Quick verdict: Did you find corroboration? Yes/No

VERIFICATION RULES:
- VERIFIED: Found 1+ independent sources confirming the story
- UNVERIFIED: Cannot find any corroboration (possible hallucination)
- PARTIAL: Found related info but not the exact claim

OUTPUT FORMAT (keep it brief):
[VERIFIED/UNVERIFIED/PARTIAL] Story Headline
- Quick note: Found / Not found / Partial match
- Source URL (if found)

Be efficient - one search per story, quick verdict. Goal: catch hallucinations cheaply.`,
  temperature: 0.3,
  maxTokens: 4096,
  model: 'haiku', // Use cheaper model for mechanical verification task
  tools: [createWebSearchTool()],
};

/**
 * Factory function to create a briefing writer agent
 *
 * BEGINNER NOTE: The writer generates the final markdown report and TTS script.
 * It's generic - works for any topic pair.
 */
function createBriefingWriterAgent(topic1Name: string, topic2Name: string): AgentRole {
  return {
    id: 'writer',
    name: 'Briefing Writer',
    systemPrompt: `You are a professional briefing writer. Today is ${TODAY}.

You will receive:
1. Organized news research with source URLs
2. Fact-checker verification results (only for stories without sources)

VERIFICATION LOGIC:
- Stories WITH source URLs from Perplexity = already verified, mark as ✓ *Verified*
- Stories fact-checker approved = ✓ *Verified*
- Stories fact-checker flagged UNVERIFIED = ⚠️ *Verification pending*
- Stories fact-checker flagged PARTIAL = ⚡ *Partially verified*

Your job is to produce TWO outputs separated by the marker "===TTS_SCRIPT_START===":

OUTPUT 1 - FULL MARKDOWN REPORT:
Write a clean, professional daily briefing in markdown with:
- Title: "Daily Briefing - [today's date]"
- A 2-sentence executive summary of the day's biggest stories
- "## ${topic1Name}" section with each story as a subsection
- "## ${topic2Name}" section with each story as a subsection
- "## Quick Takes" - one-line summaries of every story for scanning
- "## Verification Status" - note any UNVERIFIED or PARTIAL stories

For each story:
- Include clickable markdown links to source URLs: [Source Name](https://url)
- Add verification marker based on logic above

OUTPUT 2 - TTS SCRIPT (after the ===TTS_SCRIPT_START=== marker):
Write a natural-sounding audio script that would take about 3-4 minutes to read aloud:
- Start with: "Good morning. Here's your daily briefing for [today's date]."
- Cover the top 3-4 most important VERIFIED stories across both topics
- SKIP any UNVERIFIED stories from the audio (they're in the markdown for review)
- Use short, conversational sentences (this will be read by text-to-speech)
- Avoid bullet points, markdown, URLs, or special characters
- Use natural transitions between topics naturally
- End with: "That's your briefing for today. Have a great day."

IMPORTANT: The TTS script should sound like a real podcast host reading verified news.`,
    temperature: 0.4,
    maxTokens: 6144,
    // No tools - writing only
  };
}

// ============================================
// Pipeline Execution
// ============================================

async function runDailyBriefing(): Promise<void> {
  // ---- Parse Command-Line Arguments ----
  // BEGINNER NOTE: Two ways to specify topics:
  // 1. Positional: npm run briefing -- Biohacking "AI Agents"
  // 2. Flag style: npm run briefing -- --topics=Biohacking,AI Agents
  const args = process.argv.slice(2);

  let topic1Key = 'AI';
  let topic2Key = 'Longevity';

  // Try positional arguments first (simpler for Windows)
  // Usage: npm run briefing -- Biohacking "AI Agents"
  if (args.length >= 2 && !args[0].startsWith('--')) {
    topic1Key = args[0].trim();
    topic2Key = args[1].trim();
  }
  // Fall back to --topics= flag
  // Usage: npm run briefing -- --topics=AI,Longevity
  else if (args.length > 0) {
    const topicsArg = args.find((arg) => arg.startsWith('--topics='));
    if (topicsArg) {
      const topicsStr = topicsArg.split('=')[1].replace(/['"]/g, '');
      const topics = topicsStr.split(',').map((s) => s.trim());
      topic1Key = topics[0] || 'AI';
      topic2Key = topics[1] || 'Longevity';
    }
  }

  // Get topic configs (use presets or generate generic configs)
  const topic1Config = getTopicConfig(topic1Key);
  const topic2Config = getTopicConfig(topic2Key);

  // Generate agents dynamically based on topics
  const topic1Agent = createTopicAgent(topic1Config);
  const topic2Agent = createTopicAgent(topic2Config);
  const combinerAgent = createCombinerAgent(topic1Config.name, topic2Config.name);
  const writerAgent = createBriefingWriterAgent(topic1Config.name, topic2Config.name);

  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║    Daily Briefing w/ Fact-Checking    ║'));
  console.log(chalk.bold.cyan(`║    ${topic1Config.name} + ${topic2Config.name}`.padEnd(42) + '║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════╝\n'));
  console.log(chalk.gray(`Date: ${TODAY}\n`));

  const startTime = Date.now();

  // Progress callbacks
  const callbacks: PipelineCallbacks = {
    onAgentStart: (_id, name) => {
      console.log(chalk.yellow(`  ⏳ ${name} starting...`));
    },
    onAgentComplete: (result) => {
      const sec = (result.duration / 1000).toFixed(1);
      if (result.success) {
        console.log(chalk.green(`  ✓  ${result.agentId} done (${sec}s, ${result.tokensUsed} tokens)`));
      } else {
        console.log(chalk.red(`  ✗  ${result.agentId} failed: ${result.error}`));
      }
    },
  };

  // ---- Phase 1: Parallel Research ----
  console.log(chalk.bold('\n📡 Phase 1: Research (parallel)\n'));

  const parallel = new ParallelAgents(
    [topic1Agent, topic2Agent],
    combinerAgent
  );

  const researchResult = await parallel.run(
    `Find today's most important news. Use your web_search tool to search for current stories. Preserve all source URLs. Today is ${TODAY}.`,
    callbacks
  );

  if (!researchResult.success) {
    console.log(chalk.red('\n⚠  Research phase had issues, continuing with available data...\n'));
  }

  // ---- Phase 2: Fact-Checking ----
  console.log(chalk.bold('\n🔍 Phase 2: Fact-checking\n'));

  const factCheckChain = new AgentChain([factCheckerAgent]);

  const factCheckResult = await factCheckChain.run(
    `Verify each of these news stories independently. For each headline, search to confirm it's real:\n\n${researchResult.output}`,
    callbacks
  );

  // ---- Phase 3: Briefing Writing ----
  console.log(chalk.bold('\n📝 Phase 3: Writing briefing\n'));

  const writerChain = new AgentChain([writerAgent]);

  const writeResult = await writerChain.run(
    `Write the daily briefing from this research and verification results:\n\nRESEARCH:\n${researchResult.output}\n\nFACT-CHECK RESULTS:\n${factCheckResult.output}`,
    callbacks
  );

  // ---- Process Output ----
  const totalDuration = Date.now() - startTime;
  const allResults = [
    ...researchResult.agentResults,
    ...factCheckResult.agentResults,
    ...writeResult.agentResults,
  ];
  const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);

  // Split the output into markdown report and TTS script
  const fullOutput = writeResult.output;
  const ttsSplit = fullOutput.split('===TTS_SCRIPT_START===');
  const markdownReport = ttsSplit[0].trim();
  const ttsScript = ttsSplit.length > 1 ? ttsSplit[1].trim() : null;

  // ---- Save Files ----
  console.log(chalk.bold('\n💾 Saving output\n'));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save markdown report
  const mdPath = path.join(OUTPUT_DIR, `briefing-${DATE_STAMP}.md`);
  fs.writeFileSync(mdPath, markdownReport, 'utf-8');
  console.log(chalk.green(`  ✓ Report: ${mdPath}`));

  // Save TTS script
  let ttsPath: string | null = null;
  if (ttsScript) {
    ttsPath = path.join(OUTPUT_DIR, `briefing-${DATE_STAMP}.txt`);
    fs.writeFileSync(ttsPath, ttsScript, 'utf-8');
    console.log(chalk.green(`  ✓ TTS Script: ${ttsPath}`));
  } else {
    console.log(chalk.yellow('  ⚠ No TTS script found (writer may not have included the marker)'));
  }

  // ---- Summary ----
  console.log(chalk.bold.cyan('\n═══ Summary ═══'));
  console.log(chalk.white(`  Status:    ${writeResult.success ? 'SUCCESS' : 'FAILED'}`));
  console.log(chalk.white(`  Agents:    ${allResults.length} (${allResults.filter(r => r.success).length} succeeded)`));
  console.log(chalk.white(`  Tokens:    ${totalTokens.toLocaleString()}`));
  console.log(chalk.white(`  Duration:  ${(totalDuration / 1000).toFixed(1)}s`));
  console.log(chalk.white(`  Output:    ${OUTPUT_DIR}`));

  // Show per-agent breakdown
  console.log(chalk.bold('\n  Agent Breakdown:'));
  for (const r of allResults) {
    const status = r.success ? chalk.green('✓') : chalk.red('✗');
    const sec = (r.duration / 1000).toFixed(1);
    console.log(chalk.gray(`    ${status} ${r.agentId}: ${sec}s, ${r.tokensUsed} tokens`));
  }

  // ---- Phase 4: Convert to Audio (Automatic) ----
  if (ttsScript && ttsPath) {
    console.log(chalk.bold('\n🎙️  Phase 4: Converting to audio\n'));

    try {
      const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
      const VOICE_ID = 'pWHqWjkaSNybDOvgMt58'; // Carmelo La Rosa

      if (!ELEVENLABS_API_KEY) {
        console.log(chalk.yellow('  ⚠ ELEVENLABS_API_KEY not found in .env'));
        console.log(chalk.gray(`  Add your API key to .env to enable automatic audio\n`));
      } else {
        console.log(chalk.gray(`  Converting TTS script to audio...`));

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: ttsScript,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: 1.0,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioPath = path.join(OUTPUT_DIR, `briefing-${DATE_STAMP}.mp3`);
        fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

        console.log(chalk.green(`  ✓ Audio: ${audioPath}`));
        console.log(chalk.gray(`  Voice: Carmelo La Rosa`));
        console.log(chalk.gray(`  Duration: ~${Math.ceil(ttsScript.length / 200)} minutes\n`));
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ Audio conversion failed: ${error instanceof Error ? error.message : String(error)}`));
      console.log(chalk.gray(`  TTS script saved at: ${ttsPath}\n`));
    }
  }
}

// ---- Run ----
runDailyBriefing().catch((error) => {
  console.error(chalk.red('\n❌ Daily briefing failed:'), error.message || error);
  process.exit(1);
});
