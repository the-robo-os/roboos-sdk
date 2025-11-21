/**
 * Payment Channel Management
 */

import { PaymentChannel, ChannelStatus } from "./types";
import { FPRError, ErrorCode } from "../utils/errors";
import { getLogger } from "../utils/logger";
import { EventEmitter } from "eventemitter3";

export interface ChannelEvents {
  opened: (channel: PaymentChannel) => void;
  closed: (channelId: string) => void;
  paymentReceived: (channelId: string, amount: number) => void;
  paymentSent: (channelId: string, amount: number) => void;
  balanceUpdated: (channelId: string, balance: number) => void;
  error: (error: Error) => void;
}

export class PaymentChannelManager extends EventEmitter<ChannelEvents> {
  private channels: Map<string, PaymentChannel> = new Map();
  private logger = getLogger();

  /**
   * Add or update a channel
   */
  addChannel(channel: PaymentChannel): void {
    this.channels.set(channel.channelId, channel);
    this.logger.debug("Channel added", { channelId: channel.channelId });
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): PaymentChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels
   */
  getAllChannels(): PaymentChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channels by peer
   */
  getChannelsByPeer(peerRobotId: string): PaymentChannel[] {
    return Array.from(this.channels.values()).filter(
      (ch) => ch.peerRobotId === peerRobotId
    );
  }

  /**
   * Get active channels
   */
  getActiveChannels(): PaymentChannel[] {
    return Array.from(this.channels.values()).filter(
      (ch) => ch.status === "active" || ch.status === "open"
    );
  }

  /**
   * Update channel balance
   */
  updateBalance(channelId: string, newBalance: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_NOT_FOUND,
        `Channel not found: ${channelId}`
      );
    }

    const oldBalance = channel.balance;
    channel.balance = newBalance;
    channel.lastUpdate = new Date();

    this.emit("balanceUpdated", channelId, newBalance);
    this.logger.debug("Channel balance updated", {
      channelId,
      oldBalance,
      newBalance,
    });
  }

  /**
   * Update channel status
   */
  updateStatus(channelId: string, status: PaymentChannel["status"]): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_NOT_FOUND,
        `Channel not found: ${channelId}`
      );
    }

    const oldStatus = channel.status;
    channel.status = status;

    if (status === "closed") {
      this.emit("closed", channelId);
    }

    this.logger.debug("Channel status updated", {
      channelId,
      oldStatus,
      newStatus: status,
    });
  }

  /**
   * Remove channel
   */
  removeChannel(channelId: string): void {
    const exists = this.channels.has(channelId);
    if (exists) {
      this.channels.delete(channelId);
      this.logger.debug("Channel removed", { channelId });
    }
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelId: string): ChannelStatus | null {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return null;
    }

    const isActive = channel.status === "active" || channel.status === "open";
    const canSend = isActive && channel.balance > 0;
    const canReceive = isActive && channel.balance < channel.collateral;

    return {
      channelId: channel.channelId,
      status: channel.status,
      balance: channel.balance,
      collateral: channel.collateral,
      peerRobotId: channel.peerRobotId,
      canSend,
      canReceive,
    };
  }

  /**
   * Check if channel can send payment
   */
  canSendPayment(channelId: string, amount: number): boolean {
    const status = this.getChannelStatus(channelId);
    if (!status) {
      return false;
    }
    return status.canSend && status.balance >= amount;
  }

  /**
   * Check if channel can receive payment
   */
  canReceivePayment(channelId: string, amount: number): boolean {
    const status = this.getChannelStatus(channelId);
    if (!status) {
      return false;
    }
    return status.canReceive && status.balance + amount <= status.collateral;
  }

  /**
   * Record payment sent
   */
  recordPaymentSent(channelId: string, amount: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_NOT_FOUND,
        `Channel not found: ${channelId}`
      );
    }

    if (!this.canSendPayment(channelId, amount)) {
      throw new FPRError(
        ErrorCode.FPR_INSUFFICIENT_COLLATERAL,
        `Cannot send ${amount} ROS: insufficient balance or channel not active`
      );
    }

    channel.balance -= amount;
    channel.lastUpdate = new Date();

    this.emit("paymentSent", channelId, amount);
    this.emit("balanceUpdated", channelId, channel.balance);
  }

  /**
   * Record payment received
   */
  recordPaymentReceived(channelId: string, amount: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new FPRError(
        ErrorCode.FPR_CHANNEL_NOT_FOUND,
        `Channel not found: ${channelId}`
      );
    }

    if (!this.canReceivePayment(channelId, amount)) {
      throw new FPRError(
        ErrorCode.FPR_INSUFFICIENT_COLLATERAL,
        `Cannot receive ${amount} ROS: would exceed collateral or channel not active`
      );
    }

    channel.balance += amount;
    channel.lastUpdate = new Date();

    this.emit("paymentReceived", channelId, amount);
    this.emit("balanceUpdated", channelId, channel.balance);
  }

  /**
   * Check for expired channels
   */
  getExpiredChannels(): PaymentChannel[] {
    const now = new Date();
    return Array.from(this.channels.values()).filter(
      (ch) => ch.expiresAt && ch.expiresAt < now && ch.status !== "closed"
    );
  }

  /**
   * Cleanup closed channels
   */
  cleanupClosedChannels(): void {
    const closedChannels = Array.from(this.channels.values()).filter(
      (ch) => ch.status === "closed"
    );

    for (const channel of closedChannels) {
      this.removeChannel(channel.channelId);
    }

    if (closedChannels.length > 0) {
      this.logger.debug("Cleaned up closed channels", {
        count: closedChannels.length,
      });
    }
  }
}
