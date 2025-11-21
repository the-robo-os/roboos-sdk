/**
 * RoboOS Robot SDK
 *
 * TypeScript/JavaScript SDK for integrating robots into the RoboOS ecosystem
 */

// Main SDK
export { RobotSDK } from "./RobotSDK";
export type { SDKOptions } from "./RobotSDK";

// Wallet
export { RobotWallet } from "./wallet/RobotWallet";
export type {
  WalletOptions,
  WalletInfo,
  WalletStorage,
  X402StealthAddress,
  X402Payment,
} from "./wallet/types";
export * from "./wallet/x402";

// FPR Client
export { FPRClient } from "./fpr/FPRClient";
export { PaymentChannelManager } from "./fpr/PaymentChannel";
export type {
  PaymentChannel,
  OpenChannelRequest,
  PaymentRequest,
  ChannelStatus,
  FPRConfig,
} from "./fpr/types";

// Marketplace
export { TaskMarketplace } from "./marketplace/TaskMarketplace";
export {
  getTaskTypeDefinition,
  validateTask,
  estimateTaskComplexity,
} from "./marketplace/TaskTypes";
export type {
  Task,
  TaskStatus,
  TaskType,
  Bid,
  BidRequest,
  TaskQuery,
  BiddingStrategy,
  BiddingContext,
} from "./marketplace/types";
export { TASK_TYPE_DEFINITIONS } from "./marketplace/TaskTypes";

// Verification
export { ZKVerification } from "./verification/ZKVerification";
export type {
  TaskProof,
  VerificationRequest,
  VerificationResult,
  ProofGenerationOptions,
} from "./verification/types";

// Reputation
export { ReputationClient } from "./reputation/ReputationClient";
export type {
  ReputationScore,
  ReputationUpdate,
  ReputationQuery,
} from "./reputation/types";

// Robots
export { BaseRobot } from "./robots/BaseRobot";
export type { RobotCapabilities, RobotOptions } from "./robots/BaseRobot";

export { ForkliftRobot } from "./robots/ForkliftRobot";
export type { ForkliftCapabilities } from "./robots/ForkliftRobot";

export { AMRRobot } from "./robots/AMRRobot";
export type { AMRCapabilities } from "./robots/AMRRobot";

export { CleaningRobot } from "./robots/CleaningRobot";
export type { CleaningCapabilities } from "./robots/CleaningRobot";

export { HospitalRobot } from "./robots/HospitalRobot";
export type { HospitalCapabilities } from "./robots/HospitalRobot";

export { DroneRobot } from "./robots/DroneRobot";
export type { DroneCapabilities } from "./robots/DroneRobot";

export { RoboticArm } from "./robots/RoboticArm";
export type { RoboticArmCapabilities } from "./robots/RoboticArm";

// Config
export { ConfigManager } from "./config/RoboOSConfig";
export type { RoboOSConfig, Network } from "./config/RoboOSConfig";

// Utils
export * from "./utils/errors";
export {
  getLogger,
  setLogger,
  setLogLevel,
  createLogger,
  LogLevel,
} from "./utils/logger";
export type { Logger, LogEntry } from "./utils/logger";
