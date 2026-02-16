import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Build messages array
          const messages = [
            ...conversationHistory,
            { role: 'user', content: message }
          ];

          // Stream response from Claude
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: messages as Anthropic.MessageParam[],
            stream: true,
          });

          // Send each chunk as it arrives
          for await (const event of response) {
            if (event.type === 'content_block_delta') {
              const text = event.delta.type === 'text_delta' ? event.delta.text : '';
              if (text) {
                const data = JSON.stringify({ type: 'text', content: text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            if (event.type === 'message_stop') {
              const data = JSON.stringify({ type: 'done' });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
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
