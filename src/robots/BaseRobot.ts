/**
 * Base Robot class
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { RobotWallet } from '../wallet/RobotWallet';
import { FPRClient } from '../fpr/FPRClient';
import { TaskMarketplace } from '../marketplace/TaskMarketplace';
import { ZKVerification } from '../verification/ZKVerification';
import { ReputationClient } from '../reputation/ReputationClient';
import { ConfigManager, RoboOSConfig } from '../config/RoboOSConfig';
import { getLogger } from '../utils/logger';
import { Task, TaskProof, ProofGenerationOptions } from '../marketplace/types';

export interface RobotCapabilities {
  [key: string]: boolean | number | string;
}

export interface RobotOptions {
  robotId: string;
  wallet: RobotWallet;
  config: Partial<RoboOSConfig>;
  capabilities: RobotCapabilities;
}

export abstract class BaseRobot {
  protected robotId: string;
  protected wallet: RobotWallet;
  protected config: ConfigManager;
  protected capabilities: RobotCapabilities;
  protected fpr?: FPRClient;
  protected marketplace?: TaskMarketplace;
  protected verification?: ZKVerification;
  protected reputation?: ReputationClient;
  protected connection?: Connection;
  protected logger = getLogger();
  protected connected: boolean = false;

  constructor(options: RobotOptions) {
    this.robotId = options.robotId;
    this.wallet = options.wallet;
    this.config = new ConfigManager(options.config);
    this.capabilities = options.capabilities;
  }

  /**
   * Initialize robot connections
   */
  async initialize(): Promise<void> {
    // Set up Solana connection
    const rpcEndpoint = this.config.getConfig().rpcEndpoint;
    if (rpcEndpoint) {
      this.connection = new Connection(rpcEndpoint, 'confirmed');
      this.wallet.setConnection(this.connection);
    }

    // Initialize FPR client
    const fprConfig = this.config.getConfig();
    this.fpr = new FPRClient({
      endpoint: fprConfig.fprEndpoint,
      timeout: fprConfig.timeout,
      retryAttempts: fprConfig.retryAttempts,
      retryDelay: fprConfig.retryDelay,
    });

    // Initialize marketplace
    this.marketplace = new TaskMarketplace({
      endpoint: fprConfig.marketplaceEndpoint,
      timeout: fprConfig.timeout,
      retryAttempts: fprConfig.retryAttempts,
      retryDelay: fprConfig.retryDelay,
    });
    this.marketplace.setRobotId(this.robotId);

    // Initialize verification
    this.verification = new ZKVerification({
      endpoint: fprConfig.verificationEndpoint,
      timeout: fprConfig.timeout,
    });

    // Initialize reputation
    if (fprConfig.reputationEndpoint) {
      this.reputation = new ReputationClient({
        endpoint: fprConfig.reputationEndpoint,
        timeout: fprConfig.timeout,
        retryAttempts: fprConfig.retryAttempts,
        retryDelay: fprConfig.retryDelay,
      });
    }

    this.logger.info('Robot initialized', { robotId: this.robotId });
  }

  /**
   * Connect to RoboOS services
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (!this.fpr) {
      throw new Error('Robot not initialized. Call initialize() first.');
    }

    const publicKey = this.wallet.getPublicKey();
    await this.fpr.connect(this.robotId, publicKey);

    this.connected = true;
    this.logger.info('Robot connected to RoboOS', { robotId: this.robotId });
  }

  /**
   * Disconnect from RoboOS services
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    if (this.fpr) {
      await this.fpr.disconnect();
    }

    if (this.marketplace) {
      this.marketplace.stopPolling();
    }

    this.connected = false;
    this.logger.info('Robot disconnected from RoboOS', { robotId: this.robotId });
  }

  /**
   * Complete a task and submit proof
   */
  async completeTask(taskId: string, proofData: Record<string, unknown>): Promise<TaskProof> {
    if (!this.verification) {
      throw new Error('Verification not initialized');
    }

    const options: ProofGenerationOptions = {
      taskId,
      taskData: proofData,
      robotId: this.robotId,
      includeLocation: true,
      includeTimestamp: true,
    };

    const proof = await this.verification.generateProof(options);

    // Submit proof for verification
    await this.verification.submitProof(proof);

    // Update task status
    if (this.marketplace) {
      await this.marketplace.updateTaskStatus(taskId, 'completed');
    }

    // Update reputation
    if (this.reputation) {
      await this.reputation.submitUpdate({
        robotId: this.robotId,
        taskId,
        success: true,
        timestamp: new Date(),
      });
    }

    this.logger.info('Task completed', { taskId, robotId: this.robotId });
    return proof;
  }

  /**
   * Get robot capabilities
   */
  getCapabilities(): RobotCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if robot has capability
   */
  hasCapability(capability: string): boolean {
    return this.capabilities[capability] === true || Boolean(this.capabilities[capability]);
  }

  /**
   * Get FPR client
   */
  getFPR(): FPRClient | undefined {
    return this.fpr;
  }

  /**
   * Get marketplace
   */
  getMarketplace(): TaskMarketplace | undefined {
    return this.marketplace;
  }

  /**
   * Get verification client
   */
  getVerification(): ZKVerification | undefined {
    return this.verification;
  }

  /**
   * Get reputation client
   */
  getReputation(): ReputationClient | undefined {
    return this.reputation;
  }

  /**
   * Get wallet
   */
  getWallet(): RobotWallet {
    return this.wallet;
  }

  /**
   * Get robot ID
   */
  getRobotId(): string {
    return this.robotId;
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    
    if (this.fpr) {
      await this.fpr.destroy();
    }
    if (this.marketplace) {
      this.marketplace.destroy();
    }
    if (this.reputation) {
      this.reputation.destroy();
    }
    if (this.wallet) {
      this.wallet.destroy();
    }
  }
}

