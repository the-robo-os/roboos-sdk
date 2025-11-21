/**
 * AMR (Autonomous Mobile Robot) Helper
 */

import { BaseRobot, RobotOptions } from './BaseRobot';
import { Task, TaskType } from '../marketplace/types';
import { getLogger } from '../utils/logger';

export interface AMRCapabilities {
  navigation: boolean;
  delivery: boolean;
  mapping: boolean;
  maxSpeed: number; // m/s
  maxPayload: number; // kg
  batteryCapacity: number; // percentage
}

export class AMRRobot extends BaseRobot {
  private capabilities: AMRCapabilities;
  private logger = getLogger();

  constructor(options: RobotOptions & { capabilities: AMRCapabilities }) {
    super(options);
    this.capabilities = options.capabilities;
  }

  /**
   * Check if robot can handle navigation/delivery task
   */
  canHandleTask(task: Task): boolean {
    if (task.type !== 'navigation' && task.type !== 'delivery') {
      return false;
    }

    // Check payload requirements
    const requiredPayload = task.metadata?.payload as number | undefined;
    if (requiredPayload && requiredPayload > this.capabilities.maxPayload) {
      this.logger.debug('Task exceeds max payload', {
        required: requiredPayload,
        max: this.capabilities.maxPayload,
      });
      return false;
    }

    // Check battery level
    if (this.capabilities.batteryCapacity < 20) {
      this.logger.debug('Battery too low for task', {
        battery: this.capabilities.batteryCapacity,
      });
      return false;
    }

    // Check required capabilities
    const requiredCaps = task.requirements || [];
    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        this.logger.debug('Missing required capability', { capability: cap });
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate distance to task location
   */
  calculateDistance(task: Task, currentLocation?: { x: number; y: number }): number {
    if (!task.location || !currentLocation) {
      return 0;
    }

    const dx = task.location.x - currentLocation.x;
    const dy = task.location.y - currentLocation.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Execute a navigation/delivery task
   */
  async executeTask(task: Task): Promise<void> {
    if (!this.canHandleTask(task)) {
      throw new Error(`Cannot handle task ${task.taskId}: requirements not met`);
    }

    this.logger.info('Executing AMR task', {
      taskId: task.taskId,
      type: task.type,
    });

    // Simulate task execution
    await this.simulateTaskExecution(task);

    // Complete task
    await this.completeTask(task.taskId, {
      taskType: task.type,
      location: task.location,
      payload: task.metadata?.payload,
    });
  }

  /**
   * Simulate task execution (placeholder)
   */
  private async simulateTaskExecution(task: Task): Promise<void> {
    const duration = Math.min(task.estimatedDuration * 1000, 5000);
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  /**
   * Get AMR-specific capabilities
   */
  getAMRCapabilities(): AMRCapabilities {
    return { ...this.capabilities };
  }
}

