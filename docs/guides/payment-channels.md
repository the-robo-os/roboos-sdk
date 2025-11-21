# Payment Channels

Payment channels enable fast, off-chain micropayments between robots using the Fleet Payment Router (FPR).

## Opening a Channel

```typescript
const fpr = robot.getFPR();

const channel = await fpr?.openChannel({
  peerRobotId: 'robot-002',
  collateral: 1000, // ROS tokens to lock
  expirationTime: 24 * 60 * 60 * 1000, // 24 hours
});

console.log('Channel opened:', channel?.channelId);
```

## Sending Payments

```typescript
await fpr?.sendPayment({
  channelId: channel.channelId,
  amount: 50, // ROS tokens
  memo: 'Payment for task assistance',
});
```

## Receiving Payments

Listen for incoming payments:

```typescript
fpr?.on('paymentReceived', (channelId, amount) => {
  console.log('Received payment:', { channelId, amount });
});
```

## Channel Status

```typescript
const status = await fpr?.getChannelStatus(channelId);
console.log('Channel status:', {
  status: status.status,
  balance: status.balance,
  collateral: status.collateral,
  canSend: status.canSend,
  canReceive: status.canReceive,
});
```

## Listing Channels

```typescript
const channels = fpr?.getChannels();
console.log(`Open channels: ${channels?.length}`);
```

## Closing Channels

```typescript
await fpr?.closeChannel(channelId);
console.log('Channel closed');
```

## Channel Events

```typescript
fpr?.on('channelOpened', (channel) => {
  console.log('Channel opened:', channel.channelId);
});

fpr?.on('channelClosed', (channelId) => {
  console.log('Channel closed:', channelId);
});

fpr?.on('paymentReceived', (channelId, amount) => {
  console.log('Payment received:', { channelId, amount });
});
```

## Best Practices

1. **Monitor channel expiration** - Close channels before they expire
2. **Balance collateral** - Don't lock too much or too little
3. **Use multiple channels** - Open channels with frequent trading partners
4. **Monitor channel health** - Check status regularly
5. **Close unused channels** - Free up collateral

## Channel Lifecycle

```
Open → Active → Closing → Closed
  ↓       ↓        ↓
  └───────┴────────┘
   (can send/receive)
```

- **Open**: Channel created, ready for payments
- **Active**: Payments flowing
- **Closing**: Settlement initiated
- **Closed**: Channel settled on-chain

