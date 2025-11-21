/**
 * Basic Robot Example
 * 
 * Demonstrates basic SDK usage: wallet creation, connection, and task handling
 */

import { RobotSDK, RobotWallet, BaseRobot, RobotOptions } from '../src';

async function main() {
  // Initialize SDK
  const sdk = new RobotSDK({
    network: 'testnet',
    fprEndpoint: 'https://fpr-testnet.theroboos.com',
    marketplaceEndpoint: 'https://marketplace-testnet.theroboos.com',
    logLevel: 'info',
  });

  // Create robot wallet
  const wallet = await sdk.wallet({
    storage: 'file',
    path: './robot-wallet.json',
    encrypted: true,
    password: 'secure-password',
  });

  console.log('Wallet created:', {
    publicKey: wallet.getPublicKey().toBase58(),
    stealthAddress: wallet.getStealthAddress().address,
  });

  // Create a basic robot
  const robot = new BaseRobot({
    robotId: 'robot-001',
    wallet,
    config: sdk.getConfig(),
    capabilities: {
      navigation: true,
      manipulation: true,
    },
  });

  // Initialize and connect
  await robot.initialize();
  await robot.connect();

  console.log('Robot connected to RoboOS');

  // Get marketplace and query tasks
  const marketplace = robot.getMarketplace();
  if (marketplace) {
    const tasks = await marketplace.queryTasks({
      status: 'pending',
      limit: 10,
    });

    console.log(`Found ${tasks.length} available tasks`);

    // Accept first task if available
    if (tasks.length > 0) {
      const task = tasks[0];
      console.log('Accepting task:', task.taskId);

      await marketplace.acceptTask(task.taskId);
      await marketplace.updateTaskStatus(task.taskId, 'in_progress');

      // Simulate task completion
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Complete task
      await robot.completeTask(task.taskId, {
        taskType: task.type,
        location: task.location,
      });

      console.log('Task completed successfully');
    }
  }

  // Disconnect
  await robot.disconnect();
  console.log('Robot disconnected');
}

main().catch(console.error);

