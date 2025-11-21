/**
 * Hospital Robot Helper
 */

import { BaseRobot, RobotOptions } from './BaseRobot';
import { Task } from '../marketplace/types';
import { getLogger } from '../utils/logger';

export interface HospitalCapabilities {
  medical_transport: boolean;
  sterilization: boolean;
  navigation: boolean;
  temperature_control: boolean;
  urgency_handling: boolean;
  maxPayload: number; // kg
}

export class HospitalRobot extends BaseRobot {
  private capabilities: HospitalCapabilities;
  private logger = getLogger();

  constructor(options: RobotOptions & { capabilities: HospitalCapabilities }) {
    super(options);
    this.capabilities = options.capabilities;
  }

  /**
   * Check if robot can handle medical task
   */
  canHandleTask(task: Task): boolean {
    if (task.type !== 'medical_transport' && task.type !== 'sterilization') {
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

    // Check temperature control requirements
    if (task.type === 'medical_transport') {
      const requiresTempControl = task.metadata?.temperature !== null && task.metadata?.temperature !== undefined;
      if (requiresTempControl && !this.capabilities.temperature_control) {
        this.logger.debug('Task requires temperature control but robot lacks capability');
        return false;
      }
    }

    // Check urgency
    const urgency = task.metadata?.urgency as string | undefined;
    if (urgency === 'critical' && !this.capabilities.urgency_handling) {
      this.logger.debug('Task requires urgency handling but robot lacks capability');
      return false;
    }

    return true;
  }

  /**
   * Execute a medical task
   */
  async executeTask(task: Task): Promise<void> {
    if (!this.canHandleTask(task)) {
      throw new Error(`Cannot handle task ${task.taskId}: requirements not met`);
    }

    this.logger.info('Executing hospital task', {
      taskId: task.taskId,
      type: task.type,
      urgency: task.metadata?.urgency,
    });

    // Simulate task execution
    await this.simulateTaskExecution(task);

    // Complete task
    await this.completeTask(task.taskId, {
      taskType: task.type,
      temperature: task.metadata?.temperature,
      urgency: task.metadata?.urgency,
      location: task.location,
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
   * Get hospital-specific capabilities
   */
  getHospitalCapabilities(): HospitalCapabilities {
    return { ...this.capabilities };
  }
}

