# Wallet Setup

The Robot Wallet SDK provides secure wallet management for robots in the RoboOS ecosystem.

## Creating a Wallet

### File-Based Storage (Recommended)

```typescript
import { RobotSDK } from '@roboos/robot-sdk';

const sdk = new RobotSDK();
const wallet = await sdk.wallet({
  storage: 'file',
  path: './robot-wallet.json',
  encrypted: true,
  password: 'secure-password',
  autoBackup: true,
  backupInterval: 3600000, // 1 hour
});
```

### In-Memory Storage

```typescript
const wallet = await sdk.wallet({
  storage: 'memory',
  encrypted: false, // Memory storage typically not encrypted
});
```

## Wallet Operations

### Get Public Key

```typescript
const publicKey = wallet.getPublicKey();
console.log('Public Key:', publicKey.toBase58());
```

### Get x402 Stealth Address

```typescript
const stealthAddress = wallet.getStealthAddress();
console.log('Stealth Address:', stealthAddress.address);
```

### Get Balance

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.testnet.solana.com');
wallet.setConnection(connection);

const balance = await wallet.getBalance();
console.log('Balance:', balance, 'SOL');
```

### Create Backup

```typescript
const backup = await wallet.backup();
// Store backup securely
console.log('Backup created:', backup);
```

### Restore from Backup

```typescript
await wallet.restore(backupData, 'password');
```

## Wallet Events

```typescript
wallet.on('balanceChanged', (balance) => {
  console.log('Balance changed:', balance);
});

wallet.on('backupCreated', (backup) => {
  console.log('Backup created');
});

wallet.on('error', (error) => {
  console.error('Wallet error:', error);
});
```

## Security Best Practices

1. **Always encrypt file-based wallets** with a strong password
2. **Enable automatic backups** for production robots
3. **Store backups securely** in multiple locations
4. **Never commit wallet files** to version control
5. **Use hardware wallets** for high-value robots (when supported)

## x402 Stealth Payments

The wallet automatically generates x402 stealth addresses for private payments:

```typescript
const stealthAddress = wallet.getStealthAddress();
// Use this address for receiving private payments
```

Stealth addresses enable:
- Unlinkable payment streams
- Confidential bidding
- Private task outsourcing
- Hidden operational patterns

