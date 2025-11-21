/**
 * Custom error classes for RoboOS SDK
 */

export enum ErrorCode {
  // Wallet errors
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  WALLET_DECRYPTION_FAILED = "WALLET_DECRYPTION_FAILED",
  WALLET_ENCRYPTION_FAILED = "WALLET_ENCRYPTION_FAILED",
  INVALID_KEYPAIR = "INVALID_KEYPAIR",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",

  // FPR errors
  FPR_CONNECTION_FAILED = "FPR_CONNECTION_FAILED",
  FPR_CHANNEL_NOT_FOUND = "FPR_CHANNEL_NOT_FOUND",
  FPR_CHANNEL_CLOSED = "FPR_CHANNEL_CLOSED",
  FPR_INSUFFICIENT_COLLATERAL = "FPR_INSUFFICIENT_COLLATERAL",
  FPR_PAYMENT_FAILED = "FPR_PAYMENT_FAILED",
  FPR_TIMEOUT = "FPR_TIMEOUT",

  // Marketplace errors
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  BID_REJECTED = "BID_REJECTED",
  TASK_ALREADY_ASSIGNED = "TASK_ALREADY_ASSIGNED",
  INVALID_BID = "INVALID_BID",

  // Verification errors
  PROOF_GENERATION_FAILED = "PROOF_GENERATION_FAILED",
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  INVALID_PROOF = "INVALID_PROOF",

  // Reputation errors
  REPUTATION_QUERY_FAILED = "REPUTATION_QUERY_FAILED",
  REPUTATION_UPDATE_FAILED = "REPUTATION_UPDATE_FAILED",

  // General errors
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_CONFIG = "INVALID_CONFIG",
  OPERATION_TIMEOUT = "OPERATION_TIMEOUT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

export class RoboOSError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public cause?: Error,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RoboOSError";
    // Error.captureStackTrace is a Node.js extension
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
      metadata: this.metadata,
    };
  }
}

export class WalletError extends RoboOSError {
  constructor(
    code: ErrorCode,
    message: string,
    cause?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, cause, metadata);
    this.name = "WalletError";
  }
}

export class FPRError extends RoboOSError {
  constructor(
    code: ErrorCode,
    message: string,
    cause?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, cause, metadata);
    this.name = "FPRError";
  }
}

export class MarketplaceError extends RoboOSError {
  constructor(
    code: ErrorCode,
    message: string,
    cause?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, cause, metadata);
    this.name = "MarketplaceError";
  }
}

export class VerificationError extends RoboOSError {
  constructor(
    code: ErrorCode,
    message: string,
    cause?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, cause, metadata);
    this.name = "VerificationError";
  }
}

export class ReputationError extends RoboOSError {
  constructor(
    code: ErrorCode,
    message: string,
    cause?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, cause, metadata);
    this.name = "ReputationError";
  }
}
