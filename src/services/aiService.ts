import env from '../config/env.js';
import logger from '../utils/logger.js';
import { SYSTEM_PROMPTS } from '../../config/prompts.js';
import { Type } from "@google/genai";

const OPENROUTER_MODELS = [
  "openrouter/auto",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

/**
 * Utility to wrap a promise with a timeout using AbortController
 * Vercel Hobby plan has a 10s limit, so we set timeout to 9s to fail gracefully.
 */
const callWithTimeout = async <T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number = 9000): Promise<T> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fn(controller.signal);
    clearTimeout(id);
    return result;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

/**
 * Parses AI response text for JSON
 */
const parseResponse = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");
    return JSON.parse(jsonMatch[0]);
  }
};

/**
 * Core analysis service with multi-provider failover
 */
export const analyzeIdea = async (idea: string, attachment: { mimeType: string; data: string } | null = null) => {
  const systemPrompt = SYSTEM_PROMPTS.STARTUP_ADVISOR;
  const startTime = Date.now();
  const GLOBAL_TIMEOUT = 8500; // 8.5 seconds total for all providers

  const getRemainingTimeout = () => Math.max(1000, GLOBAL_TIMEOUT - (Date.now() - startTime));

  console.log(`[AI] Starting analysis. Keys present: Gemini=${!!env.geminiKey}, OpenRouter=${!!env.openRouterKey}, Sarvam=${!!env.sarvamKey}`);
  console.log(`[AI] Input length: ${idea.length} chars, Attachment: ${attachment ? 'Yes' : 'No'}`);

  // 1. Try Gemini (Primary - Supports Attachments)
  if (env.geminiKey) {
    try {
      console.log('[AI] Attempting Gemini...');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: env.geminiKey });

      return await callWithTimeout(async (_signal) => {
        const parts: any[] = [];
        if (attachment) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data
            }
          });
        }
        parts.push({ text: `Analyze this startup idea: ${idea}` });

        const result = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.7, // Add a bit of creativity for better analysis
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summaryVerdict: { type: Type.STRING, enum: ["Promising", "Risky", "Needs Refinement"] },
                oneLineTakeaway: { type: Type.STRING },
                marketReality: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                competitors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      differentiation: { type: Type.STRING }
                    }
                  }
                },
                viabilityScore: { type: Type.NUMBER },
                nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        });
        
        console.log('[AI] Gemini success');
        return parseResponse(result.text || '');
      }, getRemainingTimeout());
    } catch (_e: any) {
      console.error('[AI] Gemini failed:', _e.message);
      logger.warn(`Gemini primary failed: ${_e.message}`);
    }
  }

  // 2. Try OpenRouter (Reliability Fallback)
  if (env.openRouterKey) {
    console.log('[AI] Attempting OpenRouter...');
    for (const model of OPENROUTER_MODELS) {
      if (Date.now() - startTime > GLOBAL_TIMEOUT - 2000) {
        console.warn('[AI] OpenRouter skipped - nearly out of time');
        break;
      }

      try {
        console.log(`[AI] Trying OpenRouter model: ${model}`);
        return await callWithTimeout(async (signal) => {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://greenli8.com',
              'X-Title': 'Greenli8 AI'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: idea }
              ]
            }),
            signal
          });
          const data = await res.json() as any;
          if (!res.ok) throw new Error(data.error?.message || `OpenRouter error ${res.status}`);
          console.log(`[AI] OpenRouter model ${model} success`);
          return parseResponse(data.choices[0].message.content);
        }, getRemainingTimeout());
      } catch (_e: any) {
        console.error(`[AI] OpenRouter model ${model} failed:`, _e.message);
        logger.warn(`OpenRouter model ${model} failed: ${_e.message || 'Unknown error'}`);
      }
    }
  }

  // 3. Try Sarvam (Final Fallback - Text only)
  if (!attachment && env.sarvamKey) {
    try {
      console.log('[AI] Attempting Sarvam...');
      return await callWithTimeout(async (signal) => {
        const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'api-subscription-key': env.sarvamKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sarvam-m',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: idea }
            ]
          }),
          signal
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(`Sarvam error ${res.status}`);
        console.log('[AI] Sarvam success');
        return parseResponse(data.choices[0].message.content);
      }, getRemainingTimeout());
    } catch (_e: any) {
      console.error('[AI] Sarvam failed:', _e.message);
      logger.warn(`Sarvam AI failed: ${_e.message || 'Unknown error'}`);
    }
  }

  throw new Error('All AI providers failed. Please check your API keys configuration: Gemini (API_KEY), Sarvam (SARVAM_API_KEY), or OpenRouter (OPENROUTER_API_KEY).');
};

/**
 * Chat service for follow-up questions
 */
export const chatWithAI = async (message: string, context: { originalIdea: string; report: any }) => {
  if (!env.geminiKey) throw new Error('AI not configured');
  
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.geminiKey });

  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: "user",
        parts: [{ text: `You previously analyzed this idea: "${context.originalIdea}". Here is the report you generated: ${JSON.stringify(context.report)}. Keep this context in mind.` }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I have the context of the idea and the previous analysis. How can I help you further?" }],
      },
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
  });

  return result.text || '';
};
