/**
 * Bidding Example
 * 
 * Demonstrates task bidding with custom bidding strategies
 */

import { RobotSDK, ForkliftRobot, BiddingStrategy, BiddingContext, Task } from '../src';

async function main() {
  // Initialize SDK
  const sdk = new RobotSDK({
    network: 'testnet',
    marketplaceEndpoint: 'https://marketplace-testnet.roboos.io',
  });

  // Create wallet and robot
  const wallet = await sdk.wallet({
    storage: 'file',
    path: './bidding-robot-wallet.json',
  });

  const forklift = new ForkliftRobot({
    robotId: 'bidding-forklift-001',
    wallet,
    config: sdk.getConfig(),
    capabilities: {
      lifting: true,
      transport: true,
      stacking: true,
      maxWeight: 1500,
      maxHeight: 4,
      navigation: true,
    },
  });

  await forklift.initialize();
  await forklift.connect();

  // Define custom bidding strategy
  const aggressiveBiddingStrategy: BiddingStrategy = {
    name: 'aggressive',
    calculateBid: (task: Task, context: BiddingContext) => {
      // Bid 10% below task reward for competitive advantage
      const baseBid = task.reward * 0.9;
      
      // Adjust based on reputation (higher reputation = can bid higher)
      const reputationMultiplier = context.robotReputation / 100;
      
      // Adjust based on workload (less workload = more aggressive)
      const workloadMultiplier = 1 - (context.currentWorkload / 100);
      
      // Adjust based on distance (closer = more aggressive)
      const distanceMultiplier = context.distanceToTask 
        ? Math.max(0.8, 1 - (context.distanceToTask / 1000))
        : 1;

      return baseBid * reputationMultiplier * workloadMultiplier * distanceMultiplier;
    },
  };

  const conservativeBiddingStrategy: BiddingStrategy = {
    name: 'conservative',
    calculateBid: (task: Task, context: BiddingContext) => {
      // Only bid on high-value tasks
      if (task.reward < 100) {
        return 0; // Skip low-value tasks
      }

      // Bid at task reward (no discount)
      return task.reward;
    },
  };

  // Set bidding strategy
  const marketplace = forklift.getMarketplace();
  if (marketplace) {
    marketplace.setBiddingStrategy(aggressiveBiddingStrategy);

    // Query tasks
    const tasks = await marketplace.queryTasks({
      type: 'material_handling',
      status: 'pending',
      minReward: 50,
    });

    console.log(`Found ${tasks.length} tasks to bid on`);

    // Get reputation for bidding context
    const reputation = forklift.getReputation();
    let reputationScore = 50; // Default
    if (reputation) {
      const score = await reputation.getScore(forklift.getRobotId());
      reputationScore = score.score;
    }

    // Auto-bid on tasks
    for (const task of tasks) {
      if (!forklift.canHandleTask(task)) {
        continue;
      }

      const context: BiddingContext = {
        robotReputation: reputationScore,
        currentWorkload: 30, // Example: 30% workload
        distanceToTask: task.location ? 100 : undefined, // Example: 100m away
        availableChannels: 5,
        balance: 1000, // ROS tokens
      };

      const bid = await marketplace.autoBid(task, context);
      if (bid) {
        console.log(`Bid submitted for task ${task.taskId}:`, {
          bidAmount: bid.bidAmount,
          estimatedDuration: bid.estimatedDuration,
        });
      }
    }

    // Listen for bid acceptance
    marketplace.on('bidAccepted', (bid) => {
      console.log('Bid accepted!', bid);
    });

    marketplace.on('bidRejected', (bid) => {
      console.log('Bid rejected:', bid);
    });

    // Start polling for new tasks
    marketplace.startPolling({
      type: 'material_handling',
      status: 'pending',
    });
  }

  // Keep running for a bit
  await new Promise((resolve) => setTimeout(resolve, 30000));

  await forklift.disconnect();
}

main().catch(console.error);

