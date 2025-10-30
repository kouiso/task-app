import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const chatRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(
      z.object({
        provider: z.enum(['openai', 'claude', 'gemini', 'llama']),
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
          }),
        ),
        settings: z
          .object({
            model: z.string().optional(),
            temperature: z.number().min(0).max(2).optional(),
            maxTokens: z.number().min(1).max(4000).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { provider, messages, settings } = input;

      switch (provider) {
        case 'openai':
          return await handleOpenAI(messages, settings);
        case 'claude':
          return await handleClaude(messages, settings);
        case 'gemini':
          return await handleGemini(messages, settings);
        case 'llama':
          return await handleLlama(messages, settings);
        default:
          throw new Error('Unknown provider');
      }
    }),
});

async function handleOpenAI(messages: any[], settings: any) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings?.model || 'gpt-3.5-turbo',
        messages,
        temperature: settings?.temperature || 0.7,
        max_tokens: settings?.maxTokens || 1000,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      provider: 'openai',
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error('Failed to get response from OpenAI');
  }
}

async function handleClaude(messages: any[], settings: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings?.model || 'claude-3-sonnet-20240229',
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        max_tokens: settings?.maxTokens || 1000,
        temperature: settings?.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      provider: 'claude',
    };
  } catch (error) {
    console.error('Claude error:', error);
    throw new Error('Failed to get response from Claude');
  }
}

async function handleGemini(messages: any[], settings: any) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: settings?.temperature || 0.7,
            maxOutputTokens: settings?.maxTokens || 1000,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      provider: 'gemini',
    };
  } catch (error) {
    console.error('Gemini error:', error);
    throw new Error('Failed to get response from Gemini');
  }
}

async function handleLlama(messages: any[], _settings: any) {
  return {
    content: `Llama response simulation for: "${messages[messages.length - 1].content}"`,
    provider: 'llama',
  };
}
