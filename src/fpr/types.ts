/**
 * FPR (Fleet Payment Router) types
 */

export interface PaymentChannel {
  channelId: string;
  peerRobotId: string;
  status: "open" | "active" | "closing" | "closed";
  balance: number; // ROS tokens
  collateral: number; // ROS tokens
  createdAt: Date;
  expiresAt?: Date;
  lastUpdate?: Date;
}

export interface OpenChannelRequest {
  peerRobotId: string;
  collateral: number; // ROS tokens
  expirationTime?: number; // milliseconds
}

export interface PaymentRequest {
  channelId: string;
  amount: number; // ROS tokens
  memo?: string;
}

export interface ChannelStatus {
  channelId: string;
  status: PaymentChannel["status"];
  balance: number;
  collateral: number;
  peerRobotId: string;
  canSend: boolean;
  canReceive: boolean;
}

export interface FPRConfig {
  endpoint: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  keepAliveInterval?: number;
}
