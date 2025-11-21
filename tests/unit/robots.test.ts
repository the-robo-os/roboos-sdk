/**
 * Robot type tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RobotSDK } from '../../src';
import { ForkliftRobot, ForkliftCapabilities } from '../../src/robots/ForkliftRobot';
import { Task } from '../../src/marketplace/types';

describe('ForkliftRobot', () => {
  let sdk: RobotSDK;
  let wallet: any;
  let forklift: ForkliftRobot;

  beforeEach(async () => {
    sdk = new RobotSDK({ network: 'testnet' });
    wallet = await sdk.wallet({
      storage: 'memory',
      encrypted: false,
    });

    const capabilities: ForkliftCapabilities = {
      lifting: true,
      transport: true,
      stacking: true,
      maxWeight: 2000,
      maxHeight: 5,
      navigation: true,
    };

    forklift = new ForkliftRobot({
      robotId: 'forklift-001',
      wallet,
      config: sdk.getConfig(),
      capabilities,
    });
  });

  it('should create forklift robot', () => {
    expect(forklift).toBeDefined();
    expect(forklift.getRobotId()).toBe('forklift-001');
  });

  it('should check if can handle task', () => {
    const task: Task = {
      taskId: 'task-1',
      type: 'material_handling',
      title: 'Lift pallet',
      description: 'Lift and transport pallet',
      status: 'pending',
      reward: 100,
      estimatedDuration: 300,
      requirements: ['lifting', 'transport'],
      metadata: {
        maxWeight: 1500,
        maxHeight: 4,
      },
      createdAt: new Date(),
    };

    expect(forklift.canHandleTask(task)).toBe(true);
  });

  it('should reject task exceeding max weight', () => {
    const task: Task = {
      taskId: 'task-1',
      type: 'material_handling',
      title: 'Lift heavy pallet',
      description: 'Lift very heavy pallet',
      status: 'pending',
      reward: 100,
      estimatedDuration: 300,
      requirements: ['lifting'],
      metadata: {
        maxWeight: 3000, // Exceeds maxWeight of 2000
      },
      createdAt: new Date(),
    };

    expect(forklift.canHandleTask(task)).toBe(false);
  });

  it('should get forklift capabilities', () => {
    const caps = forklift.getForkliftCapabilities();
    expect(caps.maxWeight).toBe(2000);
    expect(caps.maxHeight).toBe(5);
    expect(caps.lifting).toBe(true);
  });
});

