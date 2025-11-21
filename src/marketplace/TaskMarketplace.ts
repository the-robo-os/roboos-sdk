/**
 * Task Marketplace API
 */

import { Task, Bid, BidRequest, TaskQuery, BiddingStrategy, BiddingContext, TaskStatus } from './types';
import { MarketplaceError, ErrorCode } from '../utils/errors';
import { getLogger } from '../utils/logger';
import { EventEmitter } from 'eventemitter3';

export interface MarketplaceEvents {
  taskAvailable: (task: Task) => void;
  taskAssigned: (task: Task) => void;
  bidAccepted: (bid: Bid) => void;
  bidRejected: (bid: Bid) => void;
  taskCompleted: (taskId: string) => void;
  error: (error: Error) => void;
}

export interface MarketplaceConfig {
  endpoint: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  pollingInterval?: number;
}

export class TaskMarketplace extends EventEmitter<MarketplaceEvents> {
  private config: MarketplaceConfig;
  private logger = getLogger();
  private robotId?: string;
  private biddingStrategy?: BiddingStrategy;
  private pollingInterval?: NodeJS.Timeout;
  private submittedBids: Map<string, Bid> = new Map();

  constructor(config: MarketplaceConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      pollingInterval: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Set robot ID
   */
  setRobotId(robotId: string): void {
    this.robotId = robotId;
  }

  /**
   * Set bidding strategy
   */
  setBiddingStrategy(strategy: BiddingStrategy): void {
    this.biddingStrategy = strategy;
    this.logger.info('Bidding strategy set', { strategy: strategy.name });
  }

  /**
   * Query available tasks
   */
  async queryTasks(query: TaskQuery = {}): Promise<Task[]> {
    try {
      const params = new URLSearchParams();
      if (query.type) params.append('type', query.type);
      if (query.status) params.append('status', query.status);
      if (query.minReward !== undefined) params.append('minReward', query.minReward.toString());
      if (query.maxReward !== undefined) params.append('maxReward', query.maxReward.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.offset) params.append('offset', query.offset.toString());
      if (query.location) {
        params.append('location', JSON.stringify(query.location));
      }

      const response = await fetch(
        `${this.config.endpoint}/tasks?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      if (!response.ok) {
        throw new MarketplaceError(
          ErrorCode.NETWORK_ERROR,
          `Failed to query tasks: ${response.statusText}`
        );
      }

      const data = await response.json();
      const tasks: Task[] = data.tasks.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        deadline: t.deadline ? new Date(t.deadline) : undefined,
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
      }));

      return tasks;
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(
        ErrorCode.NETWORK_ERROR,
        `Failed to query tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      const response = await fetch(`${this.config.endpoint}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new MarketplaceError(
            ErrorCode.TASK_NOT_FOUND,
            `Task not found: ${taskId}`
          );
        }
        throw new MarketplaceError(
          ErrorCode.NETWORK_ERROR,
          `Failed to get task: ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      };
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(
        ErrorCode.NETWORK_ERROR,
        `Failed to get task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Submit a bid for a task
   */
  async bid(request: BidRequest): Promise<Bid> {
    if (!this.robotId) {
      throw new MarketplaceError(
        ErrorCode.INVALID_CONFIG,
        'Robot ID not set'
      );
    }

    try {
      const response = await fetch(`${this.config.endpoint}/tasks/${request.taskId}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId: this.robotId,
          bidAmount: request.bidAmount,
          estimatedDuration: request.estimatedDuration,
          encrypted: request.encrypted ?? false,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400) {
          throw new MarketplaceError(
            ErrorCode.INVALID_BID,
            errorData.message || 'Invalid bid'
          );
        }
        if (response.status === 409) {
          throw new MarketplaceError(
            ErrorCode.TASK_ALREADY_ASSIGNED,
            errorData.message || 'Task already assigned'
          );
        }
        throw new MarketplaceError(
          ErrorCode.BID_REJECTED,
          errorData.message || `Bid rejected: ${response.statusText}`
        );
      }

      const data = await response.json();
      const bid: Bid = {
        ...data,
        submittedAt: new Date(data.submittedAt),
      };

      this.submittedBids.set(request.taskId, bid);
      this.emit('bidAccepted', bid);
      this.logger.info('Bid submitted', {
        taskId: request.taskId,
        bidAmount: request.bidAmount,
      });

      return bid;
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(
        ErrorCode.BID_REJECTED,
        `Failed to submit bid: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Auto-bid using configured strategy
   */
  async autoBid(task: Task, context: BiddingContext): Promise<Bid | null> {
    if (!this.biddingStrategy) {
      this.logger.warn('No bidding strategy configured, skipping auto-bid');
      return null;
    }

    if (!this.robotId) {
      throw new MarketplaceError(
        ErrorCode.INVALID_CONFIG,
        'Robot ID not set'
      );
    }

    const bidAmount = this.biddingStrategy.calculateBid(task, context);
    
    if (bidAmount <= 0) {
      this.logger.debug('Bidding strategy returned zero or negative bid, skipping', {
        taskId: task.taskId,
      });
      return null;
    }

    try {
      return await this.bid({
        taskId: task.taskId,
        bidAmount,
        estimatedDuration: task.estimatedDuration,
      });
    } catch (error) {
      this.logger.warn('Auto-bid failed', {
        taskId: task.taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof MarketplaceError && error.code === ErrorCode.BID_REJECTED) {
        this.emit('bidRejected', {
          taskId: task.taskId,
          robotId: this.robotId,
          bidAmount,
          estimatedDuration: task.estimatedDuration,
          submittedAt: new Date(),
        });
      }
      return null;
    }
  }

  /**
   * Accept task assignment
   */
  async acceptTask(taskId: string): Promise<Task> {
    if (!this.robotId) {
      throw new MarketplaceError(
        ErrorCode.INVALID_CONFIG,
        'Robot ID not set'
      );
    }

    try {
      const response = await fetch(
        `${this.config.endpoint}/tasks/${taskId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ robotId: this.robotId }),
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new MarketplaceError(
          ErrorCode.TASK_ALREADY_ASSIGNED,
          errorData.message || `Failed to accept task: ${response.statusText}`
        );
      }

      const data = await response.json();
      const task: Task = {
        ...data,
        createdAt: new Date(data.createdAt),
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      };

      this.emit('taskAssigned', task);
      this.logger.info('Task accepted', { taskId });

      return task;
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(
        ErrorCode.NETWORK_ERROR,
        `Failed to accept task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Reject task assignment
   */
  async rejectTask(taskId: string): Promise<void> {
    if (!this.robotId) {
      throw new MarketplaceError(
        ErrorCode.INVALID_CONFIG,
        'Robot ID not set'
      );
    }

    try {
      const response = await fetch(
        `${this.config.endpoint}/tasks/${taskId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ robotId: this.robotId }),
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      if (!response.ok) {
        throw new MarketplaceError(
          ErrorCode.NETWORK_ERROR,
          `Failed to reject task: ${response.statusText}`
        );
      }

      this.logger.info('Task rejected', { taskId });
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(
        ErrorCode.NETWORK_ERROR,
        `Failed to reject task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    if (!this.robotId) {
      throw new MarketplaceError(
        ErrorCode.INVALID_CONFIG,
        'Robot ID not set'
      );
    }

    try {
      const response = await fetch(
        `${this.config.endpoint}/tasks/${taskId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            robotId: this.robotId,
            status,
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      if (!response.ok) {
        throw new MarketplaceError(
          ErrorCode.NETWORK_ERROR,
          `Failed to update task status: ${response.statusText}`
        );
      }

      if (status === 'completed') {
        this.emit('taskCompleted', taskId);
      }

      this.logger.debug('Task status updated', { taskId, status });
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(
        ErrorCode.NETWORK_ERROR,
        `Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Start polling for new tasks
   */
  startPolling(query: TaskQuery = {}): void {
    if (this.pollingInterval) {
      return;
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const tasks = await this.queryTasks({ ...query, status: 'pending' });
        for (const task of tasks) {
          this.emit('taskAvailable', task);
        }
      } catch (error) {
        this.emit('error', error instanceof Error ? error : new Error('Polling failed'));
        this.logger.error('Task polling failed', error instanceof Error ? error : undefined);
      }
    }, this.config.pollingInterval);
  }

  /**
   * Stop polling for new tasks
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  /**
   * Get submitted bids
   */
  getSubmittedBids(): Bid[] {
    return Array.from(this.submittedBids.values());
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPolling();
    this.removeAllListeners();
  }
}

