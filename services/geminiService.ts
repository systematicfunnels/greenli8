import { ValidationReport } from "../types";
import { api } from "./api";

// This file formerly called Google API directly.
// Now it forwards requests to our secure backend (api.ts).

export const validateIdea = async (idea: string, attachment?: { mimeType: string; data: string }, _email?: string): Promise<ValidationReport> => {
  return await api.analyzeIdea(idea, attachment);
};

export const initializeChat = (report: ValidationReport, originalIdea: string) => {
  // We return a simple object that mimics the GoogleGenAI chat interface
  // but calls our backend API instead.
  
  return {
      sendMessageStream: async ({ message }: { message: string }) => {
          // Note: Full streaming isn't implemented in the backend example for simplicity.
          // We will simulate a stream with a single response chunk.
          // For production, you'd use Server-Sent Events (SSE) or WebSockets.
          
          const responseText = await api.chat(message, { 
              report, 
              originalIdea 
          });

          // Mimic the stream generator
          async function* generator() {
              yield { text: responseText };
          }
          
          return generator();
      }
  };
};