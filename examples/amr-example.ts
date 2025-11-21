/**
 * AMR (Autonomous Mobile Robot) Example
 * 
 * Demonstrates AMR-specific capabilities for navigation and delivery tasks
 */

import { RobotSDK, AMRRobot, AMRCapabilities } from '../src';

async function main() {
  // Initialize SDK
  const sdk = new RobotSDK({
    network: 'testnet',
    marketplaceEndpoint: 'https://marketplace-testnet.theroboos.com',
  });

  // Create wallet
  const wallet = await sdk.wallet({
    storage: 'file',
    path: './amr-wallet.json',
  });

  // Define AMR capabilities
  const capabilities: AMRCapabilities = {
    navigation: true,
    delivery: true,
    mapping: true,
    maxSpeed: 1.5, // m/s
    maxPayload: 50, // kg
    batteryCapacity: 85, // percentage
  };

  // Create AMR robot
  const amr = new AMRRobot({
    robotId: 'amr-001',
    wallet,
    config: sdk.getConfig(),
    capabilities,
  });

  await amr.initialize();
  await amr.connect();

  console.log('AMR robot connected');

  // Query navigation and delivery tasks
  const marketplace = amr.getMarketplace();
  if (marketplace) {
    // Query delivery tasks
    const deliveryTasks = await marketplace.queryTasks({
      type: 'delivery',
      status: 'pending',
    });

    console.log(`Found ${deliveryTasks.length} delivery tasks`);

    // Query navigation tasks
    const navTasks = await marketplace.queryTasks({
      type: 'navigation',
      status: 'pending',
    });

    console.log(`Found ${navTasks.length} navigation tasks`);

    // Process delivery tasks
    for (const task of deliveryTasks) {
      if (amr.canHandleTask(task)) {
        const distance = amr.calculateDistance(task, { x: 0, y: 0 });
        console.log(`Task ${task.taskId} is ${distance.toFixed(2)}m away`);

        await marketplace.acceptTask(task.taskId);
        await marketplace.updateTaskStatus(task.taskId, 'in_progress');

        await amr.executeTask(task);
        console.log(`Delivery task ${task.taskId} completed`);
      }
    }

    // Process navigation tasks
    for (const task of navTasks) {
      if (amr.canHandleTask(task)) {
        await marketplace.acceptTask(task.taskId);
        await marketplace.updateTaskStatus(task.taskId, 'in_progress');

        await amr.executeTask(task);
        console.log(`Navigation task ${task.taskId} completed`);
      }
    }
  }

  // Check AMR capabilities
  const amrCaps = amr.getAMRCapabilities();
  console.log('AMR capabilities:', {
    maxSpeed: amrCaps.maxSpeed,
    maxPayload: amrCaps.maxPayload,
    batteryCapacity: amrCaps.batteryCapacity,
  });

  await amr.disconnect();
}

main().catch(console.error);

