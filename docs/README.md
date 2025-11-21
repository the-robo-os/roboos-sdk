# RoboOS Robot SDK Documentation

Welcome to the RoboOS Robot SDK documentation. This SDK enables robots to integrate with the RoboOS ecosystem for autonomous economic coordination.

## Table of Contents

- [Getting Started](./guides/getting-started.md)
- [Wallet Setup](./guides/wallet-setup.md)
- [Payment Channels](./guides/payment-channels.md)
- [Task Bidding](./guides/task-bidding.md)
- [API Reference](./API.md)

## Overview

The RoboOS Robot SDK provides a comprehensive TypeScript/JavaScript interface for:

1. **Wallet Management** - Solana wallet creation, encryption, and x402 stealth payment addresses
2. **Payment Channels** - Open channels, send/receive micropayments, manage balances
3. **Task Marketplace** - Query tasks, submit bids, accept assignments
4. **Task Verification** - Generate and submit ZK proofs for task completion
5. **Reputation System** - Query and update robot reputation scores
6. **Robot Helpers** - Pre-built classes for different robot types

## Architecture

```
┌─────────────────────────────────────────┐
│         Robot Application               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         RobotSDK                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  Wallet  │  │   FPR    │            │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐            │
│  │Marketplace│  │Verification│          │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐                          │
│  │Reputation│                          │
│  └──────────┘                          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      RoboOS Ecosystem                    │
│  (FPR, Marketplace, RRL, ZKTV)          │
└─────────────────────────────────────────┘
```

## Key Concepts

### Robot Wallet

Each robot has a Solana wallet that:
- Stores the robot's identity (keypair)
- Generates x402 stealth addresses for private payments
- Manages encryption and backup

### Payment Channels

Robots open payment channels with each other to enable:
- Off-chain micropayments
- Fast settlement
- Reduced transaction costs
- Privacy through x402

### Task Marketplace

Robots can:
- Query available tasks
- Submit encrypted bids
- Accept task assignments
- Track task status

### Zero-Knowledge Verification

Robots generate ZK proofs to:
- Prove task completion
- Maintain privacy
- Enable trustless coordination

### Reputation System

The Robot Reputation Ledger (RRL) tracks:
- Task completion rates
- Reliability scores
- Historical performance

## Next Steps

- Read the [Getting Started Guide](./guides/getting-started.md)
- Explore the [API Reference](./API.md)
- Check out the [Examples](../examples/)

