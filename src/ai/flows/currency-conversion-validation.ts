 'use server';

/**
 * INSTITUTIONAL TRADE GUARDIAN (SENTINEL V6 - SWAP ENGINE)
 * Version: 25.1.0 (Liquidity & Impact Analysis)
 * * Logic Node:
 * 1. OVERHEAD AUDIT: Calculates the % of trade lost to gas.
 * 2. SLIPPAGE MONITOR: Evaluates Price Impact vs. Industry Standards.
 * 3. EXECUTION ADVICE: Proposes timing or route optimizations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SwapAnalysisInputSchema = z.object({
  fromCurrency: z.string(),
  toCurrency: z.string(),
  fromAmount: z.number(),
  toAmount: z.number(),
  priceImpact: z.number(),
  gasFeeUsd: z.number(),
  chainName: z.string(),
  marketPriceUsd: z.number().optional().describe('Current market price of the base asset'),
});

export type SwapAnalysisInput = z.infer<typeof SwapAnalysisInputSchema>;

const SwapAnalysisOutputSchema = z.object({
  mode: z.literal('analysis'),
  analysis: z.string(),
  metrics: z.object({
    feeOverheadPercent: z.number().describe('How much of the swap is lost to gas'),
    slippageSeverity: z.enum(['negligible', 'moderate', 'critical']),
    efficiencyScore: z.number().min(0).max(100),
  }),
  advice: z.string(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  thinking: z.string().optional(),
  // For the UI to show a "Would you like to proceed?" button
  handshakeRequired: z.boolean(),
});

export type SwapAnalysisOutput = z.infer<typeof SwapAnalysisOutputSchema>;

export const swapAnalysisPrompt = ai.definePrompt({
  name: 'swapAnalysisPrompt',
  input: { schema: SwapAnalysisInputSchema },
  output: { schema: SwapAnalysisOutputSchema },
  system: `You are the Sentinel V6 Trade Guardian. Your goal is to protect the user from "Toxic Order Flow" and high overhead.

# ANALYTIC PROTOCOL:
1. OVERHEAD CALCULATION: If gas fees represent > 3% of the trade value, flag as HIGH risk.
2. PRICE IMPACT: 
   - < 0.5%: Negligible
   - 0.5% - 2%: Moderate (Warning)
   - > 2%: Critical (High Risk of Front-running/MEV)
3. EFFICIENCY SCORE: Start at 100 and deduct points for high gas and high price impact.

# COMMUNICATION STYLE:
- Use professional, institutional terminology (e.g., "Slippage tolerance", "MEV protection", "Liquidity depth").
- Be concise. The user is about to click "Swap".`,
  prompt: `
  Analyze this swap on {{{chainName}}}:
  - Input: {{{fromAmount}}} {{{fromCurrency}}}
  - Output: {{{toAmount}}} {{{toCurrency}}}
  - Impact: {{{priceImpact}}}%
  - Gas: \${{{gasFeeUsd}}}
  
  Provide a structural breakdown and risk assessment.`,
});

export async function analyzeSwapConditions(input: SwapAnalysisInput): Promise<SwapAnalysisOutput> {
  try {
    const { output } = await swapAnalysisPrompt(input);
    
    // Add logic to ensure the "handshake" is always prompted for high risk
    const isHighRisk = output?.riskLevel === 'HIGH' || input.priceImpact > 2.0;
    
    return {
      ...output!,
      mode: 'analysis',
      handshakeRequired: true, // Always ask for confirmation in a swap flow
      advice: isHighRisk 
        ? `⚠️ ${output?.advice || 'Conditions are sub-optimal.'}` 
        : `✅ ${output?.advice || 'Optimal trade conditions.'}`
    };
  } catch (error) {
    console.error("[TRADE_GUARDIAN_ERROR]", error);
    return {
      mode: 'analysis',
      analysis: "Unable to complete deep trade analysis.",
      metrics: { feeOverheadPercent: 0, slippageSeverity: 'negligible', efficiencyScore: 0 },
      advice: "Proceed with caution. Market data handshake failed.",
      riskLevel: 'MEDIUM',
      handshakeRequired: true
    };
  }
}