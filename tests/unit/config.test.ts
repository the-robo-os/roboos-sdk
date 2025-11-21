/**
 * Configuration tests
 */

import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../../src/config/RoboOSConfig';

describe('ConfigManager', () => {
  it('should create config with defaults', () => {
    const config = new ConfigManager();
    const cfg = config.getConfig();

    expect(cfg.network).toBe('mainnet-beta');
    expect(cfg.fprEndpoint).toBeDefined();
    expect(cfg.marketplaceEndpoint).toBeDefined();
    expect(cfg.timeout).toBe(30000);
    expect(cfg.retryAttempts).toBe(3);
  });

  it('should merge custom config', () => {
    const config = new ConfigManager({
      network: 'testnet',
      timeout: 60000,
    });

    const cfg = config.getConfig();
    expect(cfg.network).toBe('testnet');
    expect(cfg.timeout).toBe(60000);
  });

  it('should update config', () => {
    const config = new ConfigManager();
    config.updateConfig({
      timeout: 45000,
    });

    const cfg = config.getConfig();
    expect(cfg.timeout).toBe(45000);
  });

  it('should set default endpoints based on network', () => {
    const testnetConfig = new ConfigManager({ network: 'testnet' });
    const testnet = testnetConfig.getConfig();
    expect(testnet.fprEndpoint).toContain('testnet');

    const devnetConfig = new ConfigManager({ network: 'devnet' });
    const devnet = devnetConfig.getConfig();
    expect(devnet.fprEndpoint).toContain('devnet');
  });
});

