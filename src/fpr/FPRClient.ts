/**
 * Fleet Payment Router (FPR) Client
 */

import { PublicKey } from '@solana/web3.js';
import { PaymentChannel, OpenChannelRequest, PaymentRequest, ChannelStatus, FPRConfig } from './types';
import { PaymentChannelManager } from './PaymentChannel';
import { FPRError, ErrorCode } from '../utils/errors';
import { getLogger } from '../utils/logger';
import EventEmitter from 'eventemitter3';

export interface FPREvents {
  connected: () => void;
  disconnected: () => void;
  channelOpened: (channel: PaymentChannel) => void;
  channelClosed: (channelId: string) => void;
  paymentReceived: (channelId: string, amount: number) => void;
  error: (error: Error) => void;
}

export class FPRClient extends EventEmitter<FPREvents> {
  private config: FPRConfig;
  private channelManager: PaymentChannelManager;
  private connected: boolean = false;
  private keepAliveInterval?: NodeJS.Timeout;
  private logger = getLogger();
  private robotId?: string;
  private robotPublicKey?: PublicKey;

  constructor(config: FPRConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      keepAliveInterval: 30000,
      ...config,
    };
    this.channelManager = new PaymentChannelManager();
    this.setupChannelManagerListeners();
  }

  private setupChannelManagerListeners(): void {
    this.channelManager.on('opened', (channel) => {
      this.emit('channelOpened', channel);
    });

    this.channelManager.on('closed', (channelId) => {
      this.emit('channelClosed', channelId);
    });

    this.channelManager.on('paymentReceived', (channelId, amount) => {
      this.emit('paymentReceived', channelId, amount);
    });

    this.channelManager.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Connect to FPR service
   */
  async connect(robotId: string, robotPublicKey: PublicKey): Promise<void> {
    this.robotId = robotId;
    this.robotPublicKey = robotPublicKey;

    try {
      await this.retryOperation(async () => {
        const response = await fetch(`${this.config.endpoint}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            robotId,
            publicKey: robotPublicKey.toBase58(),
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          throw new FPRError(
            ErrorCode.FPR_CONNECTION_FAILED,
            `FPR connection failed: ${response.statusText}`
          );
        }
      });

      this.connected = true;
      this.startKeepAlive();
      this.emit('connected');
      this.logger.info('Connected to FPR', { endpoint: this.config.endpoint });
    } catch (error) {
      this.connected = false;
      if (error instanceof FPRError) {
        throw error;
      }
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        `Failed to connect to FPR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Disconnect from FPR service
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.stopKeepAlive();

    try {
      if (this.robotId) {
        await fetch(`${this.config.endpoint}/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ robotId: this.robotId }),
          signal: AbortSignal.timeout(this.config.timeout!),
        });
      }
    } catch (error) {
      this.logger.warn('Error during disconnect', { error });
    } finally {
      this.connected = false;
      this.emit('disconnected');
      this.logger.info('Disconnected from FPR');
    }
  }

  /**
   * Open a payment channel with another robot
   */
  async openChannel(request: OpenChannelRequest): Promise<PaymentChannel> {
    if (!this.connected) {
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        'Not connected to FPR'
      );
    }

    try {
      const channel = await this.retryOperation(async () => {
        const response = await fetch(`${this.config.endpoint}/channels/open`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            robotId: this.robotId,
            peerRobotId: request.peerRobotId,
            collateral: request.collateral,
            expirationTime: request.expirationTime,
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new FPRError(
            ErrorCode.FPR_INSUFFICIENT_COLLATERAL,
            errorData.message || `Failed to open channel: ${response.statusText}`
          );
        }

        const data = await response.json();
        return {
          channelId: data.channelId,
          peerRobotId: request.peerRobotId,
          status: 'open' as const,
          balance: 0,
          collateral: request.collateral,
          createdAt: new Date(data.createdAt),
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        };
      });

      this.channelManager.addChannel(channel);
      this.logger.info('Payment channel opened', {
        channelId: channel.channelId,
        peerRobotId: request.peerRobotId,
      });

      return channel;
    } catch (error) {
      if (error instanceof FPRError) {
        throw error;
      }
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        `Failed to open channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Send micropayment through a channel
   */
  async sendPayment(request: PaymentRequest): Promise<void> {
    if (!this.connected) {
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        'Not connected to FPR'
      );
    }

    const channel = this.channelManager.getChannel(request.channelId);
    if (!channel) {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_NOT_FOUND,
        `Channel not found: ${request.channelId}`
      );
    }

    if (channel.status !== 'open' && channel.status !== 'active') {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_CLOSED,
        `Channel is not active: ${channel.status}`
      );
    }

    try {
      await this.retryOperation(async () => {
        const response = await fetch(`${this.config.endpoint}/channels/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId: request.channelId,
            robotId: this.robotId,
            amount: request.amount,
            memo: request.memo,
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new FPRError(
            ErrorCode.FPR_PAYMENT_FAILED,
            errorData.message || `Payment failed: ${response.statusText}`
          );
        }

        const data = await response.json();
        // Update channel balance
        this.channelManager.updateBalance(request.channelId, data.newBalance);
        this.channelManager.recordPaymentSent(request.channelId, request.amount);
      });

      this.logger.debug('Payment sent', {
        channelId: request.channelId,
        amount: request.amount,
      });
    } catch (error) {
      if (error instanceof FPRError) {
        throw error;
      }
      throw new FPRError(
        ErrorCode.FPR_PAYMENT_FAILED,
        `Failed to send payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close a payment channel
   */
  async closeChannel(channelId: string): Promise<void> {
    if (!this.connected) {
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        'Not connected to FPR'
      );
    }

    const channel = this.channelManager.getChannel(channelId);
    if (!channel) {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_NOT_FOUND,
        `Channel not found: ${channelId}`
      );
    }

    try {
      await this.retryOperation(async () => {
        const response = await fetch(`${this.config.endpoint}/channels/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId,
            robotId: this.robotId,
          }),
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        if (!response.ok) {
          throw new FPRError(
            ErrorCode.FPR_CONNECTION_FAILED,
            `Failed to close channel: ${response.statusText}`
          );
        }
      });

      this.channelManager.updateStatus(channelId, 'closed');
      this.logger.info('Payment channel closed', { channelId });
    } catch (error) {
      if (error instanceof FPRError) {
        throw error;
      }
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        `Failed to close channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Query channel status
   */
  async getChannelStatus(channelId: string): Promise<ChannelStatus> {
    if (!this.connected) {
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        'Not connected to FPR'
      );
    }

    // First check local cache
    const localStatus = this.channelManager.getChannelStatus(channelId);
    if (localStatus) {
      return localStatus;
    }

    try {
      const status = await this.retryOperation(async () => {
        const response = await fetch(
          `${this.config.endpoint}/channels/${channelId}/status`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(this.config.timeout!),
          }
        );

        if (!response.ok) {
          throw new FPRError(
            ErrorCode.FPR_CHANNEL_NOT_FOUND,
            `Channel not found: ${channelId}`
          );
        }

        return await response.json();
      });

      return status;
    } catch (error) {
      if (error instanceof FPRError) {
        throw error;
      }
      throw new FPRError(
        ErrorCode.FPR_CONNECTION_FAILED,
        `Failed to get channel status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get all channels
   */
  getChannels(): PaymentChannel[] {
    return this.channelManager.getAllChannels();
  }

  /**
   * Get channel manager (for advanced usage)
   */
  getChannelManager(): PaymentChannelManager {
    return this.channelManager;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number = this.config.retryAttempts!
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (i < attempts - 1) {
          const delay = this.config.retryDelay! * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.logger.debug('Retrying operation', { attempt: i + 1, delay });
        }
      }
    }

    throw lastError!;
  }

  /**
   * Start keep-alive ping
   */
  private startKeepAlive(): void {
    if (this.keepAliveInterval) {
      return;
    }

    this.keepAliveInterval = setInterval(async () => {
      if (!this.connected || !this.robotId) {
        return;
      }

      try {
        await fetch(`${this.config.endpoint}/ping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ robotId: this.robotId }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (error) {
        this.logger.warn('Keep-alive ping failed', { error });
      }
    }, this.config.keepAliveInterval);
  }

  /**
   * Stop keep-alive ping
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }
}

