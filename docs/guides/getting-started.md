# Getting Started

This guide will help you get started with the RoboOS Robot SDK.

## Installation

```bash
npm install @roboos/robot-sdk
# or
bun add @roboos/robot-sdk
```

## Basic Setup

### 1. Initialize the SDK

```typescript
import { RobotSDK } from '@roboos/robot-sdk';

const sdk = new RobotSDK({
  network: 'testnet', // or 'mainnet-beta', 'devnet', 'localnet'
  fprEndpoint: 'https://fpr-testnet.roboos.io',
  marketplaceEndpoint: 'https://marketplace-testnet.roboos.io',
  logLevel: 'info', // 'debug', 'info', 'warn', 'error'
});
```

### 2. Create a Robot Wallet

```typescript
const wallet = await sdk.wallet({
  storage: 'file', // 'file', 'memory', or 'hardware'
  path: './robot-wallet.json',
  encrypted: true,
  password: 'your-secure-password',
});
```

### 3. Create a Robot

```typescript
import { ForkliftRobot } from '@roboos/robot-sdk';

const forklift = new ForkliftRobot({
  robotId: 'forklift-001',
  wallet,
  config: sdk.getConfig(),
  capabilities: {
    lifting: true,
    transport: true,
    stacking: true,
    maxWeight: 2000, // kg
    maxHeight: 5, // meters
    navigation: true,
  },
});
```

### 4. Initialize and Connect

```typescript
await forklift.initialize();
await forklift.connect();
```

### 5. Query and Accept Tasks

```typescript
const marketplace = forklift.getMarketplace();

// Query available tasks
const tasks = await marketplace?.queryTasks({
  type: 'material_handling',
  status: 'pending',
});

// Accept a task
if (tasks && tasks.length > 0) {
  const task = tasks[0];
  await marketplace?.acceptTask(task.taskId);
  
  // Execute task...
  
  // Complete task
  await forklift.completeTask(task.taskId, {
    taskType: task.type,
    location: task.location,
  });
}
```

## Next Steps

- Learn about [Wallet Setup](./wallet-setup.md)
- Explore [Payment Channels](./payment-channels.md)
- Read about [Task Bidding](./task-bidding.md)

