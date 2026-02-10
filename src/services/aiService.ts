import env from '../config/env.ts';
import logger from '../utils/logger.ts';
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
 */
const callWithTimeout = async <T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number = 45000): Promise<T> => {
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

  // 1. Try Sarvam (Text only)
  if (!attachment && env.sarvamKey) {
    try {
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
        return parseResponse(data.choices[0].message.content);
      });
    } catch (_e) {
      logger.warn('Sarvam AI failed, trying next...');
    }
  }

  // 2. Try OpenRouter (Failover models)
  if (env.openRouterKey) {
    for (const model of OPENROUTER_MODELS) {
      try {
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
          if (!res.ok) throw new Error(data.error?.message || 'OpenRouter error');
          return parseResponse(data.choices[0].message.content);
        });
      } catch (_e) {
        logger.warn(`OpenRouter model ${model} failed, trying next...`);
      }
    }
  }

  // 3. Fallback to Gemini (Supports Attachments)
  if (env.geminiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: env.geminiKey });

      const parts: any[] = [];
      if (attachment) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data
          }
        });
      }
      parts.push({ text: idea });

      const result = await (ai.models as any).generateContent({
        model: 'gemini-2.0-flash',
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: "application/json",
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
      return parseResponse(result.text || '');
    } catch (_e: any) {
      logger.error('Gemini fallback failed:', _e.message);
    }
  }

  throw new Error('All AI providers failed. Please try again in a few minutes.');
};

/**
 * Chat service for follow-up questions
 */
export const chatWithAI = async (message: string, context: { originalIdea: string; report: any }) => {
  if (!env.geminiKey) throw new Error('AI not configured');
  
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.geminiKey });

  const result = await (ai.models as any).generateContent({
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

  return result.text;
};
