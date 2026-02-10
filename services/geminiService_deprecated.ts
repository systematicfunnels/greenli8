// DEPRECATED: This service is no longer needed
// All AI requests now go directly through api.ts for proper unidirectional data flow
// This file is kept for backward compatibility but should be removed

export const validateIdea = async () => {
  throw new Error('validateIdea is deprecated. Use api.analyzeIdea directly');
};

export const initializeChat = () => {
  throw new Error('initializeChat is deprecated. Use api.chat directly');
};
