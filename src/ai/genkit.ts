
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * INSTITUTIONAL AI GATEWAY
 * Version: 6.2.1 (Updated Key Registry)
 * 
 * Uses the provided Gemini API key for neural handshakes.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyBQg3m8p-iVIy66ocvtl6GB4yf5i3MMb0s'
    })
  ],
  model: 'googleai/gemini-2.5-flash',
});
