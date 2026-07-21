'use client';

/**
 * ACE LEVEL 4: AUTONOMOUS ReAct AGENT ENGINE
 * Version: 4.0.0 (Reasoning Stage Optimization)
 */

export type AgentStepType = 'thinking' | 'action' | 'observation' | 'error' | 'success';

export interface AgentStep {
  type: AgentStepType;
  content: string;
  stage?: 'INITIALIZATION' | 'ANALYSIS' | 'VALIDATION' | 'STRATEGY';
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export type Tool = (input: any) => Promise<ToolResult>;

export interface AgentPlannerResult {
  thoughts: Array<{ stage: string; detail: string }>;
  proposedAction?: {
    type: 'SEND' | 'SWAP' | 'NAVIGATE' | 'SWITCH_NETWORK' | 'TERMINATE_SESSION' | 'SYSTEM_CHECK' | 'NONE';
    payload: any;
  };
  text: string;
}

export class AgentEngine {
  private tools: Record<string, Tool>;
  private onUpdate: (step: AgentStep) => void;
  private planner: (goal: string, history: AgentStep[]) => Promise<AgentPlannerResult>;

  constructor({
    tools,
    planner,
    onUpdate
  }: {
    tools: Record<string, Tool>;
    planner: (goal: string, history: AgentStep[]) => Promise<AgentPlannerResult>;
    onUpdate: (step: AgentStep) => void;
  }) {
    this.tools = tools;
    this.planner = planner;
    this.onUpdate = onUpdate;
  }

  async run(goal: string) {
    let isDone = false;
    const history: AgentStep[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 3; // Slimmer loop for high-fidelity responses

    while (!isDone && iterations < MAX_ITERATIONS) {
      iterations++;
      
      // 1. REASON (Think)
      const result = await this.planner(goal, history);
      
      // Cinematic processing of reasoning stages
      for (const thought of result.thoughts) {
        const step: AgentStep = { 
          type: 'thinking', 
          content: thought.detail, 
          stage: thought.stage as any 
        };
        this.emit(step);
        history.push(step);
        await new Promise(r => setTimeout(r, 1500)); // Cinematic dwell time
      }

      const action = result.proposedAction;

      // 2. EVALUATE COMPLETION
      if (!action || action.type === 'NONE') {
        isDone = true;
        this.emit({ type: 'success', content: result.text });
        break;
      }

      // 3. PROACTIVE EXECUTION VS UI GATING
      // Financial moves require confirmation sheet
      if (['SEND', 'SWAP'].includes(action.type)) {
        this.emit({ type: 'action', content: `Preparing ${action.type} authorization...`, stage: 'STRATEGY' });
        isDone = true; 
        break;
      }

      // System tools run automatically
      const toolName = action.type.toLowerCase();
      const tool = this.tools[toolName];
      
      if (tool) {
        this.emit({ type: 'action', content: `Executing ${action.type} node...`, stage: 'VALIDATION' });
        try {
          const toolResult = await tool(action.payload);
          if (toolResult.success) {
            history.push({ type: 'observation', content: `Success: ${JSON.stringify(toolResult.data)}` });
          }
        } catch (e) {}
      }

      // Final chat response
      isDone = true;
      this.emit({ type: 'success', content: result.text });
    }
  }

  private emit(step: AgentStep) {
    this.onUpdate(step);
  }
}
