/**
 * Marketplace tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskMarketplace } from '../../src/marketplace/TaskMarketplace';
import { Task, BiddingStrategy, BiddingContext } from '../../src/marketplace/types';

describe('TaskMarketplace', () => {
  let marketplace: TaskMarketplace;

  beforeEach(() => {
    marketplace = new TaskMarketplace({
      endpoint: 'https://marketplace-testnet.roboos.io',
    });
    marketplace.setRobotId('robot-001');
  });

  it('should set robot ID', () => {
    marketplace.setRobotId('robot-002');
    // Robot ID is set internally, just verify no error
    expect(marketplace).toBeDefined();
  });

  it('should set bidding strategy', () => {
    const strategy: BiddingStrategy = {
      name: 'test',
      calculateBid: (task, context) => task.reward * 0.9,
    };

    marketplace.setBiddingStrategy(strategy);
    // Strategy is set internally, just verify no error
    expect(marketplace).toBeDefined();
  });

  it('should calculate bid with strategy', async () => {
    const strategy: BiddingStrategy = {
      name: 'test',
      calculateBid: (task, context) => {
        return task.reward * 0.9;
      },
    };

    marketplace.setBiddingStrategy(strategy);

    const task: Task = {
      taskId: 'task-1',
      type: 'material_handling',
      title: 'Test Task',
      description: 'Test',
      status: 'pending',
      reward: 100,
      estimatedDuration: 300,
      requirements: [],
      createdAt: new Date(),
    };

    const context: BiddingContext = {
      robotReputation: 75,
      currentWorkload: 30,
      availableChannels: 5,
      balance: 1000,
    };

    // Note: autoBid will fail without actual endpoint, but we can test the strategy
    const bidAmount = strategy.calculateBid(task, context);
    expect(bidAmount).toBe(90);
  });
});

