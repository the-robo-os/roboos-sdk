/**
 * Marketplace types
 */

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type TaskType = 
  | 'material_handling'
  | 'navigation'
  | 'delivery'
  | 'cleaning'
  | 'medical_transport'
  | 'sterilization'
  | 'surveillance'
  | 'assembly'
  | 'manipulation'
  | 'custom';

export interface Task {
  taskId: string;
  type: TaskType;
  title: string;
  description: string;
  status: TaskStatus;
  reward: number; // ROS tokens
  estimatedDuration: number; // seconds
  deadline?: Date;
  requirements: string[];
  location?: {
    x: number;
    y: number;
    z?: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  assignedTo?: string; // robotId
  completedAt?: Date;
}

export interface Bid {
  taskId: string;
  robotId: string;
  bidAmount: number; // ROS tokens
  estimatedDuration: number; // seconds
  encrypted?: boolean;
  submittedAt: Date;
}

export interface BidRequest {
  taskId: string;
  bidAmount: number;
  estimatedDuration: number;
  encrypted?: boolean;
}

export interface TaskQuery {
  type?: TaskType;
  status?: TaskStatus;
  minReward?: number;
  maxReward?: number;
  location?: {
    x: number;
    y: number;
    radius: number;
  };
  limit?: number;
  offset?: number;
}

export interface BiddingStrategy {
  name: string;
  calculateBid: (task: Task, context: BiddingContext) => number;
}

export interface BiddingContext {
  robotReputation: number;
  currentWorkload: number;
  distanceToTask?: number;
  availableChannels: number;
  balance: number;
}

