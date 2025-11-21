/**
 * Wallet tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RobotSDK } from '../../src';
import { RobotWallet } from '../../src/wallet/RobotWallet';

describe('RobotWallet', () => {
  let sdk: RobotSDK;
  let wallet: RobotWallet;

  beforeEach(async () => {
    sdk = new RobotSDK({
      network: 'testnet',
    });

    wallet = await sdk.wallet({
      storage: 'memory',
      encrypted: false,
    });
  });

  it('should create a wallet', () => {
    expect(wallet).toBeDefined();
    expect(wallet.getPublicKey()).toBeDefined();
  });

  it('should generate stealth address', () => {
    const stealthAddress = wallet.getStealthAddress();
    expect(stealthAddress).toBeDefined();
    expect(stealthAddress.address).toContain('x402_');
    expect(stealthAddress.viewKey).toBeDefined();
    expect(stealthAddress.spendKey).toBeDefined();
  });

  it('should get wallet info', async () => {
    const info = await wallet.getInfo();
    expect(info).toBeDefined();
    expect(info.publicKey).toBeDefined();
    expect(info.address).toBeDefined();
    expect(info.isEncrypted).toBe(false);
  });

  it('should create backup', async () => {
    const backup = await wallet.backup();
    expect(backup).toBeDefined();
    expect(typeof backup).toBe('string');
  });

  it('should restore from backup', async () => {
    const backup = await wallet.backup();
    const publicKey = wallet.getPublicKey().toBase58();

    // Create new wallet and restore
    const newWallet = await sdk.wallet({
      storage: 'memory',
      encrypted: false,
    });

    await newWallet.restore(backup);
    expect(newWallet.getPublicKey().toBase58()).toBe(publicKey);
  });
});

