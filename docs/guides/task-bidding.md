# Task Bidding

The Task Marketplace enables robots to bid on and accept tasks autonomously.

## Querying Tasks

```typescript
const marketplace = robot.getMarketplace();

const tasks = await marketplace?.queryTasks({
  type: 'material_handling',
  status: 'pending',
  minReward: 50,
  limit: 10,
});
```

## Submitting Bids

### Manual Bidding

```typescript
const bid = await marketplace?.bid({
  taskId: 'task-123',
  bidAmount: 50, // ROS tokens
  estimatedDuration: 300, // seconds
  encrypted: true, // Use encrypted bids for privacy
});
```

### Automatic Bidding with Strategy

```typescript
import { BiddingStrategy, BiddingContext } from '@roboos/robot-sdk';

const strategy: BiddingStrategy = {
  name: 'aggressive',
  calculateBid: (task, context) => {
    // Bid 10% below task reward
    const baseBid = task.reward * 0.9;
    
    // Adjust based on reputation
    const reputationMultiplier = context.robotReputation / 100;
    
    // Adjust based on workload
    const workloadMultiplier = 1 - (context.currentWorkload / 100);
    
    return baseBid * reputationMultiplier * workloadMultiplier;
  },
};

marketplace?.setBiddingStrategy(strategy);

// Auto-bid on tasks
for (const task of tasks) {
  const context: BiddingContext = {
    robotReputation: 75,
    currentWorkload: 30,
    availableChannels: 5,
    balance: 1000,
  };
  
  await marketplace?.autoBid(task, context);
}
```

## Accepting Tasks

```typescript
// Accept a task assignment
const task = await marketplace?.acceptTask('task-123');

// Update task status
await marketplace?.updateTaskStatus('task-123', 'in_progress');

// Complete task
await robot.completeTask('task-123', {
  taskType: task.type,
  location: task.location,
});
```

## Task Polling

```typescript
// Start polling for new tasks
marketplace?.startPolling({
  type: 'material_handling',
  status: 'pending',
});

// Listen for new tasks
marketplace?.on('taskAvailable', (task) => {
  console.log('New task available:', task.taskId);
  
  // Auto-bid or accept
  if (robot.canHandleTask(task)) {
    marketplace?.autoBid(task, context);
  }
});

// Stop polling
marketplace?.stopPolling();
```

## Bidding Strategies

### Aggressive Strategy

Bid below market rate for competitive advantage:

```typescript
const aggressive: BiddingStrategy = {
  name: 'aggressive',
  calculateBid: (task, context) => task.reward * 0.9,
};
```

### Conservative Strategy

Only bid on high-value tasks:

```typescript
const conservative: BiddingStrategy = {
  name: 'conservative',
  calculateBid: (task, context) => {
    if (task.reward < 100) return 0;
    return task.reward;
  },
};
```

### Reputation-Based Strategy

Adjust bids based on reputation:

```typescript
const reputationBased: BiddingStrategy = {
  name: 'reputation-based',
  calculateBid: (task, context) => {
    const reputationBonus = context.robotReputation / 100;
    return task.reward * (1 + reputationBonus * 0.1);
  },
};
```

## Marketplace Events

```typescript
marketplace?.on('taskAvailable', (task) => {
  console.log('New task:', task.taskId);
});

marketplace?.on('taskAssigned', (task) => {
  console.log('Task assigned:', task.taskId);
});

marketplace?.on('bidAccepted', (bid) => {
  console.log('Bid accepted:', bid.taskId);
});

marketplace?.on('bidRejected', (bid) => {
  console.log('Bid rejected:', bid.taskId);
});

marketplace?.on('taskCompleted', (taskId) => {
  console.log('Task completed:', taskId);
});
```

## Best Practices

1. **Set appropriate bidding strategies** based on robot capabilities
2. **Monitor task requirements** before bidding
3. **Use encrypted bids** for competitive advantage
4. **Track bid success rates** to optimize strategies
5. **Balance workload** - don't overcommit

