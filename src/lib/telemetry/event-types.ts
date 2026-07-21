/**
 * STANDARD TELEMETRY EVENT TYPES
 * Used to synchronize events across Providers, Orchestrator, Interceptors, and the logs UI.
 */
export enum TelemetryEventType {
  RPC_CALL = 'rpc_call',
  RPC_RESPONSE = 'rpc_response',
  RPC_DUPLICATE_STORM = 'rpc_duplicate_storm',
  
  RENDER_METRICS = 'render_metrics',
  RENDER_BURST = 'render_burst',
  
  REFRESH_TRIGGER = 'refresh_trigger',
  REFRESH_QUEUED = 'refresh_queued',
  REFRESH_BATCH_START = 'refresh_batch_start',
  REFRESH_BATCH_COMPLETED = 'refresh_batch_completed',
  
  WALLET_PROVIDER_LIFECYCLE = 'wallet_provider_lifecycle',
  STABLE_CONTEXT_WARNING = 'stable_context_warning',
  
  REALTIME_MUTATION = 'realtime_mutation',
  ORCHESTRATOR_QUEUE = 'orchestrator_queue'
}

export interface RpcCallEvent {
  id: string;
  method: string;
  url: string;
  body: string;
  timestamp: number;
  batchSize: number;
}

export interface RpcResponseEvent {
  id: string;
  method: string;
  timestamp: number;
  duration: number;
  status: number;
  isDuplicate: boolean;
  sizeBytes: number;
}

export interface RenderMetricsEvent {
  componentName: string;
  renderCount: number;
  timestamp: number;
  timeSinceLastMs: number;
  changedDeps: string[];
  diffDetails?: Record<string, { oldVal: string; newVal: string }>;
}

export interface RefreshTriggerEvent {
  id: string;
  chainId: number;
  origin: string; // 'view_switch' | 'background_timer' | 'transaction_event' | 'watcher'
  priority: 'high' | 'low';
  tokens: string[]; // empty array means all tokens on chain
  timestamp: number;
}
