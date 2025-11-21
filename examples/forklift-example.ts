/**
 * Forklift Robot Example
 * 
 * Demonstrates forklift-specific capabilities and task handling
 */

import { RobotSDK, ForkliftRobot, ForkliftCapabilities } from '../src';

async function main() {
  // Initialize SDK
  const sdk = new RobotSDK({
    network: 'testnet',
    fprEndpoint: 'https://fpr-testnet.roboos.io',
    marketplaceEndpoint: 'https://marketplace-testnet.roboos.io',
  });

  // Create wallet
  const wallet = await sdk.wallet({
    storage: 'file',
    path: './forklift-wallet.json',
    encrypted: true,
  });

  // Define forklift capabilities
  const capabilities: ForkliftCapabilities = {
    lifting: true,
    transport: true,
    stacking: true,
    maxWeight: 2000, // kg
    maxHeight: 5, // meters
    navigation: true,
  };

  // Create forklift robot
  const forklift = new ForkliftRobot({
    robotId: 'forklift-001',
    wallet,
    config: sdk.getConfig(),
    capabilities,
  });

  // Initialize and connect
  await forklift.initialize();
  await forklift.connect();

  console.log('Forklift robot connected');

  // Query material handling tasks
  const marketplace = forklift.getMarketplace();
  if (marketplace) {
    const tasks = await marketplace.queryTasks({
      type: 'material_handling',
      status: 'pending',
    });

    console.log(`Found ${tasks.length} material handling tasks`);

    for (const task of tasks) {
      // Check if forklift can handle the task
      if (forklift.canHandleTask(task)) {
        console.log(`Forklift can handle task: ${task.taskId}`);

        // Accept and execute task
        await marketplace.acceptTask(task.taskId);
        await marketplace.updateTaskStatus(task.taskId, 'in_progress');

        await forklift.executeTask(task);

        console.log(`Task ${task.taskId} completed`);
      } else {
        console.log(`Forklift cannot handle task: ${task.taskId}`);
      }
    }
  }

  // Check reputation
  const reputation = forklift.getReputation();
  if (reputation) {
    const score = await reputation.getScore(forklift.getRobotId());
    console.log('Forklift reputation:', {
      score: score.score,
      completedTasks: score.completedTasks,
      totalTasks: score.totalTasks,
    });
  }

  await forklift.disconnect();
}

main().catch(console.error);

