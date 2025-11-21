/**
 * Configuration management for RoboOS SDK
 */

export type Network = 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet';

export interface RoboOSConfig {
  network: Network;
  fprEndpoint: string;
  marketplaceEndpoint: string;
  reputationEndpoint?: string;
  verificationEndpoint?: string;
  rpcEndpoint?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_CONFIG: Partial<RoboOSConfig> = {
  network: 'mainnet-beta',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableLogging: true,
  logLevel: 'info',
};

export class ConfigManager {
  private config: RoboOSConfig;

  constructor(config: Partial<RoboOSConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.validateConfig();
  }

  private mergeWithDefaults(partial: Partial<RoboOSConfig>): RoboOSConfig {
    const merged = { ...DEFAULT_CONFIG, ...partial } as RoboOSConfig;
    
    // Set default endpoints based on network if not provided
    if (!merged.fprEndpoint) {
      merged.fprEndpoint = this.getDefaultFPREndpoint(merged.network);
    }
    if (!merged.marketplaceEndpoint) {
      merged.marketplaceEndpoint = this.getDefaultMarketplaceEndpoint(merged.network);
    }
    if (!merged.reputationEndpoint) {
      merged.reputationEndpoint = this.getDefaultReputationEndpoint(merged.network);
    }
    if (!merged.verificationEndpoint) {
      merged.verificationEndpoint = this.getDefaultVerificationEndpoint(merged.network);
    }
    if (!merged.rpcEndpoint) {
      merged.rpcEndpoint = this.getDefaultRPCEndpoint(merged.network);
    }

    return merged;
  }

  private getDefaultFPREndpoint(network: Network): string {
    const endpoints: Record<Network, string> = {
      'mainnet-beta': 'https://fpr.roboos.io',
      'testnet': 'https://fpr-testnet.roboos.io',
      'devnet': 'https://fpr-devnet.roboos.io',
      'localnet': 'http://localhost:3001',
    };
    return endpoints[network];
  }

  private getDefaultMarketplaceEndpoint(network: Network): string {
    const endpoints: Record<Network, string> = {
      'mainnet-beta': 'https://marketplace.roboos.io',
      'testnet': 'https://marketplace-testnet.roboos.io',
      'devnet': 'https://marketplace-devnet.roboos.io',
      'localnet': 'http://localhost:3002',
    };
    return endpoints[network];
  }

  private getDefaultReputationEndpoint(network: Network): string {
    const endpoints: Record<Network, string> = {
      'mainnet-beta': 'https://reputation.roboos.io',
      'testnet': 'https://reputation-testnet.roboos.io',
      'devnet': 'https://reputation-devnet.roboos.io',
      'localnet': 'http://localhost:3003',
    };
    return endpoints[network];
  }

  private getDefaultVerificationEndpoint(network: Network): string {
    const endpoints: Record<Network, string> = {
      'mainnet-beta': 'https://verification.roboos.io',
      'testnet': 'https://verification-testnet.roboos.io',
      'devnet': 'https://verification-devnet.roboos.io',
      'localnet': 'http://localhost:3004',
    };
    return endpoints[network];
  }

  private getDefaultRPCEndpoint(network: Network): string {
    const endpoints: Record<Network, string> = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'testnet': 'https://api.testnet.solana.com',
      'devnet': 'https://api.devnet.solana.com',
      'localnet': 'http://localhost:8899',
    };
    return endpoints[network];
  }

  private validateConfig(): void {
    if (!this.config.fprEndpoint) {
      throw new Error('FPR endpoint is required');
    }
    if (!this.config.marketplaceEndpoint) {
      throw new Error('Marketplace endpoint is required');
    }
    if (this.config.timeout && this.config.timeout < 0) {
      throw new Error('Timeout must be non-negative');
    }
    if (this.config.retryAttempts && this.config.retryAttempts < 0) {
      throw new Error('Retry attempts must be non-negative');
    }
  }

  getConfig(): RoboOSConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<RoboOSConfig>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...updates });
    this.validateConfig();
  }
}

