# API Reference

Complete API reference for the RoboOS Robot SDK.

## RobotSDK

Main SDK class for initializing and configuring the SDK.

### Constructor

```typescript
new RobotSDK(options?: SDKOptions)
```

**Options:**
- `network`: 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet'
- `fprEndpoint`: string
- `marketplaceEndpoint`: string
- `reputationEndpoint?`: string
- `verificationEndpoint?`: string
- `rpcEndpoint?`: string
- `timeout?`: number (default: 30000)
- `retryAttempts?`: number (default: 3)
- `logLevel?`: 'debug' | 'info' | 'warn' | 'error'

### Methods

#### `wallet(options: WalletOptions): Promise<RobotWallet>`

Create a robot wallet.

#### `getConfig(): RoboOSConfig`

Get current configuration.

#### `updateConfig(updates: Partial<RoboOSConfig>): void`

Update configuration.

## RobotWallet

Wallet management for robots.

### Methods

#### `getPublicKey(): PublicKey`

Get wallet public key.

#### `getStealthAddress(): X402StealthAddress`

Get x402 stealth address.

#### `getBalance(connection?: Connection): Promise<number>`

Get wallet balance in SOL.

#### `backup(): Promise<string>`

Create wallet backup.

#### `restore(backupData: string, password?: string): Promise<void>`

Restore wallet from backup.

### Events

- `balanceChanged`: (balance: number) => void
- `backupCreated`: (backup: string) => void
- `error`: (error: Error) => void

## FPRClient

Fleet Payment Router client for payment channels.

### Methods

#### `connect(robotId: string, robotPublicKey: PublicKey): Promise<void>`

Connect to FPR service.

#### `disconnect(): Promise<void>`

Disconnect from FPR service.

#### `openChannel(request: OpenChannelRequest): Promise<PaymentChannel>`

Open a payment channel.

#### `sendPayment(request: PaymentRequest): Promise<void>`

Send micropayment through channel.

#### `closeChannel(channelId: string): Promise<void>`

Close a payment channel.

#### `getChannelStatus(channelId: string): Promise<ChannelStatus>`

Get channel status.

#### `getChannels(): PaymentChannel[]`

Get all channels.

### Events

- `connected`: () => void
- `disconnected`: () => void
- `channelOpened`: (channel: PaymentChannel) => void
- `channelClosed`: (channelId: string) => void
- `paymentReceived`: (channelId: string, amount: number) => void

## TaskMarketplace

Task marketplace for bidding and task management.

### Methods

#### `queryTasks(query?: TaskQuery): Promise<Task[]>`

Query available tasks.

#### `getTask(taskId: string): Promise<Task>`

Get task by ID.

#### `bid(request: BidRequest): Promise<Bid>`

Submit a bid for a task.

#### `autoBid(task: Task, context: BiddingContext): Promise<Bid | null>`

Auto-bid using configured strategy.

#### `acceptTask(taskId: string): Promise<Task>`

Accept task assignment.

#### `updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>`

Update task status.

#### `setBiddingStrategy(strategy: BiddingStrategy): void`

Set bidding strategy.

#### `startPolling(query?: TaskQuery): void`

Start polling for new tasks.

#### `stopPolling(): void`

Stop polling.

### Events

- `taskAvailable`: (task: Task) => void
- `taskAssigned`: (task: Task) => void
- `bidAccepted`: (bid: Bid) => void
- `bidRejected`: (bid: Bid) => void
- `taskCompleted`: (taskId: string) => void

## ZKVerification

Zero-knowledge task verification.

### Methods

#### `generateProof(options: ProofGenerationOptions): Promise<TaskProof>`

Generate ZK proof for task completion.

#### `verifyProof(proof: TaskProof): Promise<boolean>`

Verify a proof.

#### `submitProof(proof: TaskProof): Promise<VerificationResult>`

Submit proof for verification.

#### `getVerificationStatus(taskId: string): Promise<VerificationResult | null>`

Get verification status.

## ReputationClient

Robot Reputation Ledger client.

### Methods

#### `getScore(robotId: string, useCache?: boolean): Promise<ReputationScore>`

Get reputation score.

#### `submitUpdate(update: ReputationUpdate): Promise<void>`

Submit reputation update.

#### `queryScores(query?: ReputationQuery): Promise<ReputationScore[]>`

Query reputation scores.

#### `clearCache(): void`

Clear reputation cache.

### Events

- `scoreUpdated`: (score: ReputationScore) => void

## BaseRobot

Base robot class with common functionality.

### Methods

#### `initialize(): Promise<void>`

Initialize robot connections.

#### `connect(): Promise<void>`

Connect to RoboOS services.

#### `disconnect(): Promise<void>`

Disconnect from services.

#### `completeTask(taskId: string, proofData: Record<string, unknown>): Promise<TaskProof>`

Complete task and submit proof.

#### `getFPR(): FPRClient | undefined`

Get FPR client.

#### `getMarketplace(): TaskMarketplace | undefined`

Get marketplace client.

#### `getReputation(): ReputationClient | undefined`

Get reputation client.

## Robot Type Helpers

### ForkliftRobot

Extends `BaseRobot` with forklift-specific capabilities.

**Methods:**
- `canHandleTask(task: Task): boolean`
- `executeTask(task: Task): Promise<void>`
- `getForkliftCapabilities(): ForkliftCapabilities`

### AMRRobot

Extends `BaseRobot` with AMR-specific capabilities.

**Methods:**
- `canHandleTask(task: Task): boolean`
- `calculateDistance(task: Task, currentLocation?: { x: number; y: number }): number`
- `executeTask(task: Task): Promise<void>`
- `getAMRCapabilities(): AMRCapabilities`

### CleaningRobot

Extends `BaseRobot` with cleaning-specific capabilities.

**Methods:**
- `canHandleTask(task: Task): boolean`
- `executeTask(task: Task): Promise<void>`
- `getCleaningCapabilities(): CleaningCapabilities`

### HospitalRobot

Extends `BaseRobot` with hospital-specific capabilities.

**Methods:**
- `canHandleTask(task: Task): boolean`
- `executeTask(task: Task): Promise<void>`
- `getHospitalCapabilities(): HospitalCapabilities`

### DroneRobot

Extends `BaseRobot` with drone-specific capabilities.

**Methods:**
- `canHandleTask(task: Task): boolean`
- `executeTask(task: Task): Promise<void>`
- `getDroneCapabilities(): DroneCapabilities`

### RoboticArm

Extends `BaseRobot` with robotic arm-specific capabilities.

**Methods:**
- `canHandleTask(task: Task): boolean`
- `executeTask(task: Task): Promise<void>`
- `getRoboticArmCapabilities(): RoboticArmCapabilities`

