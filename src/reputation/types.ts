/**
 * Reputation System types
 */

export interface ReputationScore {
  robotId: string;
  score: number; // 0-100
  rank: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageCompletionTime: number; // seconds
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

export interface ReputationUpdate {
  robotId: string;
  taskId: string;
  success: boolean;
  completionTime?: number; // seconds
  quality?: number; // 0-1
  timestamp: Date;
}

export interface ReputationQuery {
  robotId?: string;
  minScore?: number;
  maxScore?: number;
  limit?: number;
  offset?: number;
}

