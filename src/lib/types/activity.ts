/**
 * CANONICAL ACTIVITY MODEL
 * Version: 1.0.0
 * 
 * Defines the strict institutional structure for all blockchain and system events.
 */

export type ActivityStatus = 
  | 'pending' 
  | 'confirming' 
  | 'confirmed' 
  | 'failed' 
  | 'replaced' 
  | 'completed';

export type ActivityPriority = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'critical';

export interface ActivityEvent {
  eventId: string;
  eventType: string; // SEND, RECEIVE, SWAP, BRIDGE, APPROVE, SECURITY_ALERT, etc.
  
  txHash?: string;
  chainId?: number;
  
  title: string;
  subtitle?: string;
  
  amount?: string;
  symbol?: string;
  
  status: ActivityStatus;
  priority: ActivityPriority;
  
  metadata?: Record<string, any>;
  
  createdAt: string | number;
  updatedAt?: string | number;
}
