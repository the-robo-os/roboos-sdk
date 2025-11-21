/**
 * Main RobotSDK class
 */

import { Connection } from '@solana/web3.js';
import { RobotWallet, WalletOptions } from './wallet/RobotWallet';
import { ConfigManager, RoboOSConfig } from './config/RoboOSConfig';
import { getLogger, setLogLevel, LogLevel } from './utils/logger';

export interface SDKOptions extends Partial<RoboOSConfig> {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class RobotSDK {
  private config: ConfigManager;
  private logger = getLogger();

  constructor(options: SDKOptions = {}) {
    // Set log level
    if (options.logLevel) {
      const levelMap: Record<string, LogLevel> = {
        debug: LogLevel.DEBUG,
        info: LogLevel.INFO,
        warn: LogLevel.WARN,
        error: LogLevel.ERROR,
      };
      setLogLevel(levelMap[options.logLevel] || LogLevel.INFO);
    }

    // Initialize config
    this.config = new ConfigManager(options);
    
    this.logger.info('RobotSDK initialized', {
      network: this.config.getConfig().network,
      fprEndpoint: this.config.getConfig().fprEndpoint,
    });
  }

  /**
   * Create a robot wallet
   */
  async wallet(options: WalletOptions): Promise<RobotWallet> {
    return RobotWallet.create(options);
  }

  /**
   * Get configuration
   */
  getConfig(): RoboOSConfig {
    return this.config.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RoboOSConfig>): void {
    this.config.updateConfig(updates);
  }

  /**
   * Create Solana connection
   */
  createConnection(endpoint?: string): Connection {
    const rpcEndpoint = endpoint || this.config.getConfig().rpcEndpoint;
    if (!rpcEndpoint) {
      throw new Error('RPC endpoint not configured');
    }
    return new Connection(rpcEndpoint, 'confirmed');
  }
}

