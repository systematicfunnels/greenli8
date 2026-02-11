import env from '../config/env.js';
import { SYSTEM_PROMPTS } from '../../config/prompts.js';
import { GoogleGenAI, Type } from "@google/genai";

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
 * Core analysis service with Gemini and custom API key support
 */
export const analyzeIdea = async (
  idea: string, 
  attachment: { mimeType: string; data: string } | null = null, 
  customApiKeys?: { gemini?: string },
  preferredModel: string = 'auto'
) => {
  const systemPrompt = SYSTEM_PROMPTS.STARTUP_ADVISOR;
  const startTime = Date.now();
  const GLOBAL_TIMEOUT = 8500; // 8.5 seconds total for the analysis

  const getRemainingTimeout = () => Math.max(1000, GLOBAL_TIMEOUT - (Date.now() - startTime));

  // Use custom keys if provided, fallback to environment keys
  const geminiKey = customApiKeys?.gemini || env.geminiKey;

  console.log(`[AI] Starting analysis. Preferred: ${preferredModel}, Keys: Gemini=${!!geminiKey}`);
  
  if (!geminiKey) {
    throw new Error("No Gemini API key provided. Please configure it in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const tryGenerateContent = async (modelName: string, contents: any[], config: any) => {
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
    } catch (e: any) {
      if (e.message?.includes('404') || e.message?.includes('not found')) {
        console.warn(`[AI] Model ${modelName} not found, trying fallback...`);
        return null;
      }
      throw e;
    }
  };

  try {
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

      const config = {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.7,
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
      };

      const contents = [{ role: 'user', parts }];
      
      // Try models in order of preference
      const modelsToTry = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
      let result = null;
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          result = await tryGenerateContent(model, contents, config);
          if (result) {
            console.log(`[AI] Gemini success with model: ${model}`);
            break;
          }
        } catch (e: any) {
          lastError = e;
          console.error(`[AI] Model ${model} failed:`, e.message);
        }
      }

      if (!result) {
        throw lastError || new Error("All Gemini models failed to respond.");
      }

      return parseResponse(result.text || '');
    }, getRemainingTimeout());
  } catch (e: any) {
    console.error(`[AI] Gemini failed:`, e.message);
    throw new Error(`AI analysis failed: ${e.message}`);
  }
};

/**
 * Chat service for follow-up questions
 */
export const chatWithAI = async (message: string, context: { originalIdea: string; report: any }) => {
  if (!env.geminiKey) throw new Error('AI not configured');
  
  const ai = new GoogleGenAI({ apiKey: env.geminiKey });

  const result = await ai.models.generateContent({
    model: 'gemini-1.5-flash-latest',
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
