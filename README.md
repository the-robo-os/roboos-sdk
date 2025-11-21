# RoboOS Robot SDK

[![npm version](https://img.shields.io/npm/v/@roboos/robot-sdk.svg)](https://www.npmjs.com/package/@roboos/robot-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript/JavaScript SDK for integrating robots into the **RoboOS ($ROS)** ecosystem. RoboOS is a Robotic Payment Operating System that enables robots to coordinate autonomously through economic incentives using blockchain Solana and the x402 stealth payment protocol.

## Features

- 🤖 **Robot Wallet SDK** - Solana wallet management with x402 stealth payment integration
- 💰 **Fleet Payment Router (FPR) Client** - Payment channels and micropayments
- 📋 **Task Marketplace API** - Task bidding, querying, and assignment
- 🔐 **Zero-Knowledge Verification** - Task completion proofs
- ⭐ **Reputation System** - Robot Reputation Ledger (RRL) integration
- 🏭 **Robot Type Helpers** - Pre-built helpers for Forklift, AMR, Cleaning, Hospital, Drone, and Robotic Arm

## Installation

```bash
npm install @roboos/robot-sdk
# or
bun add @roboos/robot-sdk
```

## Quick Start

```typescript
import { RobotSDK, ForkliftRobot } from '@roboos/robot-sdk';

// Initialize SDK
const sdk = new RobotSDK({
  network: 'mainnet-beta',
  fprEndpoint: 'https://fpr.theroboos.com',
  marketplaceEndpoint: 'https://marketplace.theroboos.com',
});

// Create robot wallet
const wallet = await sdk.wallet.create({
  storage: 'file',
  path: './robot-wallet.json',
  encrypted: true,
});

// Initialize forklift robot
const forklift = new ForkliftRobot({
  robotId: 'forklift-001',
  wallet,
  config: sdk.getConfig(),
  capabilities: {
    lifting: true,
    transport: true,
    stacking: true,
    maxWeight: 2000,
    maxHeight: 5,
    navigation: true,
  },
});

// Connect to RoboOS
await forklift.initialize();
await forklift.connect();

// Open payment channel
const channel = await forklift.getFPR()?.openChannel({
  peerRobotId: 'forklift-002',
  collateral: 1000, // ROS tokens
});

// Bid on a task
const task = await forklift.getMarketplace()?.bid({
  taskId: 'task-123',
  bidAmount: 50,
  estimatedDuration: 300,
});

// Complete task and submit proof
await forklift.completeTask(task.id, {
  proof: generateZKProof(task),
});

// Check reputation
const reputation = await forklift.getReputation()?.getScore('forklift-001');
console.log(`Reputation: ${reputation?.score}`);
```

## Documentation

- [Getting Started Guide](./docs/guides/getting-started.md)
- [Wallet Setup](./docs/guides/wallet-setup.md)
- [Payment Channels](./docs/guides/payment-channels.md)
- [Task Bidding](./docs/guides/task-bidding.md)
- [API Reference](./docs/API.md)

## Examples

See the [examples](./examples/) directory for complete examples:

- [Basic Robot](./examples/basic-robot.ts) - Basic SDK usage
- [Forklift Example](./examples/forklift-example.ts) - Forklift-specific capabilities
- [Bidding Example](./examples/bidding-example.ts) - Custom bidding strategies
- [Payment Channel Example](./examples/payment-channel-example.ts) - Payment channels and micropayments
- [AMR Example](./examples/amr-example.ts) - Autonomous Mobile Robot example

## Robot Types

The SDK provides pre-built helpers for various robot types:

- **ForkliftRobot** - Material handling, warehouse operations
- **AMRRobot** - Navigation, delivery tasks
- **CleaningRobot** - Area coverage, route optimization
- **HospitalRobot** - Medical transport, sterilization
- **DroneRobot** - Flight routes, surveillance
- **RoboticArm** - Assembly, manipulation tasks

## Requirements

- Node.js 18+ or Bun
- TypeScript 5+ (optional but recommended)

## License

MIT

## Support

For issues, questions, or contributions, please visit our [GitHub repository](https://github.com/roboos/robot-sdk).

