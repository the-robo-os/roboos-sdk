/**
 * Robot Reputation Ledger (RRL) Client
 */

import { ReputationScore, ReputationUpdate, ReputationQuery } from './types';
import { ReputationError, ErrorCode } from '../utils/errors';
import { getLogger } from '../utils/logger';
import { EventEmitter } from 'eventemitter3';

export interface ReputationEvents {
  scoreUpdated: (score: ReputationScore) => void;
  error: (error: Error) => void;
}

export interface ReputationConfig {
  endpoint: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cacheTTL?: number; // milliseconds
}

export class ReputationClient extends EventEmitter<ReputationEvents> {
  private config: ReputationConfig;
  private logger = getLogger();
  private cache: Map<string, { score: ReputationScore; timestamp: number }> = new Map();

  constructor(config: ReputationConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTTL: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Get reputation score for a robot
   */
  async getScore(robotId: string, useCache: boolean = true): Promise<ReputationScore> {
    // Check cache
    if (useCache) {
      const cached = this.cache.get(robotId);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < this.config.cacheTTL!) {
          this.logger.debug('Returning cached reputation score', { robotId });
          return cached.score;
        }
      }
    }

    try {
      const score = await this.retryOperation(async () => {
        const response = await fetch(`${this.config.endpoint}/reputation/${robotId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Return default score for new robots
            return {
              robotId,
              score: 50, // Default score
              rank: 0,
              totalTasks: 0,
              completedTasks: 0,
              failedTasks: 0,
              averageCompletionTime: 0,
              lastUpdated: new Date(),
            };
          }
          throw new ReputationError(
            ErrorCode.REPUTATION_QUERY_FAILED,
            `Failed to get reputation: ${response.statusText}`
          );
        }

        const data = await response.json();
        return {
          ...data,
          lastUpdated: new Date(data.lastUpdated),
        };
      });

      // Update cache
      this.cache.set(robotId, {
        score,
        timestamp: Date.now(),
      });

      this.logger.debug('Reputation score retrieved', { robotId, score: score.score });
      return score;
    } catch (error) {
      if (error instanceof ReputationError) {
        throw error;
      }
      throw new ReputationError(
        ErrorCode.REPUTATION_QUERY_FAILED,
        `Failed to get reputation score: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Submit reputation update
   */
  async submitUpdate(update: ReputationUpdate): Promise<void> {
    try {
      await this.retryOperation(async () => {
        const response = await fetch(`${this.config.endpoint}/reputation/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          throw new ReputationError(
            ErrorCode.REPUTATION_UPDATE_FAILED,
            `Failed to submit reputation update: ${response.statusText}`
          );
        }
      });

      // Invalidate cache for this robot
      this.cache.delete(update.robotId);

      // Fetch updated score
      const updatedScore = await this.getScore(update.robotId, false);
      this.emit('scoreUpdated', updatedScore);

      this.logger.debug('Reputation update submitted', {
        robotId: update.robotId,
        taskId: update.taskId,
        success: update.success,
      });
    } catch (error) {
      if (error instanceof ReputationError) {
        throw error;
      }
      throw new ReputationError(
        ErrorCode.REPUTATION_UPDATE_FAILED,
        `Failed to submit reputation update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Query reputation scores
   */
  async queryScores(query: ReputationQuery = {}): Promise<ReputationScore[]> {
    try {
      const params = new URLSearchParams();
      if (query.robotId) params.append('robotId', query.robotId);
      if (query.minScore !== undefined) params.append('minScore', query.minScore.toString());
      if (query.maxScore !== undefined) params.append('maxScore', query.maxScore.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.offset) params.append('offset', query.offset.toString());

      const scores = await this.retryOperation(async () => {
        const response = await fetch(
          `${this.config.endpoint}/reputation?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(this.config.timeout!),
          }
        );

        if (!response.ok) {
          throw new ReputationError(
            ErrorCode.REPUTATION_QUERY_FAILED,
            `Failed to query reputation: ${response.statusText}`
          );
        }

        const data = await response.json();
        return data.scores.map((s: any) => ({
          ...s,
          lastUpdated: new Date(s.lastUpdated),
        }));
      });

      return scores;
    } catch (error) {
      if (error instanceof ReputationError) {
        throw error;
      }
      throw new ReputationError(
        ErrorCode.REPUTATION_QUERY_FAILED,
        `Failed to query reputation scores: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Reputation cache cleared');
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number = this.config.retryAttempts!
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (i < attempts - 1) {
          const delay = this.config.retryDelay! * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.logger.debug('Retrying reputation operation', { attempt: i + 1, delay });
        }
      }
    }

    throw lastError!;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clearCache();
    this.removeAllListeners();
  }
}

