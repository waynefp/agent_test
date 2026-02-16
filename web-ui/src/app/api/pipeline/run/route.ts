import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// BEGINNER NOTE: This API runs the Daily Briefing CLI script
// For Vercel deployment, this will be replaced with a separate backend API

export async function POST(req: NextRequest) {
  try {
    const { topics } = await req.json();

    if (!topics) {
      return new Response('Topics are required', { status: 400 });
    }

    // Split topics
    const topicList = topics.split(',').map((t: string) => t.trim());
    if (topicList.length < 2) {
      topicList.push('General News');
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_start',
            agentId: 'pipeline',
            agentName: 'Daily Briefing Pipeline'
          })}\n\n`));

          // Run the Daily Briefing script
          const projectRoot = path.join(process.cwd(), '..');
          const command = `cd "${projectRoot}" && npm run briefing -- --topics="${topicList.join(',')}"`;

          console.log('=== RUNNING DAILY BRIEFING ===');
          console.log('Project root:', projectRoot);
          console.log('Command:', command);
          console.log('Topics:', topicList);

          const startTime = Date.now();

          let stdout = '';
          let stderr = '';
          let execError = null;

          try {
            const result = await execAsync(command, {
              maxBuffer: 1024 * 1024 * 10, // 10MB buffer
              timeout: 180000 // 3 minute timeout (allows time for TTS generation)
            });
            stdout = result.stdout;
            stderr = result.stderr;
          } catch (error) {
            execError = error;
            console.error('=== EXEC ERROR ===');
            console.error('Error:', error);
            if (error instanceof Error) {
              console.error('Message:', error.message);
              console.error('Stack:', error.stack);
            }
          }

          const duration = Date.now() - startTime;

          // Log output
          console.log('=== EXECUTION COMPLETE ===');
          console.log('Duration:', duration, 'ms');
          if (stdout) console.log('stdout:', stdout);
          if (stderr) console.log('stderr:', stderr);
          if (execError) console.log('Had error:', execError);

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_complete',
            agentId: 'pipeline',
            output: 'Daily briefing generated successfully',
            tokensUsed: 0, // We don't have token count from CLI
            duration
          })}\n\n`));

          // Send final report event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'final_report',
            markdownReport: 'Report saved to data/briefings/ directory. Check the file system for the full report.',
            ttsScript: null,
            markdownPath: `data/briefings/briefing-${new Date().toISOString().split('T')[0]}.md`,
            ttsPath: null,
            audioPath: null,
            totalTokens: 0,
            duration
          })}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'pipeline_complete'
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Pipeline error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            content: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
